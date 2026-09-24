import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { repositories } from "@/db/schema";
import { requestAccount } from "@/lib/accounts";
import { hasScope } from "@/lib/pat";
import { repoRead, repoWrite } from "@/lib/repostore";
import { fireWebhooks } from "@/lib/webhooks";

async function repoFor(id: string, accountId: string) {
  const [row] = await db
    .select()
    .from(repositories)
    .where(sql`${repositories.id}::text = ${id}`);
  if (!row || row.accountId !== accountId) return null;
  return row;
}

// GET /api/repos/[id]/file?path=x - read one file
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:read")) return NextResponse.json({ error: "pufftoken lacks the repos:read scope" }, { status: 403 });
  const row = await repoFor((await params).id, ctx.account.id);
  if (!row) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  const path = req.nextUrl.searchParams.get("path") ?? "";
  try {
    return NextResponse.json(await repoRead(ctx.account.id, row.name, path));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}

// PUT /api/repos/[id]/file { path, content, sha?, message? } - commit a write
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:write")) return NextResponse.json({ error: "pufftoken lacks the repos:write scope" }, { status: 403 });
  const row = await repoFor((await params).id, ctx.account.id);
  if (!row) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  const { path, content, sha, message } = await req.json().catch(() => ({}));
  if (typeof path !== "string" || typeof content !== "string") {
    return NextResponse.json({ error: "path and content required" }, { status: 400 });
  }
  try {
    await repoWrite(ctx.account.id, row.name, path, { content, sha, message });
    // Repo webhooks - fire-and-forget, delivery must not slow the write.
    fireWebhooks(row.id, "push", {
      repo: { id: row.id, name: row.name },
      path,
      message: message ?? null,
      author: ctx.user.name ?? ctx.user.email ?? null,
      account: ctx.account.name,
    }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
