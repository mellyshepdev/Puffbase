import { db } from "@/db";
import { repositories } from "@/db/schema";
import { desc, like, or, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";

  try {
    let results;
    if (search) {
      results = await db
        .select()
        .from(repositories)
        .where(
          or(
            like(repositories.name, `%${search}%`),
            like(repositories.description, `%${search}%`),
            like(repositories.language, `%${search}%`)
          )
        )
        .orderBy(desc(repositories.updatedAt));
    } else {
      results = await db
        .select()
        .from(repositories)
        .orderBy(desc(repositories.updatedAt));
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching repos:", error);
    return NextResponse.json({ error: "Failed to fetch repos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await db.insert(repositories).values(body).returning();
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating repo:", error);
    return NextResponse.json({ error: "Failed to create repo" }, { status: 500 });
  }
}
