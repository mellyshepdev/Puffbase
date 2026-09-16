import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { sshKeys } from "@/db/schema";
import { sessionUser } from "@/lib/accounts";

const KEY_TYPES = [
  "ssh-ed25519",
  "ssh-rsa",
  "ecdsa-sha2-nistp256",
  "ecdsa-sha2-nistp384",
  "ecdsa-sha2-nistp521",
  "sk-ssh-ed25519@openssh.com",
  "sk-ecdsa-sha2-nistp256@openssh.com",
];

/** Parse "<type> <base64> [comment]" and return the OpenSSH-style
 *  SHA256 fingerprint of the key blob, or null if it isn't a public key. */
function fingerprintOf(key: string): string | null {
  const parts = key.trim().split(/\s+/);
  if (parts.length < 2 || !KEY_TYPES.includes(parts[0])) return null;
  let blob: Buffer;
  try {
    blob = Buffer.from(parts[1], "base64");
    if (blob.length < 16 || blob.toString("base64").replace(/=+$/, "") !== parts[1].replace(/=+$/, "")) {
      return null;
    }
  } catch {
    return null;
  }
  const digest = createHash("sha256").update(blob).digest("base64").replace(/=+$/, "");
  return `SHA256:${digest}`;
}

// GET /api/ssh-keys - the signed-in user's keys (metadata, not a secret list:
// public keys are public by design, we still return them for display).
export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const rows = await db.select().from(sshKeys).where(eq(sshKeys.userSub, user.sub));
  return NextResponse.json({
    keys: rows
      .map((k) => ({ id: k.id, name: k.name, publicKey: k.publicKey, fingerprint: k.fingerprint, createdAt: k.createdAt }))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
  });
}

// POST /api/ssh-keys { name, publicKey }
export async function POST(req: NextRequest) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const publicKey = typeof body.publicKey === "string" ? body.publicKey.trim() : "";
  const fingerprint = fingerprintOf(publicKey);
  if (!fingerprint) {
    return NextResponse.json(
      { error: "That doesn't look like an SSH public key (ssh-ed25519 AAAA…)" },
      { status: 400 },
    );
  }
  const name = typeof body.name === "string" && body.name.trim()
    ? body.name.trim().slice(0, 120)
    : publicKey.split(/\s+/)[2]?.slice(0, 120) || "SSH key";

  const [created] = await db
    .insert(sshKeys)
    .values({ userSub: user.sub, name, publicKey, fingerprint })
    .returning();
  return NextResponse.json(
    { id: created.id, name: created.name, publicKey: created.publicKey, fingerprint: created.fingerprint, createdAt: created.createdAt },
    { status: 201 },
  );
}

// DELETE /api/ssh-keys?id=<uuid> - owner-checked
export async function DELETE(req: NextRequest) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "valid id required" }, { status: 400 });
  }
  const [gone] = await db
    .delete(sshKeys)
    .where(and(eq(sshKeys.id, id), eq(sshKeys.userSub, user.sub)))
    .returning();
  if (!gone) return NextResponse.json({ error: "Key not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
