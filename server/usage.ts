import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";

/** Usage tracking: the /api/metrics series (api_calls, latency, errors, uptime)
 *  exist but nothing wrote to them, so Analytics charted an empty store.
 *  This middleware counts every request in memory and a 60s timer flushes
 *  aggregates into `metrics` — one row per type per window, so the table
 *  stays small (≈5,760 rows/day) and the summary endpoint stays cheap. */

const FLUSH_MS = 60_000;
const boot = Date.now();

const acc = {
  apiCalls: 0,
  errors: 0,
  latencySum: 0,
  latencyN: 0,
};

export function usageTracker(app: Express) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) acc.apiCalls += 1;
      if (res.statusCode >= 500) acc.errors += 1;
      acc.latencySum += Date.now() - start;
      acc.latencyN += 1;
    });
    next();
  });

  const timer = setInterval(async () => {
    const { apiCalls, errors, latencySum, latencyN } = acc;
    acc.apiCalls = 0;
    acc.errors = 0; acc.latencySum = 0; acc.latencyN = 0;

    const now = new Date().toISOString();
    // `uptime` is a percent: summarizeMetrics averages the column /100, so a
    // live process writes 100 for every window it survives.
    const rows = [
      { type: "api_calls", value: apiCalls },
      { type: "latency", value: latencyN ? Math.round(latencySum / latencyN) : 0 },
      { type: "errors", value: errors },
      { type: "uptime", value: 100 },
    ] as const;
    try {
      await Promise.all(rows.map((r) => storage.createMetric({ ...r, timestamp: now })));
    } catch (e) {
      // metrics must never take the app down — a dead DB just skips the window
      console.error("usage flush failed:", e);
    }
  }, FLUSH_MS);
  timer.unref();
}

/** One row in `activity` for a real event (login, deploy) — the activity
 *  feed's other half of "track usage". */
export async function trackActivity(
  type: "deploy" | "scale" | "alert" | "config" | "auth",
  message: string,
  severity: "info" | "warning" | "error" | "success" = "info",
) {
  try {
    await storage.createActivity({ type, message, severity, timestamp: new Date().toISOString() });
  } catch (e) {
    console.error("activity write failed:", e);
  }
}
