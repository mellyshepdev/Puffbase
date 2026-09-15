import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { repositories } from "@/db/schema";
import { currentAccount } from "@/lib/accounts";
import { repoTree } from "@/lib/repostore";

// GET /api/repos/[id]/tree - real file tree from the account's repo
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
  try {
    return NextResponse.json({ tree: await repoTree(ctx.account.id, row.name) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
