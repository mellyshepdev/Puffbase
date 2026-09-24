import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { sql, eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { repositories, repoDeployKeys } from "@/db/schema";
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

// SHA256 fingerprint of the key blob, matching `ssh-keygen -lf` output.
function fingerprintOf(publicKey: string): string | null {
  const parts = publicKey.trim().split(/\s+/);
  if (parts.length < 2 || !/^ssh-|ecdsa-|sk-/.test(parts[0])) return null;
  const blob = Buffer.from(parts[1], "base64");
  if (!blob.length) return null;
  return "SHA256:" + createHash("sha256").update(blob).digest("base64").replace(/=+$/, "");
}

// GET /api/repos/[id]/deploy-keys
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:read")) return NextResponse.json({ error: "pufftoken lacks the repos:read scope" }, { status: 403 });
  const repo = await ownedRepo((await params).id, ctx.account.id);
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  const rows = await db
    .select()
    .from(repoDeployKeys)
    .where(eq(repoDeployKeys.repoId, repo.id))
    .orderBy(desc(repoDeployKeys.createdAt));
  return NextResponse.json({ deployKeys: rows });
}

// POST /api/repos/[id]/deploy-keys { name, publicKey, canPush? }
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:write")) return NextResponse.json({ error: "pufftoken lacks the repos:write scope" }, { status: 403 });
  const repo = await ownedRepo((await params).id, ctx.account.id);
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const publicKey = typeof body.publicKey === "string" ? body.publicKey.trim() : "";
  if (!name || !publicKey) return NextResponse.json({ error: "name and publicKey required" }, { status: 400 });
  const fingerprint = fingerprintOf(publicKey);
  if (!fingerprint) return NextResponse.json({ error: "that doesn't look like an SSH public key" }, { status: 400 });
  const [created] = await db
    .insert(repoDeployKeys)
    .values({ repoId: repo.id, name, publicKey, fingerprint, canPush: body.canPush === true })
    .returning();
  return NextResponse.json(created, { status: 201 });
}

// DELETE /api/repos/[id]/deploy-keys?id=<uuid>
export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:write")) return NextResponse.json({ error: "pufftoken lacks the repos:write scope" }, { status: 403 });
  const repo = await ownedRepo((await params).id, ctx.account.id);
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  const kid = req.nextUrl.searchParams.get("id") ?? "";
  const gone = await db
    .delete(repoDeployKeys)
    .where(and(eq(repoDeployKeys.id, kid), eq(repoDeployKeys.repoId, repo.id)))
    .returning();
  if (!gone.length) return NextResponse.json({ error: "Key not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
