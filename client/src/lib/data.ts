import { useQuery } from "@tanstack/react-query";
import type { Activity, Deployment, Metric, Service } from "@shared/schema";

/* -------------------------------------------------------------------------- *
 * Shapes returned by the Puffbase API (see server/routes.ts)
 * -------------------------------------------------------------------------- */

export type Kpis = {
  totalApiCalls: number;
  totalRevenue: number;
  averageLatency: number;
  uptime: number;
  totalErrors: number;
  periodDays: number;
};

export type ChartPoint = {
  date: string;
  apiCalls?: number;
  revenue?: number;
  latency?: number;
  errors?: number;
  uptime?: number;
};

export type Dashboard = {
  kpis: Kpis;
  recentDeployments: Deployment[];
  recentActivity: Activity[];
  chartData: ChartPoint[];
  services: {
    total: number;
    status: { healthy: number; degraded: number; down: number; idle: number };
    items: Service[];
  };
};

/* -------------------------------------------------------------------------- *
 * Fallback data — used while the API is unreachable or empty so the
 * dashboard never renders a hollow shell.
 * -------------------------------------------------------------------------- */

const day = (offset: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString();
};

export const mockChartData: ChartPoint[] = Array.from({ length: 30 }, (_, i) => {
  const t = i / 29;
  return {
    date: day(29 - i).slice(0, 10),
    apiCalls: Math.round(820_000 + t * 640_000 + Math.sin(i / 2.1) * 74_000),
    revenue: Math.round(3_100 + t * 2_450 + Math.cos(i / 3.4) * 260),
    latency: Math.round(112 - t * 26 + Math.sin(i / 1.7) * 9),
    errors: Math.max(2, Math.round(46 - t * 28 + Math.cos(i / 1.3) * 8)),
    uptime: Number((99.94 + Math.sin(i / 4) * 0.04).toFixed(3)),
  };
});

export const mockKpis: Kpis = {
  totalApiCalls: mockChartData.reduce((s, p) => s + (p.apiCalls ?? 0), 0),
  totalRevenue: mockChartData.reduce((s, p) => s + (p.revenue ?? 0), 0),
  averageLatency: 94,
  uptime: 99.982,
  totalErrors: 612,
  periodDays: 30,
};

export const mockServices: Service[] = [
  { id: 1, name: "goo-gateway", status: "healthy", health: 99, requests: 1_284_500, latency: 42, region: "us-east-1", url: "https://gateway.puffbase.dev", createdAt: day(180) },
  { id: 2, name: "slime-auth", status: "healthy", health: 97, requests: 642_180, latency: 61, region: "us-east-1", url: "https://auth.puffbase.dev", createdAt: day(174) },
  { id: 3, name: "ooze-queue", status: "degraded", health: 74, requests: 388_940, latency: 187, region: "eu-west-1", url: "https://queue.puffbase.dev", createdAt: day(150) },
  { id: 4, name: "puff-storage", status: "healthy", health: 96, requests: 918_620, latency: 55, region: "us-west-2", url: "https://storage.puffbase.dev", createdAt: day(140) },
  { id: 5, name: "drip-edge-cdn", status: "healthy", health: 99, requests: 3_401_770, latency: 19, region: "global", url: "https://cdn.puffbase.dev", createdAt: day(120) },
  { id: 6, name: "vat-postgres", status: "healthy", health: 93, requests: 512_400, latency: 78, region: "us-east-1", url: null, createdAt: day(118) },
  { id: 7, name: "sludge-workers", status: "idle", health: 88, requests: 74_120, latency: 132, region: "ap-south-1", url: null, createdAt: day(96) },
  { id: 8, name: "residue-analytics", status: "down", health: 21, requests: 12_880, latency: 940, region: "eu-central-1", url: null, createdAt: day(64) },
];

export const mockDeployments: Deployment[] = [
  { id: 1, name: "goo-gateway", status: "deployed", environment: "production", version: "v4.12.0", serviceId: 1, lastDeployed: day(0), commitSha: "9f2ac31", duration: 184 },
  { id: 2, name: "slime-auth", status: "deployed", environment: "production", version: "v2.8.3", serviceId: 2, lastDeployed: day(1), commitSha: "1c40be7", duration: 121 },
  { id: 3, name: "ooze-queue", status: "in-progress", environment: "staging", version: "v1.19.0-rc2", serviceId: 3, lastDeployed: day(0), commitSha: "77de0a4", duration: 96 },
  { id: 4, name: "puff-storage", status: "deployed", environment: "production", version: "v6.1.2", serviceId: 4, lastDeployed: day(2), commitSha: "b81f5c9", duration: 240 },
  { id: 5, name: "drip-edge-cdn", status: "deployed", environment: "production", version: "v9.0.4", serviceId: 5, lastDeployed: day(3), commitSha: "0ea7712", duration: 63 },
  { id: 6, name: "vat-postgres", status: "pending", environment: "staging", version: "v3.4.0", serviceId: 6, lastDeployed: day(1), commitSha: "5ab9d20", duration: null },
  { id: 7, name: "sludge-workers", status: "failed", environment: "development", version: "v0.9.7", serviceId: 7, lastDeployed: day(4), commitSha: "e34c0f8", duration: 42 },
  { id: 8, name: "residue-analytics", status: "failed", environment: "production", version: "v1.2.1", serviceId: 8, lastDeployed: day(5), commitSha: "aa19b6d", duration: 78 },
  { id: 9, name: "goo-gateway", status: "deployed", environment: "development", version: "v4.13.0-dev", serviceId: 1, lastDeployed: day(0), commitSha: "cc7712f", duration: 88 },
  { id: 10, name: "membrane-api", status: "deployed", environment: "staging", version: "v0.4.2", serviceId: null, lastDeployed: day(6), commitSha: "3fd8a01", duration: 133 },
];

export const mockActivity: Activity[] = [
  { id: 1, type: "deploy", message: "goo-gateway v4.12.0 shipped to production", severity: "success", timestamp: day(0), userId: 1 },
  { id: 2, type: "alert", message: "ooze-queue p99 latency above 180ms for 6 minutes", severity: "warning", timestamp: day(0), userId: null },
  { id: 3, type: "scale", message: "drip-edge-cdn scaled 12 → 18 replicas", severity: "info", timestamp: day(0), userId: 2 },
  { id: 4, type: "config", message: "Rotated PUFF_SIGNING_KEY for slime-auth", severity: "info", timestamp: day(1), userId: 1 },
  { id: 5, type: "alert", message: "residue-analytics health check failing", severity: "error", timestamp: day(1), userId: null },
  { id: 6, type: "auth", message: "New service token issued to viscosity-ci", severity: "info", timestamp: day(2), userId: 3 },
  { id: 7, type: "deploy", message: "puff-storage v6.1.2 rollout complete", severity: "success", timestamp: day(2), userId: 2 },
  { id: 8, type: "scale", message: "sludge-workers drained to idle pool", severity: "info", timestamp: day(3), userId: null },
];

export const mockDashboard: Dashboard = {
  kpis: mockKpis,
  recentDeployments: mockDeployments.slice(0, 6),
  recentActivity: mockActivity,
  chartData: mockChartData,
  services: {
    total: mockServices.length,
    status: {
      healthy: mockServices.filter((s) => s.status === "healthy").length,
      degraded: mockServices.filter((s) => s.status === "degraded").length,
      down: mockServices.filter((s) => s.status === "down").length,
      idle: mockServices.filter((s) => s.status === "idle").length,
    },
    items: mockServices,
  },
};

export const mockGeo = [
  { region: "North America", share: 41, requests: 1_842_000 },
  { region: "Europe", share: 27, requests: 1_213_400 },
  { region: "Asia Pacific", share: 19, requests: 854_100 },
  { region: "South America", share: 8, requests: 359_600 },
  { region: "Africa & ME", share: 5, requests: 224_800 },
];

export const mockLatency = mockChartData.map((p, i) => ({
  date: p.date,
  p50: Math.round((p.latency ?? 90) * 0.62 + Math.sin(i / 2) * 3),
  p90: Math.round((p.latency ?? 90) * 1.18 + Math.cos(i / 2.4) * 5),
  p99: Math.round((p.latency ?? 90) * 2.35 + Math.sin(i / 1.5) * 14),
}));

/* -------------------------------------------------------------------------- *
 * Query helper: always resolves to something renderable.
 * -------------------------------------------------------------------------- */

function isEmpty(value: unknown) {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function useApi<T>(path: string, fallback: T) {
  const query = useQuery<T>({ queryKey: [path], retry: false });
  const data = isEmpty(query.data) ? fallback : (query.data as T);
  return {
    data,
    isLoading: query.isLoading,
    isFallback: isEmpty(query.data),
    error: query.error,
  };
}

export const useDashboard = () => useApi<Dashboard>("/api/dashboard", mockDashboard);
export const useDeployments = () => useApi<Deployment[]>("/api/deployments", mockDeployments);
export const useServices = () => useApi<Service[]>("/api/services", mockServices);
export const useActivity = () => useApi<Activity[]>("/api/activity", mockActivity);
export const useMetrics = () => useApi<Metric[]>("/api/metrics", []);

/* -------------------------------------------------------------------------- *
 * Formatters
 * -------------------------------------------------------------------------- */

export function compact(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function shortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
