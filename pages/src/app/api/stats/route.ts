import { db } from "@/db";
import { repositories, issues, pipelines, deployments } from "@/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requestAccount } from "@/lib/accounts";
import { hasScope } from "@/lib/pat";

// Stats for the ACTIVE account only - joins through repositories so demo
// rows (account_id null) and other accounts' data never leak in.
export async function GET(request: NextRequest) {
  const ctx = await requestAccount(request);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:read")) return NextResponse.json({ error: "pufftoken lacks the repos:read scope" }, { status: 403 });
  const acct = ctx.account.id;

  try {
    const [repoCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(repositories)
      .where(eq(repositories.accountId, acct));

    const [openIssues] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(issues)
      .leftJoin(repositories, eq(issues.repoId, repositories.id))
      .where(and(eq(issues.status, "open"), eq(repositories.accountId, acct)));

    const [totalStars] = await db
      .select({ sum: sql<number>`coalesce(sum(${repositories.stars}), 0)::int` })
      .from(repositories)
      .where(eq(repositories.accountId, acct));

    const [activePipelines] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pipelines)
      .leftJoin(repositories, eq(pipelines.repoId, repositories.id))
      .where(and(eq(pipelines.status, "running"), eq(repositories.accountId, acct)));

    const [totalPipelines] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pipelines)
      .leftJoin(repositories, eq(pipelines.repoId, repositories.id))
      .where(eq(repositories.accountId, acct));

    const [successPipelines] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pipelines)
      .leftJoin(repositories, eq(pipelines.repoId, repositories.id))
      .where(and(eq(pipelines.status, "success"), eq(repositories.accountId, acct)));

    const [activeDeployments] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(deployments)
      .leftJoin(repositories, eq(deployments.repoId, repositories.id))
      .where(and(eq(deployments.status, "active"), eq(repositories.accountId, acct)));

    return NextResponse.json({
      repos: repoCount.count,
      openIssues: openIssues.count,
      totalStars: totalStars.sum,
      activePipelines: activePipelines.count,
      totalPipelines: totalPipelines.count,
      successPipelines: successPipelines.count,
      activeDeployments: activeDeployments.count,
      successRate: totalPipelines.count > 0
        ? Math.round((successPipelines.count / totalPipelines.count) * 100)
        : 0,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
