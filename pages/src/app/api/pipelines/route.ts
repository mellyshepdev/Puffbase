import { db } from "@/db";
import { pipelines, repositories } from "@/db/schema";
import { desc, eq, like, or, and, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { currentAccount } from "@/lib/accounts";

export async function GET(request: NextRequest) {
  const ctx = await currentAccount();
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") || "";

  try {
    const conditions = [eq(repositories.accountId, ctx.account.id)];
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
      : await query.where(conditions[0]);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching pipelines:", error);
    return NextResponse.json({ error: "Failed to fetch pipelines" }, { status: 500 });
  }
}

// POST /api/pipelines - record a pipeline run for one of the account's repos.
export async function POST(request: NextRequest) {
  const ctx = await currentAccount();
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const body = await request.json();
    // repo ids are int8 snowflakes - keep them as strings, compare as text
    const repoIdStr = String(body.repoId ?? "");
    if (!repoIdStr) {
      return NextResponse.json({ error: "repoId required" }, { status: 400 });
    }
    const [repo] = await db
      .select({ id: repositories.id })
      .from(repositories)
      .where(and(sql`${repositories.id}::text = ${repoIdStr}`, eq(repositories.accountId, ctx.account.id)));
    if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
    const [row] = await db
      .insert(pipelines)
      .values({
        repoId: repoIdStr as unknown as number, // int8: driver sends it as a numeric string, crdb coerces
        branch: body.branch || "main",
        status: "pending",
        stage: "build",
        commitMessage: body.commitMessage || "Manual run",
      })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("Error creating pipeline:", error);
    return NextResponse.json({ error: "Failed to create pipeline" }, { status: 500 });
  }
}
