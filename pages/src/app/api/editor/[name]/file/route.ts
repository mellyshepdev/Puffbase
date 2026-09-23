import { NextRequest, NextResponse } from "next/server";
import { requestAccount } from "@/lib/accounts";
import { hasScope } from "@/lib/pat";
import { docRead, docWrite, docDeleteFile } from "@/lib/gitstore";

type Params = { params: Promise<{ name: string }> };

// GET /api/editor/[name]/file?path=x - read one file. Pufftokens need docs:read.
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "docs:read")) {
    return NextResponse.json({ error: "pufftoken lacks the docs:read scope" }, { status: 403 });
  }
  const path = req.nextUrl.searchParams.get("path") ?? "";
  try {
    return NextResponse.json(await docRead(ctx.user.sub, (await params).name, path));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}

// PUT /api/editor/[name]/file { path, content, sha?, message? } - write a file.
// Pufftokens need docs:write.
export async function PUT(req: NextRequest, { params }: Params) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "docs:write")) {
    return NextResponse.json({ error: "pufftoken lacks the docs:write scope" }, { status: 403 });
  }
  const { path, content, sha, message } = await req.json().catch(() => ({}));
  if (typeof path !== "string" || typeof content !== "string") {
    return NextResponse.json({ error: "path and content required" }, { status: 400 });
  }
  try {
    await docWrite(ctx.user.sub, (await params).name, path, { content, sha, message });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

// DELETE /api/editor/[name]/file?path=x&sha=y - delete a file. Needs docs:write.
export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "docs:write")) {
    return NextResponse.json({ error: "pufftoken lacks the docs:write scope" }, { status: 403 });
  }
  const path = req.nextUrl.searchParams.get("path") ?? "";
  const sha = req.nextUrl.searchParams.get("sha") ?? "";
  try {
    await docDeleteFile(ctx.user.sub, (await params).name, path, sha);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}
