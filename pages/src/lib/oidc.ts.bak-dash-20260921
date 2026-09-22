// OIDC discovery/config for SlimeGit's own login: the `slimegit` client in
// the `puffbase-customers` Keycloak realm - a genuinely separate identity
// from the admin app's `puffbase` client in the staff `blacksheep` realm.
// Node-only (openid-client) - only ever imported from route handlers, never
// from middleware.ts.
import * as client from "openid-client";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for Keycloak login`);
  return value;
}

let configPromise: Promise<client.Configuration> | null = null;

export function getOidcConfig(): Promise<client.Configuration> {
  if (!configPromise) {
    configPromise = client.discovery(
      new URL(`${requireEnv("KEYCLOAK_URL")}/realms/${requireEnv("KEYCLOAK_REALM")}`),
      requireEnv("KEYCLOAK_CLIENT_ID"),
      requireEnv("KEYCLOAK_CLIENT_SECRET"),
    );
  }
  return configPromise;
}

export function appUrl(): string {
  return requireEnv("APP_URL").replace(/\/$/, "");
}

/** Public base URL for the current request. The app is served on both
 *  app.prime-quality.online and puff.dashboard.prime-quality.online, and the
 *  session cookie is host-only - so the login redirect_uri must complete on
 *  whichever host the user actually came from. */
export function requestBase(req: { headers: Headers }): string {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "")
    .split(",")[0].trim();
  if (!host) return appUrl();
  const proto = (req.headers.get("x-forwarded-proto") ?? "https").split(",")[0].trim();
  return `${proto}://${host}`;
}
