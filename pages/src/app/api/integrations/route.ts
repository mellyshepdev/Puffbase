import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { currentAccount } from "@/lib/accounts";
import { encryptToken, decryptToken } from "@/lib/secrets";
import { verifyProvider, PROVIDERS, type Provider } from "@/lib/providers";

// GET /api/integrations - the active account's connections (tokens stripped)
export async function GET() {
  const ctx = await currentAccount();
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const rows = await db
    .select()
    .from(integrations)
    .where(eq(integrations.accountId, ctx.account.id));
  return NextResponse.json({
    integrations: rows.map((r) => ({
      id: r.id,
      provider: r.provider,
      externalName: r.externalName,
      meta: r.meta,
      createdAt: r.createdAt,
    })),
  });
}

// POST /api/integrations { provider, token } - verify with the provider, then
// store encrypted. One connection per provider per account (re-upsert).
export async function POST(req: NextRequest) {
  const ctx = await currentAccount();
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const provider = body.provider as Provider;
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!PROVIDERS.includes(provider) || !token) {
    return NextResponse.json({ error: "provider and token required" }, { status: 400 });
  }

  let identity;
  try {
    identity = await verifyProvider(provider, token);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }

  const tokenEnc = encryptToken(token);
  const [existing] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.accountId, ctx.account.id), eq(integrations.provider, provider)));

  const [row] = existing
    ? await db
        .update(integrations)
        .set({ tokenEnc, externalName: identity.name, meta: identity.meta, updatedAt: new Date() })
        .where(eq(integrations.id, existing.id))
        .returning()
    : await db
        .insert(integrations)
        .values({
          accountId: ctx.account.id,
          provider,
          tokenEnc,
          externalName: identity.name,
          meta: identity.meta,
        })
        .returning();

  return NextResponse.json({
    id: row.id,
    provider: row.provider,
    externalName: row.externalName,
    meta: row.meta,
  });
}

// DELETE /api/integrations?id=… - disconnect (id must belong to active account)
export async function DELETE(req: NextRequest) {
  const ctx = await currentAccount();
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id") ?? "";
  await db
    .delete(integrations)
    .where(and(eq(integrations.id, id), eq(integrations.accountId, ctx.account.id)));
  return NextResponse.json({ ok: true });
}

/** Internal helper for sibling routes: decrypt the stored provider token. */
export async function providerToken(
  accountId: string,
  provider: Provider,
): Promise<string | null> {
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.accountId, accountId), eq(integrations.provider, provider)));
  if (!row) return null;
  try {
    return decryptToken(row.tokenEnc);
  } catch {
    return null;
  }
}
