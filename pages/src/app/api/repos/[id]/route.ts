import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { repositories } from "@/db/schema";
import { requestAccount } from "@/lib/accounts";
import { hasScope } from "@/lib/pat";
import { deleteRepo } from "@/lib/repostore";

// GET /api/repos/[id] - one repo row (int8 id compared as text)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requestAccount(_req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:read")) return NextResponse.json({ error: "pufftoken lacks the repos:read scope" }, { status: 403 });
  const id = (await params).id;
  const [row] = await db
    .select()
    .from(repositories)
    .where(sql`${repositories.id}::text = ${id}`);
  if (!row || row.accountId !== ctx.account.id) {
    return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}

// DELETE /api/repos/[id] - remove the backing repo + row, owner only.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requestAccount(_req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:write")) return NextResponse.json({ error: "pufftoken lacks the repos:write scope" }, { status: 403 });
  const id = (await params).id;
  const [row] = await db
    .select()
    .from(repositories)
    .where(sql`${repositories.id}::text = ${id}`);
  if (!row || row.accountId !== ctx.account.id) {
    return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  }
  try {
    await deleteRepo(ctx.account.id, row.name);
  } catch (e) {
    // keep going - a missing backing repo shouldn't block removing the row
    console.warn("backing repo delete failed:", e);
  }
  await db.delete(repositories).where(sql`${repositories.id}::text = ${id}`);
  return NextResponse.json({ ok: true });
}
