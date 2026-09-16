import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { repositories } from "@/db/schema";
import { requestAccount } from "@/lib/accounts";
import { hasScope } from "@/lib/pat";
import { deleteRepo, updateRepo, addPushMirror, repoIsMirror, syncMirror } from "@/lib/repostore";

// GET /api/repos/[id] - one repo row (int8 id compared as text)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requestAccount(_req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:read")) return NextResponse.json({ error: "pufftoken lacks the repos:read scope" }, { status: 403 });
  const id = (await params).id;
  const [row] = await db
    .select()
    .from(repositories)
    .where(sql`${repositories.id}::text = ${id}`);
  if (!row || row.accountId !== ctx.account.id) {
    return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  }
  let isMirror = false;
  try {
    isMirror = await repoIsMirror(ctx.account.id, row.name);
  } catch {
    /* daemon hiccup must not take the page's repo fetch down with it */
  }
  return NextResponse.json({ ...row, isMirror });
}

// POST /api/repos/[id] { action: "sync-mirror" } - pull a native mirror's
// remote in now rather than waiting for the daemon's interval.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:write")) return NextResponse.json({ error: "pufftoken lacks the repos:write scope" }, { status: 403 });
  const id = (await params).id;
  const body = await req.json().catch(() => ({}));
  const [row] = await db
    .select()
    .from(repositories)
    .where(sql`${repositories.id}::text = ${id}`);
  if (!row || row.accountId !== ctx.account.id) {
    return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  }
  if (body.action === "sync-mirror") {
    try {
      await syncMirror(ctx.account.id, row.name);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json(
        { error: `sync failed - ${String(e).slice(0, 160)}. Only repos imported as mirrors can pull; this one may need re-importing with "keep in sync" checked.` },
        { status: 400 },
      );
    }
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

// PATCH /api/repos/[id] - star/unstar (favorites view) or repo settings:
// { favorite? , description?, visibility?, mirrorUrl?, mirrorDirection?, mirrorToken? }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:write")) return NextResponse.json({ error: "pufftoken lacks the repos:write scope" }, { status: 403 });
  const id = (await params).id;
  const body = await req.json().catch(() => ({}));
  const [row] = await db
    .select()
    .from(repositories)
    .where(sql`${repositories.id}::text = ${id}`);
  if (!row || row.accountId !== ctx.account.id) {
    return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.favorite === "boolean") patch.isFavorite = body.favorite;
  if (typeof body.description === "string") patch.description = body.description.slice(0, 2000);
  if (body.visibility === "public" || body.visibility === "private") patch.visibility = body.visibility;
  if (typeof body.mirrorUrl === "string") patch.mirrorUrl = body.mirrorUrl.trim() || null;
  if (body.mirrorDirection === "push" || body.mirrorDirection === "pull" || body.mirrorDirection === null) {
    patch.mirrorDirection = body.mirrorDirection;
  }

  // daemon side: description + private flag; warn but don't fail the save
  const daemonPatch: { description?: string; private?: boolean } = {};
  if (patch.description !== undefined) daemonPatch.description = patch.description as string;
  if (patch.visibility !== undefined) daemonPatch.private = patch.visibility === "private";
  if (Object.keys(daemonPatch).length) {
    try {
      await updateRepo(ctx.account.id, row.name, daemonPatch);
    } catch (e) {
      console.warn("daemon repo patch failed:", e);
    }
  }

  // push mirror: register on the daemon (needs gitea >=1.21); pull mirrors
  // can't be retrofitted via API - only repos imported with mirror:true sync.
  let mirrorNote: string | undefined;
  if (typeof body.mirrorUrl === "string" && body.mirrorUrl.trim() && body.mirrorDirection === "push") {
    try {
      await addPushMirror(ctx.account.id, row.name, body.mirrorUrl.trim(), {
        authToken: body.mirrorToken ? String(body.mirrorToken) : undefined,
      });
      mirrorNote = "push mirror registered";
    } catch (e) {
      mirrorNote = `mirror saved but daemon rejected it: ${String(e).slice(0, 160)}`;
      patch.mirrorUrl = body.mirrorUrl.trim();
    }
  } else if (body.mirrorDirection === "pull") {
    try {
      mirrorNote = (await repoIsMirror(ctx.account.id, row.name))
        ? "pull mirror - the daemon re-syncs it every 8h, or hit Sync now"
        : "pull mirror noted, but this repo wasn't imported as a mirror so nothing will sync. Re-create it via Import with 'keep in sync' checked to get real pull mirroring.";
    } catch {
      mirrorNote = "pull mirror saved";
    }
  }

  await db
    .update(repositories)
    .set(patch)
    .where(sql`${repositories.id}::text = ${id}`);
  return NextResponse.json({ ok: true, ...(mirrorNote ? { mirrorNote } : {}) });
}

// DELETE /api/repos/[id] - remove the backing repo + row, owner only.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requestAccount(_req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:write")) return NextResponse.json({ error: "pufftoken lacks the repos:write scope" }, { status: 403 });
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
