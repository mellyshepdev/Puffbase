// Server-side bridge to the console service's site-builder engine. The
// builder state machine (Cockroach storage, CrewAI generation, Stripe card
// setup, Lago billing, locator edge routing, site vhost) lives in the
// puffbase express app; these handlers verify the dash session and forward
// the call with the Keycloak identity asserted via a shared internal secret
// (x-puffbase-internal + x-puffbase-sub/email/name -> internalIdentity()).
import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/accounts";

const API = (process.env.PUFFBASE_API_URL ?? "").replace(/\/$/, "");
const TOKEN = process.env.PUFFBASE_INTERNAL_TOKEN ?? "";

export async function proxyBuilder(
  path: string,
  init?: { method?: string; body?: string },
): Promise<NextResponse> {
  const user = await sessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!API || !TOKEN) {
    return NextResponse.json(
      { error: "Site builder backend not configured" },
      { status: 503 },
    );
  }
  try {
    const upstream = await fetch(`${API}/api/builder${path}`, {
      method: init?.method ?? "GET",
      body: init?.body,
      cache: "no-store",
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        "x-puffbase-internal": TOKEN,
        "x-puffbase-sub": user.sub,
        "x-puffbase-email": user.email ?? "",
        "x-puffbase-name": user.name ?? "",
      },
    });
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Builder backend unreachable" },
      { status: 502 },
    );
  }
}
