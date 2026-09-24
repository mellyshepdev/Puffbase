import { NextRequest, NextResponse } from "next/server";
import { sql, eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { repositories, repoCollaborators, accounts } from "@/db/schema";
import { requestAccount } from "@/lib/accounts";
import { hasScope } from "@/lib/pat";

type Params = { params: Promise<{ id: string }> };

async function ownedRepo(id: string, accountId: string) {
  const [row] = await db
    .select()
    .from(repositories)
    .where(sql`${repositories.id}::text = ${id}`);
  return row && row.accountId === accountId ? row : null;
}

// GET /api/repos/[id]/collaborators - partner accounts on this repo
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:read")) return NextResponse.json({ error: "pufftoken lacks the repos:read scope" }, { status: 403 });
  const repo = await ownedRepo((await params).id, ctx.account.id);
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  const rows = await db
    .select({
      id: repoCollaborators.id,
      role: repoCollaborators.role,
      createdAt: repoCollaborators.createdAt,
      accountId: accounts.id,
      name: accounts.name,
      avatar: accounts.avatar,
      kind: accounts.kind,
    })
    .from(repoCollaborators)
    .innerJoin(accounts, eq(repoCollaborators.accountId, accounts.id))
    .where(eq(repoCollaborators.repoId, repo.id))
    .orderBy(desc(repoCollaborators.createdAt));
  return NextResponse.json({ collaborators: rows });
}

// POST /api/repos/[id]/collaborators { account, role? } - add a business
// partner by account name (case-insensitive exact match).
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:write")) return NextResponse.json({ error: "pufftoken lacks the repos:write scope" }, { status: 403 });
  const repo = await ownedRepo((await params).id, ctx.account.id);
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.account === "string" ? body.account.trim() : "";
  const role = ["read", "write", "admin"].includes(body.role) ? body.role : "write";
  if (!name) return NextResponse.json({ error: "account name required" }, { status: 400 });
  const [partner] = await db
    .select()
    .from(accounts)
    .where(sql`lower(${accounts.name}) = lower(${name})`)
    .limit(1);
  if (!partner) return NextResponse.json({ error: `No account named "${name}"` }, { status: 404 });
  if (partner.id === ctx.account.id) {
    return NextResponse.json({ error: "That's your own account - you already own this repo" }, { status: 400 });
  }
  const [created] = await db
    .insert(repoCollaborators)
    .values({ repoId: repo.id, accountId: partner.id, role })
    .onConflictDoUpdate({
      target: [repoCollaborators.repoId, repoCollaborators.accountId],
      set: { role },
    })
    .returning();
  return NextResponse.json({ ...created, name: partner.name, avatar: partner.avatar }, { status: 201 });
}

// DELETE /api/repos/[id]/collaborators?id=<uuid> - remove a partner
export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:write")) return NextResponse.json({ error: "pufftoken lacks the repos:write scope" }, { status: 403 });
  const repo = await ownedRepo((await params).id, ctx.account.id);
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  const cid = req.nextUrl.searchParams.get("id") ?? "";
  const gone = await db
    .delete(repoCollaborators)
    .where(and(eq(repoCollaborators.id, cid), eq(repoCollaborators.repoId, repo.id)))
    .returning();
  if (!gone.length) return NextResponse.json({ error: "Collaborator not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
