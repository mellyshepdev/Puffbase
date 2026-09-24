import { NextRequest, NextResponse } from "next/server";
import { sql, eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { repositories, repoWebhooks } from "@/db/schema";
import { requestAccount } from "@/lib/accounts";
import { hasScope } from "@/lib/pat";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";

type Params = { params: Promise<{ id: string }> };

async function ownedRepo(id: string, accountId: string) {
  const [row] = await db
    .select()
    .from(repositories)
    .where(sql`${repositories.id}::text = ${id}`);
  return row && row.accountId === accountId ? row : null;
}

// GET /api/repos/[id]/webhooks
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:read")) return NextResponse.json({ error: "pufftoken lacks the repos:read scope" }, { status: 403 });
  const repo = await ownedRepo((await params).id, ctx.account.id);
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  const rows = await db
    .select()
    .from(repoWebhooks)
    .where(eq(repoWebhooks.repoId, repo.id))
    .orderBy(desc(repoWebhooks.createdAt));
  // secrets never leave the server - presence flag only
  return NextResponse.json({
    webhooks: rows.map(({ secret, ...w }) => ({ ...w, hasSecret: !!secret })),
  });
}

// POST /api/repos/[id]/webhooks { url, events?, secret?, enabled? }
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:write")) return NextResponse.json({ error: "pufftoken lacks the repos:write scope" }, { status: 403 });
  const repo = await ownedRepo((await params).id, ctx.account.id);
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: "url must start with http:// or https://" }, { status: 400 });
  }
  const events = Array.isArray(body.events)
    ? body.events.filter((e: unknown) => (WEBHOOK_EVENTS as readonly string[]).includes(e as string))
    : [];
  const [created] = await db
    .insert(repoWebhooks)
    .values({
      repoId: repo.id,
      url: url.slice(0, 500),
      events,
      secret: typeof body.secret === "string" && body.secret ? body.secret.slice(0, 255) : null,
      enabled: body.enabled !== false,
    })
    .returning();
  const { secret, ...pub } = created;
  return NextResponse.json({ ...pub, hasSecret: !!secret }, { status: 201 });
}

// DELETE /api/repos/[id]/webhooks?id=<uuid>
export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:write")) return NextResponse.json({ error: "pufftoken lacks the repos:write scope" }, { status: 403 });
  const repo = await ownedRepo((await params).id, ctx.account.id);
  if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  const wid = req.nextUrl.searchParams.get("id") ?? "";
  const gone = await db
    .delete(repoWebhooks)
    .where(and(eq(repoWebhooks.id, wid), eq(repoWebhooks.repoId, repo.id)))
    .returning();
  if (!gone.length) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
