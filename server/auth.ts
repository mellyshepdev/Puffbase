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

declare module "express-session" {
  interface SessionData {
    user?: { sub: string; email?: string; name?: string };
    oidc?: { state: string; codeVerifier: string };
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

function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:5000").replace(/\/$/, "");
}

export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/login", async (_req, res, next) => {
    try {
      const config = await getOidcConfig();
      const codeVerifier = client.randomPKCECodeVerifier();
      const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
      const state = client.randomState();
      _req.session.oidc = { state, codeVerifier };

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
      const pending = req.session.oidc;
      if (!pending) return res.status(400).send("No login in progress");

      const config = await getOidcConfig();
      const currentUrl = new URL(req.originalUrl, appUrl());
      const tokens = await client.authorizationCodeGrant(config, currentUrl, {
        pkceCodeVerifier: pending.codeVerifier,
        expectedState: pending.state,
      });
      delete req.session.oidc;

      const claims = tokens.claims();
      if (!claims?.sub) return res.status(401).send("Login failed - no subject claim");

      req.session.user = {
        sub: claims.sub,
        email: typeof claims.email === "string" ? claims.email : undefined,
        name: typeof claims.name === "string" ? claims.name : undefined,
      };
      res.redirect("/");
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
    res.json({ user: req.session.user ?? null });
  });
}
