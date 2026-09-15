import express from 'express';
import type { Express } from 'express';
import fs from "node:fs";
import path from "node:path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const noCache = (
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    res.setHeader("Cache-Control", "no-cache");
    next();
  };

  // The public landing page owns `/`; the console SPA lives at /console
  // (hash-routed, so /console#/deployments etc. all resolve through it).
  app.get("/", noCache, (_req, res) => {
    res.sendFile(path.resolve(distPath, "landing.html"));
  });

  const staticOpts: Parameters<typeof express.static>[1] = {
    setHeaders(res, filePath) {
      // Vite fingerprints everything under /assets/, so those are safe to
      // cache forever. HTML is not: a cached index.html from the last deploy
      // references hashed assets that no longer exist and the page renders
      // as raw, unstyled markup.
      if (/\.html?$/.test(filePath)) {
        res.setHeader("Cache-Control", "no-cache");
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  };

  app.use(express.static(distPath, staticOpts));

  // index.html references assets with relative "./assets/..." URLs, so a
  // visit to /console/ (trailing slash) makes the browser request
  // /console/assets/* - mount the same tree there too or the console
  // renders a blank page.
  app.use("/console", express.static(distPath, staticOpts));

  // fall through to index.html if the file doesn't exist
  app.use("/*path", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
