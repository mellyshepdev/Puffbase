import * as client from "openid-client";
import { NextRequest, NextResponse } from "next/server";
import { getOidcConfig, requestBase } from "@/lib/oidc";
import { sign, OIDC_COOKIE } from "@/lib/session";

export async function GET(req: NextRequest) {
  const config = await getOidcConfig();
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();

  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: `${requestBase(req)}/api/auth/callback`,
    scope: "openid profile email",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });

  const res = NextResponse.redirect(url.href);
  res.cookies.set(OIDC_COOKIE, await sign({ state, codeVerifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  });
  return res;
}
