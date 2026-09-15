import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { requestAccount } from "@/lib/accounts";
import { hasScope } from "@/lib/pat";

// GET /api/groups - the active account's groups
export async function GET(req: NextRequest) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "groups:read")) return NextResponse.json({ error: "pufftoken lacks the groups:read scope" }, { status: 403 });
  const rows = await db
    .select()
    .from(groups)
    .where(eq(groups.accountId, ctx.account.id))
    .orderBy(desc(groups.createdAt));
  return NextResponse.json({ groups: rows });
}

// POST /api/groups { name, description? }
export async function POST(req: NextRequest) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "groups:write")) return NextResponse.json({ error: "pufftoken lacks the groups:write scope" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const [created] = await db
    .insert(groups)
    .values({
      accountId: ctx.account.id,
      name,
      description: typeof body.description === "string" ? body.description.slice(0, 500) : null,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
