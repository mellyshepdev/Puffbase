import { NextRequest, NextResponse } from "next/server";
import { requestAccount } from "@/lib/accounts";
import { hasScope } from "@/lib/pat";
import { docTree, deleteDocument } from "@/lib/gitstore";

type Params = { params: Promise<{ name: string }> };

// GET /api/editor/[name] - file tree of a document. Pufftokens need docs:read.
export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "docs:read")) {
    return NextResponse.json({ error: "pufftoken lacks the docs:read scope" }, { status: 403 });
  }
  try {
    return NextResponse.json({ tree: await docTree(ctx.user.sub, (await params).name) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}

// DELETE /api/editor/[name] - delete the whole document. Needs docs:write.
export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "docs:write")) {
    return NextResponse.json({ error: "pufftoken lacks the docs:write scope" }, { status: 403 });
  }
  try {
    await deleteDocument(ctx.user.sub, (await params).name);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 404 });
  }
}
