import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

/* ---------------- Panel: a card with a slime lip on its top edge ---------------- */

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
  quiet = false,
  bead = false,
  testId,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  quiet?: boolean;
  bead?: boolean;
  testId?: string;
}) {
  return (
    <Card
      data-testid={testId}
      className={cn(
        "ooze-card goo-glow overflow-hidden border-card-border/80 bg-card/70 backdrop-blur-sm",
        quiet && "ooze-card-quiet",
        className,
      )}
    >
      {bead && <span className="ooze-bead" aria-hidden="true" />}
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div className="min-w-0">
            {title && <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>}
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={cn("px-5 pb-5", !title && "pt-6", bodyClassName)}>{children}</div>
    </Card>
  );
}

/* ---------------- KPI stat card ---------------- */

export function StatCard({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  loading,
  accent = 1,
  testId,
}: {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  icon: LucideIcon;
  loading?: boolean;
  accent?: 1 | 2 | 3 | 4 | 5;
  testId?: string;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card
      data-testid={testId}
      className="ooze-card goo-glow relative overflow-hidden border-card-border/80 bg-card/70 backdrop-blur-sm"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full opacity-25 blur-2xl"
        style={{ background: `hsl(var(--chart-${accent}))` }}
      />
      <div className="relative px-5 pb-5 pt-6">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </span>
          <span
            className="grid h-8 w-8 place-items-center rounded-md border border-primary/30 bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>
        {loading ? (
          <Skeleton className="mt-4 h-8 w-28" />
        ) : (
          <div className="mt-3 text-2xl font-bold leading-none tracking-tight" data-testid={testId ? `${testId}-value` : undefined}>
            {value}
          </div>
        )}
        <div className="mt-2.5 flex items-center gap-2 text-xs">
          {delta !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium",
                up
                  ? "bg-primary/15 text-primary"
                  : "bg-destructive/15 text-destructive dark:text-red-400",
              )}
            >
              {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {hint && <span className="truncate text-muted-foreground">{hint}</span>}
        </div>
      </div>
    </Card>
  );
}

/* ---------------- status primitives ---------------- */

const STATUS_TONE: Record<string, string> = {
  healthy: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  deployed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  degraded: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  "in-progress": "bg-primary/15 text-primary border-primary/35",
  info: "bg-primary/15 text-primary border-primary/35",
  idle: "bg-muted text-muted-foreground border-border",
  down: "bg-red-500/15 text-red-300 border-red-500/35",
  failed: "bg-red-500/15 text-red-300 border-red-500/35",
  error: "bg-red-500/15 text-red-300 border-red-500/35",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      data-testid={`status-${status}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        STATUS_TONE[status] ?? STATUS_TONE.idle,
        className,
      )}
    >
      <StatusDot status={status} />
      {status.replace("-", " ")}
    </span>
  );
}

export function StatusDot({ status }: { status: string }) {
  const color =
    status === "healthy" || status === "deployed" || status === "success"
      ? "bg-emerald-400"
      : status === "degraded" || status === "pending" || status === "warning"
        ? "bg-amber-400"
        : status === "down" || status === "failed" || status === "error"
          ? "bg-red-400"
          : status === "in-progress"
            ? "bg-primary"
            : "bg-muted-foreground";
  const pulse = status === "in-progress" || status === "degraded" || status === "down";
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      {pulse && (
        <span className={cn("absolute inset-0 animate-ping rounded-full opacity-70", color)} />
      )}
      <span className={cn("relative h-2 w-2 rounded-full", color)} />
    </span>
  );
}

/* ---------------- ooze-filled progress bar ---------------- */

export function SlimeBar({
  value,
  tone = "primary",
  className,
}: {
  value: number;
  tone?: "primary" | "warn" | "bad";
  className?: string;
}) {
  const fill =
    tone === "bad"
      ? "linear-gradient(90deg, hsl(0 75% 45%), hsl(340 80% 55%))"
      : tone === "warn"
        ? "linear-gradient(90deg, hsl(38 90% 50%), hsl(300 70% 55%))"
        : "linear-gradient(90deg, hsl(var(--chart-3)), hsl(var(--chart-1)) 55%, hsl(var(--chart-2)))";
  return (
    <div
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: fill }}
      />
      <div
        className="absolute inset-y-0 left-0 rounded-full opacity-60 blur-[3px]"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: fill }}
      />
    </div>
  );
}

/* ---------------- loading + empty states ---------------- */

export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {Array.from({ length: 14 }).map((_, i) => (
        <Skeleton
          key={i}
          className="flex-1 rounded-t-md"
          style={{ height: `${30 + ((i * 37) % 60)}%` }}
        />
      ))}
    </div>
  );
}

export function RowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full border border-primary/30 bg-primary/10">
        <span className="h-4 w-4 rounded-full bg-primary/70" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-sm text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ---------------- page shell ---------------- */

export function PageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
        "mx-auto w-full max-w-[1400px] space-y-6 px-5 pb-28 pt-24 md:px-8 md:pt-[132px]",
        className,
      )}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h1 className="text-xl font-bold tracking-tight">{children}</h1>
      {hint && <p className="font-mono text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ---------------- recharts tooltip ---------------- */

export function OozeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-primary/30 bg-popover/95 px-3 py-2 shadow-lg backdrop-blur">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: entry.color ?? entry.stroke }}
          />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="ml-auto font-mono font-medium">
            {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}
