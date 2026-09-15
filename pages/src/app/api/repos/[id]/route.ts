import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { repositories } from "@/db/schema";
import { currentAccount } from "@/lib/accounts";
import { deleteRepo } from "@/lib/repostore";

// GET /api/repos/[id] - one repo row (int8 id compared as text)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await currentAccount();
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const id = (await params).id;
  const [row] = await db
    .select()
    .from(repositories)
    .where(sql`${repositories.id}::text = ${id}`);
  if (!row || row.accountId !== ctx.account.id) {
    return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}

// DELETE /api/repos/[id] - remove the backing repo + row, owner only.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await currentAccount();
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const id = (await params).id;
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
    // keep going - a missing backing repo shouldn't block removing the row
    console.warn("backing repo delete failed:", e);
  }
  await db.delete(repositories).where(sql`${repositories.id}::text = ${id}`);
  return NextResponse.json({ ok: true });
}
