import { db } from "@/db";
import { issues, repositories } from "@/db/schema";
import { desc, eq, like, or, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  try {
    const conditions = [];
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

    const results = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching issues:", error);
    return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await db.insert(issues).values(body).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating issue:", error);
    return NextResponse.json({ error: "Failed to create issue" }, { status: 500 });
  }
}
