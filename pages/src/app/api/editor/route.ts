import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify, SESSION_COOKIE, SessionUser } from "@/lib/session";
import { listDocuments, createDocument } from "@/lib/gitstore";

async function owner(): Promise<string | null> {
  const store = await cookies();
  const user = await verify<SessionUser>(store.get(SESSION_COOKIE)?.value);
  return user?.sub ?? null;
}

// GET /api/editor - list the signed-in user's documents
export async function GET() {
  const sub = await owner();
  if (!sub) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    return NextResponse.json({ documents: await listDocuments(sub) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

// POST /api/editor { name } - create a document
export async function POST(req: NextRequest) {
  const sub = await owner();
  if (!sub) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { name } = await req.json().catch(() => ({}));
  try {
    return NextResponse.json(await createDocument(sub, name));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
