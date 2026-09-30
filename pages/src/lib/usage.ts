// Tenant usage streaming: the express app's tracker (server/usage.ts) only
// sees requests that reach it - every /api route on this dashboard (repos,
// issues, pipelines, deployments, accounts, ...) runs here and was invisible
// to platform analytics. This mirrors that pattern: count authenticated API
// calls per Keycloak sub in memory, flush into the shared `metrics` table
// every 60s. The admin dashboard aggregates across all owners, so this is
// what makes tenant traffic show up.
import { db } from "@/db";
import { metrics } from "@/db/schema";

const FLUSH_MS = 60_000;

// Module scope persists for the life of the Next server process; globalThis
// guards against dev-mode module re-evaluation creating duplicate counters.
const globalStore = globalThis as unknown as {
  __puffbaseUsage?: { buckets: Map<string, number>; timer?: NodeJS.Timeout };
};
const store: { buckets: Map<string, number>; timer?: NodeJS.Timeout } =
  (globalStore.__puffbaseUsage ??= { buckets: new Map() });

/** One authenticated API call by `sub`. Called from requestAccount - every
 *  route handler that resolves an account gets counted, session or PAT. */
export function trackApiCall(sub: string) {
  store.buckets.set(sub, (store.buckets.get(sub) ?? 0) + 1);
  if (!store.timer) {
    store.timer = setInterval(flush, FLUSH_MS);
    store.timer.unref?.();
  }
}

async function flush() {
  if (store.buckets.size === 0) return;
  const now = new Date().toISOString();
  const pending = Array.from(store.buckets.entries()).map(
    ([owner, calls]) => ({ owner, type: "api_calls", value: calls, timestamp: now }),
  );
  store.buckets.clear();
  try {
    await db.insert(metrics).values(pending);
  } catch (e) {
    // Metrics must never take the app down - a dead DB just loses the window.
    console.error("usage flush failed:", e);
  }
}
