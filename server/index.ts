import "dotenv/config";
import express, { Response, NextFunction } from 'express';
import type { Request } from 'express';
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "node:http";
import { sessionMiddleware, registerAuthRoutes, requireAuth } from "./auth";
import { usageTracker } from "./usage";
import { storage } from "./storage";

const app = express();
// Traefik terminates TLS and forwards to this container over plain HTTP, so
// Express itself never sees the connection as secure. Without this, the
// session cookie's `secure: true` flag (required in production - see
// server/auth.ts) silently never gets set at all: no session survives from
// /api/auth/login to /api/auth/callback, and login fails with "No login in
// progress" no matter how far the Keycloak side got.
app.set("trust proxy", 1);
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

usageTracker(app);

// Builder sites: requests whose Host is a <PUFFBASE_DEPLOY_DOMAIN> subdomain
// resolve to the project row - live projects serve the generated document,
// reserved-but-unpublished space shows a placeholder, unclaimed subdomains
// 404. Public by design (customer-facing pages), so this runs before the
// /api auth gate and never touches it.
const SITE_PLACEHOLDER = `<!doctype html><html><head><meta charset="utf-8"><title>Site under construction</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:hsl(270 22% 6%);color:#d8cfe8;font-family:system-ui,sans-serif;text-align:center}h1{font-size:1.4rem;font-weight:600}p{color:#8a80a0;font-size:.9rem}</style></head><body><div><h1>This space is being built</h1><p>A Puffbase site is generating here. Check back shortly.</p></div></body></html>`;

app.use((req, res, next) => {
  const domain = process.env.PUFFBASE_DEPLOY_DOMAIN ?? "";
  const host = req.hostname.toLowerCase();
  if (!domain || !host.endsWith(`.${domain}`)) return next();
  const subdomain = host.slice(0, -(domain.length + 1));
  void storage
    .findBuilderSite(subdomain)
    .then((site) => {
      if (!site) return res.status(404).send("No site published here");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      if (site.status === "live" && site.html) {
        res.setHeader("Cache-Control", "public, max-age=60");
        return res.send(site.html);
      }
      res.setHeader("Cache-Control", "no-store");
      return res.send(SITE_PLACEHOLDER);
    })
    .catch(() => res.status(500).send("Site unavailable"));
});

app.use(sessionMiddleware());
registerAuthRoutes(app);
// Everything under /api is real data now, not a public demo - gate it behind
// a session, except the auth routes themselves (login has to be reachable
// while logged out, obviously).
app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/auth/")) return next();
  return requireAuth(req, res, next);
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
