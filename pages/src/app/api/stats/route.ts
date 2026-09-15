import { db } from "@/db";
import { repositories, issues, pipelines, deployments } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [repoCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(repositories);

    const [openIssues] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(issues)
      .where(eq(issues.status, "open"));

    const [totalStars] = await db
      .select({ sum: sql<number>`coalesce(sum(${repositories.stars}), 0)::int` })
      .from(repositories);

    const [activePipelines] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pipelines)
      .where(eq(pipelines.status, "running"));

    const [totalPipelines] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pipelines);

    const [successPipelines] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pipelines)
      .where(eq(pipelines.status, "success"));

    const [activeDeployments] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(deployments)
      .where(eq(deployments.status, "active"));

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
