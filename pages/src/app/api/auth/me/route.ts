import { NextRequest, NextResponse } from "next/server";
import { verify, SESSION_COOKIE, type SessionUser } from "@/lib/session";

// Same allowlist as the admin console (server/auth.ts): PUFFBASE_ADMIN_*
// env vars decide who sees the Admin console link. Fail closed.
const adminEmails = new Set(
  (process.env.PUFFBASE_ADMIN_EMAILS ?? "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
);
const adminSubs = new Set(
  (process.env.PUFFBASE_ADMIN_SUBS ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean),
);

export async function GET(req: NextRequest) {
  const user = await verify<SessionUser>(req.cookies.get(SESSION_COOKIE)?.value);
  const isAdmin = !!user && (
    adminSubs.has(user.sub) ||
    (!!user.email && adminEmails.has(user.email.toLowerCase()))
  );
  return NextResponse.json({ user: user ?? null, isAdmin });
}
