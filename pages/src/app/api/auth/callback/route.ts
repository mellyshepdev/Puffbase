import * as client from "openid-client";
import { NextRequest, NextResponse } from "next/server";
import { getOidcConfig, requestBase } from "@/lib/oidc";
import { sign, verify, SESSION_COOKIE, OIDC_COOKIE, type SessionUser } from "@/lib/session";

export async function GET(req: NextRequest) {
  const rawState = req.nextUrl.searchParams.get("state") ?? "";
  let pending = await verify<{ state: string; codeVerifier: string }>(
    req.cookies.get(OIDC_COOKIE)?.value,
  );

  if (!pending && rawState.includes("~")) {
    // Cookie didn't round-trip (see login route) — recover the pending login
    // from the signed verifier packed into the echoed state param. The HMAC
    // signature means only states this server issued can pass.
    const sep = rawState.indexOf("~");
    const packed = await verify<{ s: string; v: string }>(rawState.slice(sep + 1));
    if (packed && packed.s === rawState.slice(0, sep)) {
      pending = { state: rawState, codeVerifier: packed.v };
    }
  }
  if (!pending) return new NextResponse("No login in progress", { status: 400 });

  const config = await getOidcConfig();
  const currentUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, requestBase(req));
  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: pending.codeVerifier,
    expectedState: pending.state,
  });

  const claims = tokens.claims();
  if (!claims?.sub) return new NextResponse("Login failed - no subject claim", { status: 401 });

  const user: SessionUser = {
    sub: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
    name: typeof claims.name === "string" ? claims.name : undefined,
    picture: typeof claims.picture === "string" ? claims.picture : undefined,
  };

  const res = NextResponse.redirect(requestBase(req) + "/");
  res.cookies.set(SESSION_COOKIE, await sign(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
  res.cookies.delete(OIDC_COOKIE);
  return res;
}
