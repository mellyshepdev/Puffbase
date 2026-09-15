import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import {
  sessionUser,
  getOrCreateAccounts,
  activeAccount,
  SHEEP_AVATARS,
} from "@/lib/accounts";

// GET /api/accounts - the user's accounts + which one is active
export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const list = await getOrCreateAccounts(user.sub, user.name ?? user.email ?? "Personal");
  return NextResponse.json({
    accounts: list,
    active: activeAccount(list, user),
  });
}

// POST /api/accounts { kind, name } - create a business account
export async function POST(req: NextRequest) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "business" ? "business" : "personal";
  const name = typeof body.name === "string" && body.name.trim()
    ? body.name.trim().slice(0, 120)
    : kind === "business" ? "Business" : "Personal";

  if (kind === "personal") {
    // exactly one personal account per user
    const existing = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userSub, user.sub), eq(accounts.kind, "personal")));
    if (existing.length > 0) {
      return NextResponse.json({ error: "Personal account already exists" }, { status: 409 });
    }
  }

  const [created] = await db
    .insert(accounts)
    .values({ userSub: user.sub, kind, name })
    .returning();
  return NextResponse.json(created, { status: 201 });
}

// PATCH /api/accounts { id, name?, avatar?, businessUrl? } - update own account
export async function PATCH(req: NextRequest) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "valid id required" }, { status: 400 });
  }

  const patch: Partial<typeof accounts.$inferInsert> = { updatedAt: new Date() };
  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim().slice(0, 120);
  }
  if (typeof body.avatar === "string" && SHEEP_AVATARS.includes(body.avatar)) {
    patch.avatar = body.avatar;
  }
  if (typeof body.businessUrl === "string") {
    patch.businessUrl = body.businessUrl.trim().slice(0, 500) || null;
  }

  const [updated] = await db
    .update(accounts)
    .set(patch)
    .where(and(eq(accounts.id, id), eq(accounts.userSub, user.sub)))
    .returning();
  if (!updated) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  return NextResponse.json(updated);
}
