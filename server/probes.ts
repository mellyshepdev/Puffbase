// Platform health prober: the `services` table and the dashboard's service
// panel previously had no writer at all, so status was always empty. This
// loop measures the things tenants actually depend on - the platform's own
// public surfaces, the database, and every live tenant deployment - and
// upserts one row per target (owner 'platform') with the measured status,
// real latency, and a cumulative probe count.
//
// Status semantics: any HTTP response < 500 means the service is answering
// (401/404 still prove reachability), 5xx means answering-but-broken, and a
// network failure or timeout means down. The database probe is a real
// `select 1` round trip through the app's own pool.
import { sql } from "drizzle-orm";
import { db, storage } from "./storage";
import { deployDomain } from "./locator";

const PROBE_MS = Number(process.env.PUFFBASE_PROBE_MS ?? 120_000);
const TIMEOUT_MS = 8_000;

type Target = { name: string; url: string; region: string };

function platformTargets(): Target[] {
  const targets: Target[] = [
    { name: "console", url: "https://puff-base.com/", region: "platform" },
    { name: "admin-console", url: "https://admin.puff-base.com/", region: "platform" },
    { name: "user-dashboard", url: "https://dash.puff-base.com/", region: "platform" },
    { name: "depot", url: "https://git.puff-base.com/", region: "platform" },
  ];
  const locatorUrl = (process.env.LOCATOR_URL ?? "").replace(/\/$/, "");
  if (locatorUrl) targets.push({ name: "locator", url: `${locatorUrl}/`, region: "platform" });
  const lagoUrl = (process.env.LAGO_API_URL ?? "").replace(/\/$/, "");
  if (lagoUrl) targets.push({ name: "lago", url: `${lagoUrl}/`, region: "platform" });
  return targets;
}

async function tenantTargets(): Promise<Target[]> {
  const targets: Target[] = [];
  const domain = deployDomain();
  try {
    const sites = await storage.listAllLiveProjects();
    for (const site of sites) {
      const url = site.url ?? (site.subdomain && domain ? `https://${site.subdomain}.${domain}` : null);
      if (url) targets.push({ name: `site:${site.subdomain ?? site.id}`, url, region: "tenant" });
    }
  } catch (e) {
    console.error("probe: live project list failed:", e);
  }
  try {
    const deployments = await storage.listDeploymentsAll();
    for (const d of deployments) {
      if (d.url) targets.push({ name: `deploy:${d.subdomain ?? d.name}`, url: d.url, region: "tenant" });
    }
  } catch (e) {
    console.error("probe: deployment list failed:", e);
  }
  return targets;
}

type ProbeResult = {
  status: "healthy" | "degraded" | "down" | "idle";
  health: number;
  latency: number;
};

async function probeHttp(url: string): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latency = Date.now() - start;
    return res.status < 500
      ? { status: "healthy", health: 100, latency }
      : { status: "degraded", health: 60, latency };
  } catch {
    return { status: "down", health: 0, latency: Date.now() - start };
  }
}

async function probeDatabase(): Promise<ProbeResult> {
  const start = Date.now();
  try {
    await db.execute(sql`select 1`);
    return { status: "healthy", health: 100, latency: Date.now() - start };
  } catch {
    return { status: "down", health: 0, latency: Date.now() - start };
  }
}

async function runOnce() {
  const targets: Target[] = [
    { name: "database", url: "", region: "platform" },
    ...platformTargets(),
    ...(await tenantTargets()),
  ];
  // Probe count is cumulative per row - read current values once so each
  // tick increments rather than restarts.
  const existing = new Map(
    (await storage.listServicesAll().catch(() => [])).map((s) => [s.name, s]),
  );
  for (const target of targets) {
    const result =
      target.name === "database" ? await probeDatabase() : await probeHttp(target.url);
    await storage
      .upsertService("platform", target.name, {
        name: target.name,
        status: result.status,
        health: result.health,
        requests: (existing.get(target.name)?.requests ?? 0) + 1,
        latency: result.latency,
        region: target.region,
        url: target.url || null,
      })
      .catch((e) => console.error("probe: service upsert failed:", e));
  }
}

export function startProbes() {
  // First pass after a short settle delay, then on the interval. Errors are
  // contained per-target inside runOnce - a dead dependency must never take
  // the prober (or the app) down.
  const tick = () => runOnce().catch((e) => console.error("probe tick failed:", e));
  const boot = setTimeout(tick, 15_000);
  boot.unref();
  const timer = setInterval(tick, PROBE_MS);
  timer.unref();
}
