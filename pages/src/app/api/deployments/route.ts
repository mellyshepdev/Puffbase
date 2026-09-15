import { db } from "@/db";
import { deployments, repositories } from "@/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { currentAccount } from "@/lib/accounts";

export async function GET(request: NextRequest) {
  const ctx = await currentAccount();
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const searchParams = request.nextUrl.searchParams;
  const environment = searchParams.get("environment") || "";

  try {
    const conditions = [eq(repositories.accountId, ctx.account.id)];
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
      : await query.where(conditions[0]);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching deployments:", error);
    return NextResponse.json({ error: "Failed to fetch deployments" }, { status: 500 });
  }
}

// POST /api/deployments - record a deployment for one of the account's repos.
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
      .insert(deployments)
      .values({
        repoId: repoIdStr as unknown as number, // int8: driver sends it as a numeric string, crdb coerces
        environment: body.environment || "production",
        status: "pending",
        branch: body.branch || "main",
      })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("Error creating deployment:", error);
    return NextResponse.json({ error: "Failed to create deployment" }, { status: 500 });
  }
}
