import { db } from "@/db";
import { pipelines, repositories } from "@/db/schema";
import { desc, eq, like, or, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") || "";

  try {
    const conditions = [];
    if (status && status !== "all") {
      conditions.push(eq(pipelines.status, status));
    }

    const query = db
      .select({
        id: pipelines.id,
        repoId: pipelines.repoId,
        branch: pipelines.branch,
        status: pipelines.status,
        stage: pipelines.stage,
        commitSha: pipelines.commitSha,
        commitMessage: pipelines.commitMessage,
        duration: pipelines.duration,
        startedAt: pipelines.startedAt,
        finishedAt: pipelines.finishedAt,
        createdAt: pipelines.createdAt,
        repoName: repositories.name,
      })
      .from(pipelines)
      .leftJoin(repositories, eq(pipelines.repoId, repositories.id))
      .orderBy(desc(pipelines.createdAt));

    const results = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching pipelines:", error);
    return NextResponse.json({ error: "Failed to fetch pipelines" }, { status: 500 });
  }
}
