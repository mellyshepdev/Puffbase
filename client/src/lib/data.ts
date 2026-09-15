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

const emptyDashboard: Dashboard = {
  kpis: { totalApiCalls: 0, totalRevenue: 0, averageLatency: 0, uptime: 0, totalErrors: 0, periodDays: 30 },
  recentDeployments: [],
  recentActivity: [],
  chartData: [],
  services: { total: 0, status: { healthy: 0, degraded: 0, down: 0, idle: 0 }, items: [] },
};

/* -------------------------------------------------------------------------- *
 * Query helper: the query key doubles as the REST path (see queryClient.ts's
 * default queryFn). Renders whatever real data comes back - an empty array/
 * object is a genuine, honest empty state, not something to paper over with
 * fabricated sample data.
 * -------------------------------------------------------------------------- */

export function useApi<T>(path: string, empty: T) {
  const query = useQuery<T>({ queryKey: [path], retry: false });
  return {
    data: query.data ?? empty,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export const useDashboard = () => useApi<Dashboard>("/api/dashboard", emptyDashboard);
export const useDeployments = () => useApi<Deployment[]>("/api/deployments", []);
export const useServices = () => useApi<Service[]>("/api/services", []);
export const useActivity = () => useApi<Activity[]>("/api/activity", []);
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
