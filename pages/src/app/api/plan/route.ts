import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { currentAccount } from "@/lib/accounts";
import { stripeConfigured, createCardSetupSession, confirmCardSetup } from "@/lib/stripe";

// Membership tiers for a workspace account. Prices mirror the platform's
// billing model (shared/schema.ts): paid plans are metered through Lago
// against the Stripe card collected here.
export const PLANS = {
  "free":        { label: "Free",       price: "$0",   period: "",      blurb: "Personal projects, community repos." },
  "pro-monthly": { label: "Pro",        price: "$5",   period: "/mo",   blurb: "Unlimited private repos, priority builds." },
  "pro-yearly":  { label: "Pro",        price: "$50",  period: "/yr",   blurb: "Everything in Pro, two months free." },
  "business":    { label: "Business",   price: "$25",  period: "/mo",   blurb: "Flat per account: groups, priority generation, larger reservations." },
} as const;

type PlanId = keyof typeof PLANS;

// GET /api/plan - the active account's membership + the catalog
export async function GET() {
  const ctx = await currentAccount();
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.json({
    plan: ctx.account.plan ?? "free",
    stripe: stripeConfigured(),
    cardOnFile: Boolean(ctx.account.stripeCustomerId),
    plans: Object.entries(PLANS).map(([id, p]) => ({ id, ...p })),
  });
}

// POST /api/plan - two actions, both cookie-session only (a scoped
// pufftoken must never touch billing):
//   { action: "checkout", plan }   -> Stripe hosted card-setup URL
//   { action: "confirm", plan, sessionId } -> verify return, apply plan
//   { action: "select", plan: "free" } -> downgrade back to free
export async function POST(req: NextRequest) {
  const ctx = await currentAccount();
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const plan = body.plan as PlanId;
  if (!PLANS[plan]) return NextResponse.json({ error: "unknown plan" }, { status: 400 });

  if (body.action === "checkout") {
    if (plan === "free") return NextResponse.json({ error: "free needs no checkout" }, { status: 400 });
    if (!stripeConfigured()) {
      return NextResponse.json({ error: "Checkout is not configured yet" }, { status: 503 });
    }
    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    try {
      const url = await createCardSetupSession(
        ctx.account.id, plan, ctx.user.email ?? "", origin,
      );
      return NextResponse.json({ checkoutUrl: url });
    } catch (e) {
      return NextResponse.json({ error: `Checkout failed: ${(e as Error).message}` }, { status: 502 });
    }
  }

  if (body.action === "confirm") {
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const customerId = await confirmCardSetup(ctx.account.id, plan, sessionId);
    if (!customerId) return NextResponse.json({ error: "card setup not completed" }, { status: 400 });
    await db.update(accounts)
      .set({ plan, stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(accounts.id, ctx.account.id));
    return NextResponse.json({ ok: true, plan });
  }

  if (body.action === "select" && plan === "free") {
    await db.update(accounts)
      .set({ plan: "free", updatedAt: new Date() })
      .where(eq(accounts.id, ctx.account.id));
    return NextResponse.json({ ok: true, plan: "free" });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
