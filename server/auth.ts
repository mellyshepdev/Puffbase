// ---------------------------------------------------------------------------
// Real login via Keycloak (the `puffbase` client in the `blacksheep` realm -
// confidential, standard authorization-code flow, its own branded
// `puffbase` login theme). Session-based: after the OIDC callback, the
// user's claims live in the server session: nothing OIDC-specific reaches
// the client beyond `GET /api/auth/me`.
// ---------------------------------------------------------------------------
import * as client from "openid-client";
import session from "express-session";
import createMemoryStore from "memorystore";
import type { Express, NextFunction, Request, Response } from "express";
import { trackActivity } from "./usage";

declare module "express-session" {
  interface SessionData {
    user?: { sub: string; email?: string; name?: string };
    oidc?: { state: string; codeVerifier: string; returnTo?: string };
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for Keycloak login`);
  return value;
}

let configPromise: Promise<client.Configuration> | null = null;
function getOidcConfig(): Promise<client.Configuration> {
  if (!configPromise) {
    configPromise = client.discovery(
      new URL(`${requireEnv("KEYCLOAK_URL")}/realms/${requireEnv("KEYCLOAK_REALM")}`),
      requireEnv("KEYCLOAK_CLIENT_ID"),
      requireEnv("KEYCLOAK_CLIENT_SECRET"),
    );
  }
  return configPromise;
}

const MemoryStore = createMemoryStore(session);

export function sessionMiddleware() {
  return session({
    store: new MemoryStore({ checkPeriod: 86_400_000 }),
    secret: process.env.SESSION_SECRET ?? "dev-only-insecure-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      // Console logins start on admin.puff-base.com but the OIDC callback
      // always lands on APP_URL (puff-base.com) - a host-only cookie would
      // never reach the admin subdomain. Keep unset locally.
      domain: process.env.SESSION_COOKIE_DOMAIN || undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });
}

/** Blocks any /api route reached before /api/auth/* until a session exists.
 *  Registered ahead of registerRoutes()'s own routes in server/index.ts. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session.user) return next();
  return res.status(401).json({ error: "Not signed in" });
}

/* ------------------------------------------------------------------------- *
 * Admin gate. Puffbase talks to Gitea through one shared instance-admin
 * token, so repo browsing/editing is effectively "act as puffadmin". Until
 * per-user Gitea accounts exist, only allowlisted accounts may touch the
 * /api/repos* routes - otherwise every sign-in can read and commit to every
 * private repo on the instance. Fail closed: no env list = nobody is admin.
 * ------------------------------------------------------------------------- */
const adminEmails = new Set(
  (process.env.PUFFBASE_ADMIN_EMAILS ?? "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
);
const adminSubs = new Set(
  (process.env.PUFFBASE_ADMIN_SUBS ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean),
);

export function isAdmin(user?: { sub: string; email?: string } | null): boolean {
  if (!user) return false;
  return adminSubs.has(user.sub) || (!!user.email && adminEmails.has(user.email.toLowerCase()));
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (isAdmin(req.session.user)) return next();
  return res.status(403).json({ error: "Restricted to the instance admin" });
}

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:5000").replace(/\/$/, "");
}

// Pending logins keyed by the OIDC `state` param, which survives the whole
// round trip because it comes back inside the callback URL itself. The
// session-cookie copy remains the preferred path; this map is the fallback
// for browsers (Firefox Total Cookie Protection / ETP Strict) that partition
// or drop the cookie across the cross-domain hop to Keycloak and back.
// Entries are single-use and expire after 10 minutes.
const pendingLogins = new Map<string, { codeVerifier: string; returnTo?: string; expiresAt: number }>();
const PENDING_LOGIN_TTL_MS = 10 * 60 * 1000;

// The admin console lives on its own subdomain; logins that start there get
// sent back there after the OIDC round trip instead of the user dashboard.
const ADMIN_HOST = "admin.puff-base.com";

function returnToFor(host?: string): string | undefined {
  return host === ADMIN_HOST ? `https://${ADMIN_HOST}/` : undefined;
}

function prunePendingLogins() {
  const now = Date.now();
  pendingLogins.forEach((v, k) => { if (v.expiresAt <= now) pendingLogins.delete(k); });
}
setInterval(prunePendingLogins, 60_000).unref();

export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/login", async (_req, res, next) => {
    try {
      const config = await getOidcConfig();
      const codeVerifier = client.randomPKCECodeVerifier();
      const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
      const state = client.randomState();
      const returnTo = returnToFor(_req.hostname);
      _req.session.oidc = { state, codeVerifier, returnTo };
      pendingLogins.set(state, { codeVerifier, returnTo, expiresAt: Date.now() + PENDING_LOGIN_TTL_MS });

      const url = client.buildAuthorizationUrl(config, {
        redirect_uri: `${appUrl()}/api/auth/callback`,
        scope: "openid profile email",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state,
      });
      res.redirect(url.href);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/auth/callback", async (req, res, next) => {
    try {
      let pending = req.session.oidc;
      if (!pending) {
        // Session cookie didn't round-trip (see pendingLogins comment above).
        // Recover the pending login from the `state` param instead.
        const state = typeof req.query.state === "string" ? req.query.state : "";
        const entry = state ? pendingLogins.get(state) : undefined;
        if (entry && entry.expiresAt > Date.now()) {
          pending = { state, codeVerifier: entry.codeVerifier, returnTo: entry.returnTo };
        }
        if (!pending) {
          console.log(
            `[auth] callback without pending state: cookie=${req.headers.cookie ? "present" : "ABSENT"} state-param=${state ? "present" : "ABSENT"} sessionID=${req.sessionID} host=${req.hostname} referer=${req.get("referer") ?? "none"}`,
          );
          return res.status(400).send("No login in progress");
        }
        console.log(`[auth] callback recovered pending login via state param (cookie ${req.headers.cookie ? "present" : "ABSENT"})`);
      }

      const config = await getOidcConfig();
      const currentUrl = new URL(req.originalUrl, appUrl());
      const tokens = await client.authorizationCodeGrant(config, currentUrl, {
        pkceCodeVerifier: pending.codeVerifier,
        expectedState: pending.state,
      });
      delete req.session.oidc;
      pendingLogins.delete(pending.state);

      const claims = tokens.claims();
      if (!claims?.sub) return res.status(401).send("Login failed - no subject claim");

      req.session.user = {
        sub: claims.sub,
        email: typeof claims.email === "string" ? claims.email : undefined,
        name: typeof claims.name === "string" ? claims.name : undefined,
      };
      trackActivity(claims.sub, "auth", `${claims.name || claims.email || claims.sub} signed in`, "success");
      // Post-login lands on the user dashboard - or back on the admin
      // console host when that's where the login started.
      res.redirect(pending.returnTo ?? process.env.USER_DASH_URL ?? "https://dash.puff-base.com");
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/auth/logout", async (req, res, next) => {
    try {
      const config = await getOidcConfig();
      req.session.destroy(() => {
        const endSessionUrl = client.buildEndSessionUrl(config, {
          post_logout_redirect_uri: appUrl(),
        });
        res.redirect(endSessionUrl.href);
      });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/auth/me", (req, res) => {
    res.json({ user: req.session.user ?? null, isAdmin: isAdmin(req.session.user) });
  });
}
