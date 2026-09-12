import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity as ActivityIcon,
  AlertTriangle,
  ArrowUpRight,
  DollarSign,
  Gauge,
  Rocket,
  ShieldCheck,
  Timer,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartSkeleton,
  OozeTooltip,
  Panel,
  PageShell,
  RowSkeleton,
  SectionTitle,
  SlimeBar,
  StatCard,
  StatusPill,
} from "@/components/kit";
import { compact, money, relativeTime, shortDate, useDashboard } from "@/lib/data";

const ENV_COLOR: Record<string, string> = {
  production: "hsl(var(--chart-1))",
  staging: "hsl(var(--chart-2))",
  development: "hsl(var(--chart-3))",
};

export default function Overview() {
  const { data, isLoading } = useDashboard();
  const chart = data.chartData.slice(-30);

  const deploysByDay = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    const rows = days.map((date) => ({
      date,
      production: 0,
      staging: 0,
      development: 0,
    }));
    for (const dep of data.recentDeployments) {
      const key = (dep.lastDeployed ?? "").slice(0, 10);
      const row = rows.find((r) => r.date === key);
      if (row) row[dep.environment] += 1;
    }
    return rows;
  }, [data.recentDeployments]);

  const activeDeploys = data.recentDeployments.filter((d) => d.status === "deployed").length;
  const services = data.services.items;

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionTitle hint={`last ${data.kpis.periodDays} days`}>Platform Overview</SectionTitle>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Everything oozing through Puffbase right now — deploys, revenue, traffic and the
            health of every service in the vat.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild data-testid="link-view-deployments">
            <Link href="/deployments">
              All deployments <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ---------- KPI row ---------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          testId="stat-active-deployments"
          label="Active deployments"
          value={String(activeDeploys || data.recentDeployments.length)}
          delta={12.5}
          hint="across 3 environments"
          icon={Rocket}
          loading={isLoading}
          accent={1}
        />
        <StatCard
          testId="stat-monthly-revenue"
          label="Monthly revenue"
          value={money(data.kpis.totalRevenue)}
          delta={8.4}
          hint="MRR, net of credits"
          icon={DollarSign}
          loading={isLoading}
          accent={2}
        />
        <StatCard
          testId="stat-api-calls"
          label="API calls"
          value={compact(data.kpis.totalApiCalls)}
          delta={23.9}
          hint={`${data.kpis.averageLatency}ms avg latency`}
          icon={Zap}
          loading={isLoading}
          accent={3}
        />
        <StatCard
          testId="stat-uptime"
          label="Uptime"
          value={`${data.kpis.uptime.toFixed(3)}%`}
          delta={-0.4}
          hint={`${data.kpis.totalErrors.toLocaleString()} errors`}
          icon={ShieldCheck}
          loading={isLoading}
          accent={4}
        />
      </div>

      {/* ---------- charts ---------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          testId="panel-revenue"
          title="Revenue flow"
          subtitle="Daily recognized revenue, last 30 days"
          className="lg:col-span-2"
          bead
          action={
            <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
              +8.4% MoM
            </span>
          }
        >
          {isLoading ? (
            <ChartSkeleton height={260} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.75} />
                    <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="calls-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
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
                  yAxisId="rev"
                  tickFormatter={(v: number) => compact(v)}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <YAxis
                  yAxisId="calls"
                  orientation="right"
                  tickFormatter={(v: number) => compact(v)}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip content={<OozeTooltip />} />
                <Area
                  yAxisId="rev"
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2.5}
                  fill="url(#rev-fill)"
                />
                <Area
                  yAxisId="calls"
                  type="monotone"
                  dataKey="apiCalls"
                  name="API calls"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="url(#calls-fill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel testId="panel-deploy-volume" title="Deploy volume" subtitle="Last 7 days by environment">
          {isLoading ? (
            <ChartSkeleton height={260} />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deploysByDay} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 6" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) =>
                    new Date(v).toLocaleDateString("en-US", { weekday: "narrow" })
                  }
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={34}
                />
                <Tooltip content={<OozeTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                <Legend
                  wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                  iconType="circle"
                  iconSize={7}
                />
                <Bar dataKey="production" stackId="a" fill={ENV_COLOR.production} radius={[0, 0, 0, 0]} />
                <Bar dataKey="staging" stackId="a" fill={ENV_COLOR.staging} />
                <Bar dataKey="development" stackId="a" fill={ENV_COLOR.development} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* ---------- activity + service status ---------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          testId="panel-activity"
          title="Recent activity"
          subtitle="Live platform event stream"
          quiet
        >
          {isLoading ? (
            <RowSkeleton rows={6} />
          ) : (
            <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-gradient-to-b before:from-primary/60 before:via-primary/25 before:to-transparent">
              {data.recentActivity.slice(0, 7).map((event) => (
                <li
                  key={event.id}
                  className="relative flex gap-3 pl-0"
                  data-testid={`activity-${event.id}`}
                >
                  <span className="relative z-[1] mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-primary/30 bg-card">
                    <ActivityGlyph type={event.type} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-snug">{event.message}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusPill status={event.severity} />
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {relativeTime(event.timestamp)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel
          testId="panel-service-status"
          title="Service status"
          subtitle={`${data.services.status.healthy} healthy · ${data.services.status.degraded} degraded · ${data.services.status.down} down`}
          className="lg:col-span-2"
          bodyClassName="px-0 pb-2"
          action={
            <Button variant="ghost" size="sm" asChild data-testid="link-view-services">
              <Link href="/services">Open</Link>
            </Button>
          }
        >
          {isLoading ? (
            <div className="px-5">
              <RowSkeleton rows={5} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5 font-mono text-[10px] uppercase tracking-wider">
                    Service
                  </TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                    Health
                  </TableHead>
                  <TableHead className="text-right font-mono text-[10px] uppercase tracking-wider">
                    Req / 24h
                  </TableHead>
                  <TableHead className="pr-5 text-right font-mono text-[10px] uppercase tracking-wider">
                    p50
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.slice(0, 7).map((service) => (
                  <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                    <TableCell className="pl-5">
                      <div className="font-mono text-xs font-medium">{service.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {service.region}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusPill status={service.status} />
                    </TableCell>
                    <TableCell className="w-32">
                      <div className="flex items-center gap-2">
                        <SlimeBar
                          value={service.health}
                          tone={service.health > 85 ? "primary" : service.health > 50 ? "warn" : "bad"}
                          className="h-1.5 w-16"
                        />
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {service.health}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {compact(service.requests)}
                    </TableCell>
                    <TableCell className="pr-5 text-right font-mono text-xs">
                      {service.latency}ms
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}

function ActivityGlyph({ type }: { type: string }) {
  const cls = "h-3.5 w-3.5 text-primary";
  if (type === "deploy") return <Rocket className={cls} />;
  if (type === "alert") return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
  if (type === "scale") return <Gauge className={cls} />;
  if (type === "config") return <Timer className={cls} />;
  return <ActivityIcon className={cls} />;
}
