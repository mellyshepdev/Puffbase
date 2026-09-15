import { NextRequest, NextResponse } from "next/server";
import { verify, SESSION_COOKIE } from "@/lib/session";

// Everything is real customer data behind this gate - no local login form,
// straight to Keycloak's puffbase-themed screen under the puffbase-customers
// realm (see src/app/api/auth/*). /api/auth/* and Next's own asset routes
// stay open so the redirect loop itself and static files work while logged out.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const user = await verify(req.cookies.get(SESSION_COOKIE)?.value);
  if (user) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/api/auth/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|emblem.svg|puffbase-emblem.png|puffbase-icon.png|ooze-sidebar.webp|ooze-drip-rail.webp).*)"],
};
