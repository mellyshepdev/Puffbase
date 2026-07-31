import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, AlertOctagon, Globe2, Timer } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartSkeleton,
  OozeTooltip,
  PageShell,
  Panel,
  SectionTitle,
  SlimeBar,
  StatCard,
} from "@/components/kit";
import { compact, mockGeo, mockLatency, shortDate, useDashboard } from "@/lib/data";

const RANGES = ["7d", "14d", "30d"] as const;
type Range = (typeof RANGES)[number];

export default function Analytics() {
  const { data, isLoading } = useDashboard();
  const [range, setRange] = useState<Range>("30d");
  const window = range === "7d" ? 7 : range === "14d" ? 14 : 30;

  const usage = data.chartData.slice(-window);
  const latency = mockLatency.slice(-window);
  const errors = usage.map((p) => ({ date: p.date, errors: p.errors ?? 0 }));
  const worstError = Math.max(...errors.map((e) => e.errors), 1);

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionTitle hint={`rolling ${window} days`}>Analytics</SectionTitle>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Traffic, latency percentiles, error budget burn and where in the world the ooze is
            flowing.
          </p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList data-testid="tabs-range">
            {RANGES.map((r) => (
              <TabsTrigger key={r} value={r} data-testid={`tab-range-${r}`} className="text-xs">
                {r}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          testId="stat-total-calls"
          label="Requests"
          value={compact(usage.reduce((s, p) => s + (p.apiCalls ?? 0), 0))}
          delta={18.2}
          icon={Activity}
          loading={isLoading}
          accent={1}
        />
        <StatCard
          testId="stat-p99"
          label="p99 latency"
          value={`${latency.length ? latency[latency.length - 1].p99 : 0}ms`}
          delta={-6.1}
          icon={Timer}
          loading={isLoading}
          accent={2}
        />
        <StatCard
          testId="stat-error-rate"
          label="Error rate"
          value={`${(
            (errors.reduce((s, e) => s + e.errors, 0) /
              Math.max(usage.reduce((s, p) => s + (p.apiCalls ?? 1), 0), 1)) *
            100
          ).toFixed(3)}%`}
          delta={-2.8}
          icon={AlertOctagon}
          loading={isLoading}
          accent={4}
        />
        <StatCard
          testId="stat-regions"
          label="Active regions"
          value={String(mockGeo.length)}
          hint="edge PoPs serving traffic"
          icon={Globe2}
          loading={isLoading}
          accent={5}
        />
      </div>

      <Panel
        testId="panel-api-usage"
        title="API usage"
        subtitle="Requests per day, all environments"
        bead
      >
        {isLoading ? (
          <ChartSkeleton height={280} />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={usage} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="usage-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                  <stop offset="60%" stopColor="hsl(var(--chart-3))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 6" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                minTickGap={20}
              />
              <YAxis
                tickFormatter={(v: number) => compact(v)}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip content={<OozeTooltip />} />
              <Area
                type="monotone"
                dataKey="apiCalls"
                name="Requests"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2.5}
                fill="url(#usage-fill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel testId="panel-latency" title="Latency percentiles" subtitle="p50 / p90 / p99 in ms">
          {isLoading ? (
            <ChartSkeleton height={250} />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={latency} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 6" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={38}
                />
                <Tooltip content={<OozeTooltip />} />
                <Line
                  type="monotone"
                  dataKey="p50"
                  name="p50"
                  dot={false}
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="p90"
                  name="p90"
                  dot={false}
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="p99"
                  name="p99"
                  dot={false}
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel testId="panel-errors" title="Error rate" subtitle="5xx responses per day" quiet>
          {isLoading ? (
            <ChartSkeleton height={250} />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={errors} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 6" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={38}
                />
                <Tooltip
                  content={<OozeTooltip />}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
                />
                <Bar dataKey="errors" name="Errors" radius={[4, 4, 0, 0]}>
                  {errors.map((e, i) => (
                    <Cell
                      key={i}
                      fill={
                        e.errors > worstError * 0.75
                          ? "hsl(0 72% 52%)"
                          : e.errors > worstError * 0.45
                            ? "hsl(38 90% 55%)"
                            : "hsl(var(--chart-1))"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      <Panel
        testId="panel-geo"
        title="Geographic distribution"
        subtitle="Share of requests by region"
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            {mockGeo.map((g) => (
              <div key={g.region} data-testid={`geo-${g.region.replace(/\s+/g, "-").toLowerCase()}`}>
                <div className="mb-1.5 flex items-baseline justify-between text-xs">
                  <span className="font-medium">{g.region}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {compact(g.requests)} · {g.share}%
                  </span>
                </div>
                <SlimeBar value={g.share * 2.4} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={mockGeo}
                layout="vertical"
                margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="region"
                  width={96}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<OozeTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                <Bar dataKey="requests" name="Requests" radius={[0, 6, 6, 0]}>
                  {mockGeo.map((_, i) => (
                    <Cell key={i} fill={`hsl(var(--chart-${(i % 5) + 1}))`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Panel>
    </PageShell>
  );
}
