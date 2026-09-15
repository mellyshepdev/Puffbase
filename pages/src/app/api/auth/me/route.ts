import { NextRequest, NextResponse } from "next/server";
import { verify, SESSION_COOKIE, type SessionUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await verify<SessionUser>(req.cookies.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ user: user ?? null });
}
