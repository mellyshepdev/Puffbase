import * as client from "openid-client";
import { NextResponse } from "next/server";
import { getOidcConfig, appUrl } from "@/lib/oidc";
import { SESSION_COOKIE } from "@/lib/session";

export async function GET() {
  const config = await getOidcConfig();
  const endSessionUrl = client.buildEndSessionUrl(config, {
    post_logout_redirect_uri: appUrl(),
  });
  const res = NextResponse.redirect(endSessionUrl.href);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
