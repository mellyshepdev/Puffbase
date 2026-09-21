import * as client from "openid-client";
import { NextRequest, NextResponse } from "next/server";
import { getOidcConfig, requestBase } from "@/lib/oidc";
import { sign, OIDC_COOKIE } from "@/lib/session";

export async function GET(req: NextRequest) {
  const config = await getOidcConfig();
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();

  // Pack a signed copy of the PKCE verifier into the state param itself. If the
  // slimegit_oidc cookie is partitioned/dropped on the cross-site hop (Firefox
  // Total Cookie Protection, Safari ITP, etc.) the callback can still recover
  // the pending login from the echoed state instead of erroring and forcing a
  // second login.
  const packedState = `${state}~${await sign({ s: state, v: codeVerifier })}`;

  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: `${requestBase(req)}/api/auth/callback`,
    scope: "openid profile email",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state: packedState,
  });

  const res = NextResponse.redirect(url.href);
  res.cookies.set(OIDC_COOKIE, await sign({ state: packedState, codeVerifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  });
  return res;
}
