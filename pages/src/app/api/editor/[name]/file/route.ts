import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify, SESSION_COOKIE, SessionUser } from "@/lib/session";
import { docRead, docWrite, docDeleteFile } from "@/lib/gitstore";

async function owner(): Promise<string | null> {
  const store = await cookies();
  const user = await verify<SessionUser>(store.get(SESSION_COOKIE)?.value);
  return user?.sub ?? null;
}

type Params = { params: Promise<{ name: string }> };

// GET /api/editor/[name]/file?path=x - read one file
export async function GET(req: NextRequest, { params }: Params) {
  const sub = await owner();
  if (!sub) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const path = req.nextUrl.searchParams.get("path") ?? "";
  try {
    return NextResponse.json(await docRead(sub, (await params).name, path));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}

// PUT /api/editor/[name]/file { path, content, sha?, message? } - write a file
export async function PUT(req: NextRequest, { params }: Params) {
  const sub = await owner();
  if (!sub) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { path, content, sha, message } = await req.json().catch(() => ({}));
  if (typeof path !== "string" || typeof content !== "string") {
    return NextResponse.json({ error: "path and content required" }, { status: 400 });
  }
  try {
    await docWrite(sub, (await params).name, path, { content, sha, message });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

// DELETE /api/editor/[name]/file?path=x&sha=y - delete a file
export async function DELETE(req: NextRequest, { params }: Params) {
  const sub = await owner();
  if (!sub) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const path = req.nextUrl.searchParams.get("path") ?? "";
  const sha = req.nextUrl.searchParams.get("sha") ?? "";
  try {
    await docDeleteFile(sub, (await params).name, path, sha);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}
