import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { emitUsageEvent, lagoConfigured } from "./lago";
import { withdrawDeploymentRoute } from "./locator";
import { notify } from "./notify";

/** Usage tracking: the /api/metrics series (api_calls, latency, errors, uptime)
 *  exist but nothing wrote to them, so Analytics charted an empty store.
 *  This middleware counts every request in memory and a 60s timer flushes
 *  aggregates into `metrics` — one row per type per user per window.
 *
 *  Buckets are keyed by the caller's Keycloak sub (req.session.user.sub,
 *  populated by sessionMiddleware before this listener's finish event
 *  fires). Requests without an authenticated user — static assets, 401s,
 *  the login flow itself — are not attributed to anyone and skipped. */

const FLUSH_MS = 60_000;

// Published sites share one static host (SITE_NODE) - there is no per-tenant
// RSS to measure, so RAM is billed as a fixed reservation per live site, the
// standard PaaS "allocated memory" model. Change this constant if the per-site
// reservation changes; it is a pricing decision, not a measurement.
const RAM_MB_PER_LIVE_SITE = 128;

// Free-tier caps: accounts created with an invite code get these limits;
// crossing one starts a grace period, then live sites are suspended (their
// edge routes withdrawn). Paid accounts have no caps - overage just bills.
export const FREE_MAX_LIVE_SITES = Number(
  process.env.FREE_MAX_LIVE_SITES ?? 1,
);
const FREE_STORAGE_MB = Number(process.env.FREE_STORAGE_MB ?? 50);
const FREE_MONTH_API_CALLS = Number(process.env.FREE_MONTH_API_CALLS ?? 10_000);
const FREE_GRACE_MS =
  Number(process.env.FREE_GRACE_DAYS ?? 7) * 24 * 3_600_000;
const SITE_NODE = process.env.PUFFBASE_NODE ?? "unit7";

type Bucket = {
  apiCalls: number;
  errors: number;
  latencySum: number;
  latencyN: number;
};

const buckets = new Map<string, Bucket>();

export function usageTracker(app: Express) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
      const owner = req.session?.user?.sub;
      if (!owner) return;
      const acc = buckets.get(owner) ?? {
        apiCalls: 0,
        errors: 0,
        latencySum: 0,
        latencyN: 0,
      };
      if (req.path.startsWith("/api")) acc.apiCalls += 1;
      if (res.statusCode >= 500) acc.errors += 1;
      acc.latencySum += Date.now() - start;
      acc.latencyN += 1;
      buckets.set(owner, acc);
    });
    next();
  });

  const timer = setInterval(async () => {
    const now = new Date().toISOString();
    const pending: { owner: string; type: string; value: number }[] = [];
    const metered: { owner: string; count: number }[] = [];

    buckets.forEach((acc, owner) => {
      // `uptime` is a percent: summarizeMetrics averages the column /100, so a
      // live process writes 100 for every window it survives.
      pending.push(
        { owner, type: "api_calls", value: acc.apiCalls },
        {
          owner,
          type: "latency",
          value: acc.latencyN ? Math.round(acc.latencySum / acc.latencyN) : 0,
        },
        { owner, type: "errors", value: acc.errors },
        { owner, type: "uptime", value: 100 },
      );
      if (acc.apiCalls > 0) metered.push({ owner, count: acc.apiCalls });
    });
    buckets.clear();

    if (pending.length > 0) {
      try {
        await Promise.all(
          pending.map((r) =>
            storage.createMetric(r.owner, {
              type: r.type as "api_calls" | "latency" | "errors" | "uptime",
              value: r.value,
              timestamp: now,
            }),
          ),
        );
      } catch (e) {
        // metrics must never take the app down — a dead DB just skips the window
        console.error("usage flush failed:", e);
      }
    }

    // Lago metering, once per window for every owner with a Lago customer
    // (i.e. subscribed a builder project). API calls only emit when nonzero,
    // but storage and RAM keep emitting while the owner is idle - the
    // reservation is consumed whether or not requests arrive. This runs
    // unconditionally: an idle account still owes storage/RAM.
    if (lagoConfigured()) {
      try {
        const callsBy = new Map(metered.map((m) => [m.owner, m.count]));
        const mbHoursPerWindow =
          RAM_MB_PER_LIVE_SITE * (FLUSH_MS / 3_600_000);
        for (const owner of await storage.listLagoCustomerOwners()) {
          const stats = await storage.getOwnerBillingStats(owner);
          const calls = callsBy.get(owner) ?? 0;
          if (calls > 0) {
            emitUsageEvent(owner, "api_calls", { count: calls }).catch((e) =>
              console.error("lago event failed:", e),
            );
          }
          emitUsageEvent(owner, "storage_mb", {
            mb: +(stats.storageBytes / 1048576).toFixed(3),
          }).catch((e) => console.error("lago event failed:", e));
          if (stats.liveDeployments > 0) {
            emitUsageEvent(owner, "ram_mb_hours", {
              mb_hours: +(stats.liveDeployments * mbHoursPerWindow).toFixed(4),
            }).catch((e) => console.error("lago event failed:", e));
          }

          await enforceFreeTier(owner, stats);
        }
      } catch (e) {
        console.error("lago metering failed:", e);
      }
    }
  }, FLUSH_MS);
  timer.unref();
}

/** One row in `activity` for a real event (login, deploy) — the activity
 *  feed's other half of "track usage". Scoped to the acting user's sub. */
export async function trackActivity(
  owner: string,
  type: "deploy" | "scale" | "alert" | "config" | "auth",
  message: string,
  severity: "info" | "warning" | "error" | "success" = "info",
) {
  try {
    await storage.createActivity(owner, {
      type,
      message,
      severity,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("activity write failed:", e);
  }
}

/**
 * Grace-then-suspend for the invite-code free tier. Called from the flush for
 * every Lago-linked owner; returns immediately for paid/untiered accounts -
 * their overage bills instead of cutting off.
 *
 * Crossing a cap logs one "billing:" alert; its timestamp starts the grace
 * window. Still over when the window ends -> every live site goes
 * "suspended" and its edge route is withdrawn from the locator.
 */
async function enforceFreeTier(
  owner: string,
  stats: { storageBytes: number; liveDeployments: number; isFree: boolean },
): Promise<void> {
  if (!stats.isFree) return;

  const monthlyCalls = await storage.getMonthlyApiCalls(owner);
  const over: string[] = [];
  if (stats.liveDeployments > FREE_MAX_LIVE_SITES)
    over.push(`live sites ${stats.liveDeployments}/${FREE_MAX_LIVE_SITES}`);
  if (stats.storageBytes > FREE_STORAGE_MB * 1048576)
    over.push(
      `storage ${(stats.storageBytes / 1048576).toFixed(1)}/${FREE_STORAGE_MB}MB`,
    );
  if (monthlyCalls > FREE_MONTH_API_CALLS)
    over.push(`api calls ${monthlyCalls}/${FREE_MONTH_API_CALLS} this month`);
  if (over.length === 0) return;

  const alert = await storage.latestBillingAlert(owner);
  const graceStart = alert ? Date.parse(alert.timestamp) : Date.now();

  if (!alert) {
    trackActivity(
      owner,
      "alert",
      `billing: free-tier limit exceeded (${over.join(", ")}) - ` +
        `sites suspend after the grace period`,
      "warning",
    );
    notify(
      `Puffbase: ${owner} exceeded free-tier limits (${over.join(", ")})`,
    ).catch(() => {});
    return;
  }

  if (Date.now() - graceStart < FREE_GRACE_MS) return;

  const sites = await storage.listLiveProjects(owner);
  for (const site of sites) {
    await storage
      .updateBuilderProject(owner, site.id, { status: "suspended" })
      .catch(() => {});
    if (site.subdomain) {
      await withdrawDeploymentRoute(SITE_NODE, site.subdomain).catch((e) =>
        console.error("route withdraw failed:", e),
      );
    }
  }
  if (sites.length > 0) {
    trackActivity(
      owner,
      "alert",
      `billing: suspended ${sites.length} site(s) - free-tier limits ` +
        `still exceeded after grace`,
      "error",
    );
    notify(
      `Puffbase: ${owner} suspended ${sites.length} site(s) over ` +
        `free-tier limits`,
    ).catch(() => {});
  }
}
