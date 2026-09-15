import * as client from "openid-client";
import { NextRequest, NextResponse } from "next/server";
import { getOidcConfig, requestBase } from "@/lib/oidc";
import { SESSION_COOKIE } from "@/lib/session";

export async function GET(req: NextRequest) {
  const config = await getOidcConfig();
  const endSessionUrl = client.buildEndSessionUrl(config, {
    post_logout_redirect_uri: requestBase(req),
  });
  const res = NextResponse.redirect(endSessionUrl.href);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
