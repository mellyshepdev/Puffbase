import { eq } from "drizzle-orm";
import { db } from "@/db";
import { repositories } from "@/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { requestAccount } from "@/lib/accounts";
import { hasScope } from "@/lib/pat";
import { listPulls } from "@/lib/repostore";

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
      (await listPulls(ctx.account.id, r.name)).map((p) => ({ ...p, repo: r.name })),
    ),
  );
  const mrs = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
  return NextResponse.json(mrs);
}
