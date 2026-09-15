import { db } from "@/db";
import { issues, repositories } from "@/db/schema";
import { desc, eq, like, or, and, sql, SQL } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requestAccount } from "@/lib/accounts";
import { hasScope } from "@/lib/pat";

export async function GET(request: NextRequest) {
  const ctx = await requestAccount(request);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "issues:read")) return NextResponse.json({ error: "pufftoken lacks the issues:read scope" }, { status: 403 });
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  try {
    const conditions: (SQL | undefined)[] = [eq(repositories.accountId, ctx.account.id)];
    if (search) {
      conditions.push(or(like(issues.title, `%${search}%`), like(issues.body, `%${search}%`)));
    }
    if (status && status !== "all") {
      conditions.push(eq(issues.status, status));
    }

    const query = db
      .select({
        id: issues.id,
        repoId: issues.repoId,
        title: issues.title,
        body: issues.body,
        status: issues.status,
        priority: issues.priority,
        assignee: issues.assignee,
        labels: issues.labels,
        createdAt: issues.createdAt,
        updatedAt: issues.updatedAt,
        repoName: repositories.name,
      })
      .from(issues)
      .leftJoin(repositories, eq(issues.repoId, repositories.id))
      .orderBy(desc(issues.createdAt));

    const results = await query.where(and(...conditions));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching issues:", error);
    return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requestAccount(request);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "issues:write")) return NextResponse.json({ error: "pufftoken lacks the issues:write scope" }, { status: 403 });
  try {
    const body = await request.json();
    // repo ids are int8 snowflakes - keep them as strings, compare as text
    const repoIdStr = String(body.repoId ?? "");
    const title = String(body.title ?? "").trim();
    if (!repoIdStr || !title) {
      return NextResponse.json({ error: "repoId and title required" }, { status: 400 });
    }
    const [repo] = await db
      .select({ id: repositories.id })
      .from(repositories)
      .where(and(sql`${repositories.id}::text = ${repoIdStr}`, eq(repositories.accountId, ctx.account.id)));
    if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
    const result = await db.insert(issues).values({
      repoId: repoIdStr as unknown as number, // int8: numeric string, crdb coerces
      title,
      body: body.body || null,
      status: "open",
      priority: body.priority || "medium",
      labels: body.labels || [],
    }).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating issue:", error);
    return NextResponse.json({ error: "Failed to create issue" }, { status: 500 });
  }
}
