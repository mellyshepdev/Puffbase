import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  CreditCard,
  ExternalLink,
  Globe2,
  Receipt,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, PageShell, SectionTitle, StatusPill } from "@/components/kit";
import type { BuilderProject } from "@shared/schema";

type BuilderStatus = {
  llm: boolean;
  model: string;
  lago: boolean;
  stripe: boolean;
  mail: boolean;
  deployDomain: string | null;
};

const PLAN_LABEL: Record<string, string> = {
  monthly: "Monthly — $5/mo per site",
  yearly: "Yearly — $50/yr per site",
  business: "Business — $25/mo flat",
  free: "Free tier",
};

export default function Payment() {
  const projects = useQuery<BuilderProject[]>({
    queryKey: ["/api/builder/projects"],
  });
  const status = useQuery<BuilderStatus>({
    queryKey: ["/api/builder/status"],
    retry: false,
  });

  const list = projects.data ?? [];
  const hasCard = list.some((p) => p.stripeCustomerId);
  const subs = list.filter((p) => p.lagoSubscriptionId);

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionTitle hint="plans · cards · subscriptions">Payment & Billing</SectionTitle>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            What's actually on file — the card Stripe holds, the subscription Lago meters,
            and the plan each of your sites is on.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild data-testid="link-manage-billing">
          <a href="https://puff-base.store/plan" target="_blank" rel="noreferrer">
            Manage membership <ExternalLink className="ml-1 h-3.5 w-3.5" />
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium">
            <CreditCard className="h-4 w-4 text-primary" /> Card on file
          </div>
          <div className="mt-3 text-xl font-bold">{hasCard ? "Yes" : "None"}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasCard
              ? "A payment method is stored via Stripe's hosted checkout."
              : "The Site Builder collects one before a paid generation runs."}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium">
            <BadgeCheck className="h-4 w-4 text-primary" /> Active subscriptions
          </div>
          <div className="mt-3 text-xl font-bold">{subs.length}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Metered through Lago — one subscription covers its billing terms.
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Receipt className="h-4 w-4 text-primary" /> Billing backend
          </div>
          <div className="mt-3 space-y-1 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">stripe</span>
              <span>{status.data ? (status.data.stripe ? "configured" : "off") : "…"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">lago</span>
              <span>{status.data ? (status.data.lago ? "configured" : "off") : "…"}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Site plans</h3>
        </div>
        {projects.isLoading ? (
          <div className="p-5">
            <Skeleton className="h-20 w-full" />
          </div>
        ) : list.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No sites yet"
              hint="Plans attach per site — build one in the Site Builder to pick a plan."
            />
            <div className="flex justify-center pb-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/builder">Open Site Builder</Link>
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5 font-mono text-[10px] uppercase tracking-wider">Site</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-wider">Tier</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-wider">Plan</TableHead>
                <TableHead className="font-mono text-[10px] uppercase tracking-wider">Card</TableHead>
                <TableHead className="pr-5 font-mono text-[10px] uppercase tracking-wider">Subscription</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => (
                <TableRow key={p.id} data-testid={`row-billing-${p.id}`}>
                  <TableCell className="pl-5">
                    <Link href={`/builder/${p.id}`} className="flex items-center gap-2 text-xs font-medium hover:text-primary">
                      <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusPill status={p.status} />
                  </TableCell>
                  <TableCell className="font-mono text-[11px] capitalize text-muted-foreground">
                    {p.tier ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.plan ? (PLAN_LABEL[p.plan] ?? p.plan) : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {p.stripeCustomerId ? "on file" : "—"}
                  </TableCell>
                  <TableCell className="pr-5 font-mono text-[11px] text-muted-foreground">
                    {p.lagoSubscriptionId ? `${p.lagoSubscriptionId.slice(0, 14)}…` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </PageShell>
  );
}
