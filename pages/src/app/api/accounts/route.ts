import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, integrations, groups, repositories, issues, pipelines, deployments } from "@/db/schema";
import { deleteRepo } from "@/lib/repostore";
import {
  sessionUser,
  getOrCreateAccounts,
  activeAccount,
  sessionWithAccount,
  SHEEP_AVATARS,
} from "@/lib/accounts";
import { SESSION_COOKIE } from "@/lib/session";

// GET /api/accounts - the user's accounts + which one is active
export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const list = await getOrCreateAccounts(user.sub, user.name ?? user.email ?? "Personal");
  return NextResponse.json({
    accounts: list,
    active: activeAccount(list, user),
  });
}

// POST /api/accounts { kind, name } - create a business account
export async function POST(req: NextRequest) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "business" ? "business" : "personal";
  const name = typeof body.name === "string" && body.name.trim()
    ? body.name.trim().slice(0, 120)
    : kind === "business" ? "Business" : "Personal";

  if (kind === "personal") {
    // exactly one personal account per user
    const existing = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userSub, user.sub), eq(accounts.kind, "personal")));
    if (existing.length > 0) {
      return NextResponse.json({ error: "Personal account already exists" }, { status: 409 });
    }
  }

  const [created] = await db
    .insert(accounts)
    .values({ userSub: user.sub, kind, name })
    .returning();
  return NextResponse.json(created, { status: 201 });
}

// PATCH /api/accounts { id, name?, avatar?, businessUrl? } - update own account
export async function PATCH(req: NextRequest) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "valid id required" }, { status: 400 });
  }

  const patch: Partial<typeof accounts.$inferInsert> = { updatedAt: new Date() };
  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim().slice(0, 120);
  }
  if (typeof body.avatar === "string" && SHEEP_AVATARS.includes(body.avatar)) {
    patch.avatar = body.avatar;
  }
  if (typeof body.businessUrl === "string") {
    patch.businessUrl = body.businessUrl.trim().slice(0, 500) || null;
  }

  const [updated] = await db
    .update(accounts)
    .set(patch)
    .where(and(eq(accounts.id, id), eq(accounts.userSub, user.sub)))
    .returning();
  if (!updated) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/accounts { id } - delete an owned account; keeps at least one
// account per user and blocks deleting the active one (switch first).
export async function DELETE(req: NextRequest) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "valid id required" }, { status: 400 });
  }
  const mine = await db.select().from(accounts).where(eq(accounts.userSub, user.sub));
  if (mine.length <= 1) {
    return NextResponse.json({ error: "Cannot delete your only account" }, { status: 400 });
  }
  const [gone] = await db
    .delete(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userSub, user.sub)))
    .returning();
  if (!gone) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  // Remove everything the account owned: integrations, groups, repos and
  // their backing repos in the internal store.
  await db.delete(integrations).where(eq(integrations.accountId, id));
  await db.delete(groups).where(eq(groups.accountId, id));
  const owned = await db.select().from(repositories).where(eq(repositories.accountId, id));
  const ownedIds = owned.map((r) => r.id);
  if (ownedIds.length) {
    const idList = sql.join(ownedIds.map((i) => sql`${i}`), sql`, `);
    await db.delete(issues).where(sql`${issues.repoId} IN (${idList})`);
    await db.delete(pipelines).where(sql`${pipelines.repoId} IN (${idList})`);
    await db.delete(deployments).where(sql`${deployments.repoId} IN (${idList})`);
    for (const repo of owned) {
      try {
        await deleteRepo(id, repo.name);
      } catch (e) {
        console.warn("backing repo delete failed:", e);
      }
    }
    await db.delete(repositories).where(eq(repositories.accountId, id));
  }
  // Deleting the active account? Re-sign the session onto the personal one.
  const res = NextResponse.json({ ok: true });
  if (user.accountId === id) {
    const next = mine.find((a) => a.id !== id && a.kind === "personal") ?? mine.find((a) => a.id !== id);
    if (next) {
      res.cookies.set(SESSION_COOKIE, await sessionWithAccount(user, next.id), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });
    }
  }
  return res;
}
