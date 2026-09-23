import { NextRequest, NextResponse } from "next/server";
import { requestAccount } from "@/lib/accounts";
import { hasScope } from "@/lib/pat";
import { listDocuments, createDocument } from "@/lib/gitstore";

// GET /api/editor - list the user's documents. Bearer pufftokens need docs:read.
export async function GET(req: NextRequest) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "docs:read")) {
    return NextResponse.json({ error: "pufftoken lacks the docs:read scope" }, { status: 403 });
  }
  try {
    return NextResponse.json({ documents: await listDocuments(ctx.user.sub) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

// POST /api/editor { name } - create a document. Bearer pufftokens need docs:write.
export async function POST(req: NextRequest) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "docs:write")) {
    return NextResponse.json({ error: "pufftoken lacks the docs:write scope" }, { status: 403 });
  }
  const { name } = await req.json().catch(() => ({}));
  try {
    return NextResponse.json(await createDocument(ctx.user.sub, name));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
