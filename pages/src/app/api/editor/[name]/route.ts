import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify, SESSION_COOKIE, SessionUser } from "@/lib/session";
import { docTree, deleteDocument } from "@/lib/gitstore";

async function owner(): Promise<string | null> {
  const store = await cookies();
  const user = await verify<SessionUser>(store.get(SESSION_COOKIE)?.value);
  return user?.sub ?? null;
}

type Params = { params: Promise<{ name: string }> };

// GET /api/editor/[name] - file tree of a document
export async function GET(_req: Request, { params }: Params) {
  const sub = await owner();
  if (!sub) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    return NextResponse.json({ tree: await docTree(sub, (await params).name) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}

// DELETE /api/editor/[name] - delete the whole document
export async function DELETE(_req: Request, { params }: Params) {
  const sub = await owner();
  if (!sub) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    await deleteDocument(sub, (await params).name);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}
