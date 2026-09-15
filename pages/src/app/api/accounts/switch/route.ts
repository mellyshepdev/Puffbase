import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { sessionUser, sessionWithAccount } from "@/lib/accounts";
import { SESSION_COOKIE } from "@/lib/session";

// POST /api/accounts/switch { id } - make another of the user's accounts
// active by re-signing the session cookie with its id.
export async function POST(req: NextRequest) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  const accountId = typeof id === "string" ? id : "";
  if (!/^[0-9a-f-]{36}$/i.test(accountId)) {
    return NextResponse.json({ error: "valid id required" }, { status: 400 });
  }

  const [acct] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userSub, user.sub)));
  if (!acct) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const res = NextResponse.json({ ok: true, active: acct });
  res.cookies.set(SESSION_COOKIE, await sessionWithAccount(user, accountId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  return res;
}
