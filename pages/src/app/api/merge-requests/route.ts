import { eq } from "drizzle-orm";
import { db } from "@/db";
import { repositories } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { requestAccount } from "@/lib/accounts";
import { hasScope } from "@/lib/pat";
import { listPulls, createPull } from "@/lib/repostore";

// GET /api/merge-requests - open merge requests across all of the active
// account's repos, straight from the internal store.
export async function GET(req: NextRequest) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:read")) return NextResponse.json({ error: "pufftoken lacks the repos:read scope" }, { status: 403 });

  const repos = await db
    .select({ name: repositories.name })
    .from(repositories)
    .where(eq(repositories.accountId, ctx.account.id));

  const settled = await Promise.allSettled(
    repos.map(async (r) =>
      (await listPulls(ctx.account.id, r.name)).map((p) => ({ ...p, repo: r.name, user: ctx.account.name })),
    ),
  );
  const mrs = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
  return NextResponse.json(mrs);
}

// POST /api/merge-requests { repo, head, base, title, body? } - open a real
// merge request on one of the account's repos.
export async function POST(req: NextRequest) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:write")) return NextResponse.json({ error: "pufftoken lacks the repos:write scope" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const repoName = String(body.repo ?? "");
  const head = String(body.head ?? "").trim();
  const base = String(body.base ?? "").trim() || "main";
  const title = String(body.title ?? "").trim();
  if (!repoName || !head || !title) {
    return NextResponse.json({ error: "repo, head branch, and title required" }, { status: 400 });
  }
  // cheap ownership check: repo must belong to this account
  const owns = await db
    .select({ name: repositories.name })
    .from(repositories)
    .where(eq(repositories.accountId, ctx.account.id));
  if (!owns.some((r) => r.name === repoName)) {
    return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  }
  try {
    const mr = await createPull(ctx.account.id, repoName, {
      head, base, title, body: typeof body.body === "string" ? body.body : undefined,
    });
    return NextResponse.json({ ...mr, repo: repoName, user: ctx.account.name }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
