import { useMemo, useState } from "react";
import type { Service } from "@shared/schema";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ExternalLink, Globe2, Search, Signal, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EmptyState,
  PageShell,
  SectionTitle,
  SlimeBar,
  StatusPill,
} from "@/components/kit";
import { compact, useServices } from "@/lib/data";

function sparkline(seed: number) {
  return Array.from({ length: 20 }, (_, i) => ({
    i,
    v: 40 + Math.sin((i + seed) / 2.1) * 18 + ((seed * (i + 3)) % 17),
  }));
}

export default function Services() {
  const { data, isLoading, isFallback } = useServices();
  const [query, setQuery] = useState("");

  const services = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((s) => !q || s.name.toLowerCase().includes(q) || s.region.includes(q));
  }, [data, query]);

  const totals = useMemo(
    () => ({
      requests: data.reduce((s, x) => s + x.requests, 0),
      latency: data.length ? Math.round(data.reduce((s, x) => s + x.latency, 0) / data.length) : 0,
      healthy: data.filter((s) => s.status === "healthy").length,
    }),
    [data],
  );

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionTitle hint={`${data.length} services`}>Services</SectionTitle>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {totals.healthy} of {data.length} healthy · {compact(totals.requests)} requests in the
            last 24h · {totals.latency}ms mean latency.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFallback && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-amber-300">
              sample data
            </span>
          )}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="input-filter-services"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter services"
              className="h-9 w-56 bg-card/60 pl-8 text-xs backdrop-blur"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="space-y-4 p-5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-16 w-full" />
            </Card>
          ))}
        </div>
      ) : services.length === 0 ? (
        <EmptyState title="No services match that filter" hint="Try another name or region." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((service, idx) => (
            <ServiceCard key={service.id} service={service} idx={idx} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function ServiceCard({ service, idx }: { service: Service; idx: number }) {
  const tone = service.health > 85 ? "primary" : service.health > 50 ? "warn" : "bad";
  const spark = useMemo(() => sparkline(service.id + idx), [service.id, idx]);

  return (
    <Card
      data-testid={`card-service-${service.id}`}
      className="ooze-card goo-glow group relative overflow-hidden border-card-border/80 bg-card/70 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5"
    >
      <span className="ooze-bead" style={{ animationDelay: `${(idx % 5) * 1.3}s` }} aria-hidden="true" />
      <div className="px-5 pb-5 pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-mono text-sm font-semibold" data-testid={`text-service-name-${service.id}`}>
              {service.name}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
              <Globe2 className="h-3 w-3" />
              {service.region}
            </div>
          </div>
          <StatusPill status={service.status} />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Health</span>
            <span className={tone === "bad" ? "text-red-400" : tone === "warn" ? "text-amber-300" : "text-primary"}>
              {service.health}%
            </span>
          </div>
          <SlimeBar value={service.health} tone={tone} />
        </div>

        <div className="mt-4 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${service.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke="hsl(var(--chart-1))"
                strokeWidth={1.75}
                fill={`url(#spark-${service.id})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/60 pt-3">
          <Metric icon={Signal} label="Requests / 24h" value={compact(service.requests)} />
          <Metric icon={Timer} label="p50 latency" value={`${service.latency}ms`} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-[11px]"
            data-testid={`button-inspect-${service.id}`}
          >
            Inspect
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px]"
            disabled={!service.url}
            data-testid={`button-open-${service.id}`}
            asChild={Boolean(service.url)}
          >
            {service.url ? (
              <a href={service.url} target="_blank" rel="noreferrer">
                Endpoint <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            ) : (
              <span>Internal</span>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Signal;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-0.5 font-mono text-sm font-semibold">{value}</div>
    </div>
  );
}
