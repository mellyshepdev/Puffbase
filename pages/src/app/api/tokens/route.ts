import { NextRequest, NextResponse } from "next/server";
import { currentAccount } from "@/lib/accounts";
import { createPat, listPats, revokePat, hashToken, FINE_GRAINED_SCOPES } from "@/lib/pat";

// Token management is cookie-session only - a pufftoken cannot mint or
// revoke other pufftokens.
export async function GET() {
  const ctx = await currentAccount();
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const tokens = (await listPats(ctx.account.id)).map(({ id, name, kind, scopes, prefix, createdAt }) => ({
      id, name, kind, scopes, prefix, createdAt,
    }));
    return NextResponse.json({ tokens });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

// POST /api/tokens { name, kind: "classic"|"fine-grained", scopes? }
// Returns the plaintext token exactly once - only its sha256 is stored.
export async function POST(req: NextRequest) {
  const ctx = await currentAccount();
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const kind = body.kind === "fine-grained" ? "fine-grained" : "classic";
  const scopes = Array.isArray(body.scopes)
    ? body.scopes.filter((s: unknown) => (FINE_GRAINED_SCOPES as readonly string[]).includes(s as string))
    : [];
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (kind === "fine-grained" && scopes.length === 0) {
    return NextResponse.json({ error: "pick at least one scope" }, { status: 400 });
  }
  try {
    const { token, record } = await createPat(ctx.account.id, ctx.user.sub, name, kind, scopes);
    return NextResponse.json(
      { token, id: hashToken(token), record: { name: record.name, kind, scopes: record.scopes, prefix: record.prefix, createdAt: record.createdAt } },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

// DELETE /api/tokens?id=<hash> - revoke, owner-checked
export async function DELETE(req: NextRequest) {
  const ctx = await currentAccount();
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!(await revokePat(ctx.account.id, id))) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
