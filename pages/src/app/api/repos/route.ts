import { db } from "@/db";
import { repositories } from "@/db/schema";
import { like, or, and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requestAccount } from "@/lib/accounts";
import { hasScope } from "@/lib/pat";
import { createRepo, deleteRepo } from "@/lib/repostore";

// GET /api/repos - the active account's repositories
export async function GET(request: NextRequest) {
  const ctx = await requestAccount(request);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:read")) return NextResponse.json({ error: "pufftoken lacks the repos:read scope" }, { status: 403 });
  const search = request.nextUrl.searchParams.get("search") || "";

  try {
    const scope = eq(repositories.accountId, ctx.account.id);
    const results = await db
      .select()
      .from(repositories)
      .where(
        search
          ? and(
              scope,
              or(
                like(repositories.name, `%${search}%`),
                like(repositories.description, `%${search}%`),
                like(repositories.language, `%${search}%`),
              ),
            )
          : scope,
      );
    results.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching repos:", error);
    return NextResponse.json({ error: "Failed to fetch repos" }, { status: 500 });
  }
}

// POST /api/repos { name, description?, language? } - real repo in the
// account's space on the internal store + a dashboard row.
export async function POST(request: NextRequest) {
  const ctx = await requestAccount(request);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:write")) return NextResponse.json({ error: "pufftoken lacks the repos:write scope" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-_.]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  try {
    const meta = await createRepo(ctx.account.id, name, String(body.description ?? ""));
    const [created] = await db
      .insert(repositories)
      .values({
        name,
        description: String(body.description ?? ""),
        language: body.language ?? null,
        visibility: "private",
        defaultBranch: meta.defaultBranch || "main",
        lastCommitMessage: "Initial commit",
        accountId: ctx.account.id,
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating repo:", error);
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}

// DELETE /api/repos?id=… - removes the store repo and the dashboard row.
// repositories.id is crdb int8 (overflows JS numbers) so compare as text.
export async function DELETE(request: NextRequest) {
  const ctx = await requestAccount(request);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:write")) return NextResponse.json({ error: "pufftoken lacks the repos:write scope" }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id") ?? "";

  const [row] = await db
    .select()
    .from(repositories)
    .where(sql`${repositories.id}::text = ${id}`);
  if (!row || row.accountId !== ctx.account.id) {
    return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  }

  try {
    await deleteRepo(ctx.account.id, row.name);
  } catch (e) {
    console.error("store delete failed, removing row anyway:", e);
  }
  await db.delete(repositories).where(sql`${repositories.id}::text = ${id}`);
  return NextResponse.json({ ok: true });
}
