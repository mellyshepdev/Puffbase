import { db } from "@/db";
import { deployments, repositories } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const environment = searchParams.get("environment") || "";

  try {
    const conditions = [];
    if (environment && environment !== "all") {
      conditions.push(eq(deployments.environment, environment));
    }

    const query = db
      .select({
        id: deployments.id,
        repoId: deployments.repoId,
        environment: deployments.environment,
        status: deployments.status,
        url: deployments.url,
        domain: deployments.domain,
        branch: deployments.branch,
        commitSha: deployments.commitSha,
        createdAt: deployments.createdAt,
        updatedAt: deployments.updatedAt,
        repoName: repositories.name,
      })
      .from(deployments)
      .leftJoin(repositories, eq(deployments.repoId, repositories.id))
      .orderBy(desc(deployments.createdAt));

    const results = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching deployments:", error);
    return NextResponse.json({ error: "Failed to fetch deployments" }, { status: 500 });
  }
}
