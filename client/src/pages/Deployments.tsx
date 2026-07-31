import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Deployment } from "@shared/schema";
import {
  GitCommitHorizontal,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Search,
  Timer,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EmptyState,
  PageShell,
  Panel,
  RowSkeleton,
  SectionTitle,
  StatusPill,
} from "@/components/kit";
import { relativeTime, useDeployments } from "@/lib/data";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const FILTERS = ["all", "production", "staging", "development"] as const;
type Filter = (typeof FILTERS)[number];

export default function Deployments() {
  const { data, isLoading, isFallback } = useDeployments();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const redeploy = useMutation({
    mutationFn: async (deployment: Deployment) => {
      const res = await apiRequest("PATCH", `/api/deployments/${deployment.id}`, {
        status: "in-progress",
      });
      return res.json();
    },
    onSuccess: (_data, deployment) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Redeploy started",
        description: `${deployment.name} ${deployment.version} is oozing out again.`,
      });
    },
    onError: (_error, deployment) =>
      toast({
        variant: "destructive",
        title: "Redeploy failed",
        description: `Could not restart ${deployment.name}.`,
      }),
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter(
      (d) =>
        (filter === "all" || d.environment === filter) &&
        (!q || d.name.toLowerCase().includes(q) || d.version.toLowerCase().includes(q)),
    );
  }, [data, filter, query]);

  const counts = useMemo(
    () => ({
      all: data.length,
      production: data.filter((d) => d.environment === "production").length,
      staging: data.filter((d) => d.environment === "staging").length,
      development: data.filter((d) => d.environment === "development").length,
    }),
    [data],
  );

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionTitle hint={`${data.length} total`}>Deployments</SectionTitle>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Every rollout across the vat, newest first. Redeploy or roll back without leaving
            the page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="input-filter-deployments"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name or version"
              className="h-9 w-56 bg-card/60 pl-8 text-xs backdrop-blur"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            data-testid="button-refresh-deployments"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/deployments"] })}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      <Panel testId="panel-deployments" bodyClassName="px-0 pb-0" quiet>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4 pt-1">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList data-testid="tabs-environment">
              {FILTERS.map((f) => (
                <TabsTrigger
                  key={f}
                  value={f}
                  data-testid={`tab-${f}`}
                  className="gap-1.5 text-xs capitalize"
                >
                  {f}
                  <span className="font-mono text-[10px] text-muted-foreground">{counts[f]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {isFallback && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-amber-300">
              sample data
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="px-5 pb-6">
            <RowSkeleton rows={7} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No deployments match"
            hint="Try a different environment tab or clear the filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {["Name", "Status", "Environment", "Version", "Last deployed", ""].map((h, i) => (
                    <TableHead
                      key={h || i}
                      className={`font-mono text-[10px] uppercase tracking-wider ${i === 0 ? "pl-5" : ""} ${i === 5 ? "pr-5 text-right" : ""}`}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => (
                  <TableRow key={d.id} data-testid={`row-deployment-${d.id}`}>
                    <TableCell className="pl-5">
                      <div className="text-xs font-semibold">{d.name}</div>
                      <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                        <GitCommitHorizontal className="h-3 w-3" />
                        {d.commitSha ?? "—"}
                        {d.duration != null && (
                          <>
                            <Timer className="ml-1.5 h-3 w-3" />
                            {d.duration}s
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusPill status={d.status} />
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[11px] capitalize text-muted-foreground">
                        {d.environment}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px]">
                        {d.version}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {relativeTime(d.lastDeployed)}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          data-testid={`button-redeploy-${d.id}`}
                          disabled={redeploy.isPending}
                          onClick={() => redeploy.mutate(d)}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Redeploy
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              data-testid={`button-actions-${d.id}`}
                              aria-label={`Actions for ${d.name}`}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem data-testid={`action-logs-${d.id}`}>
                              View build logs
                            </DropdownMenuItem>
                            <DropdownMenuItem data-testid={`action-rollback-${d.id}`}>
                              Roll back one version
                            </DropdownMenuItem>
                            <DropdownMenuItem data-testid={`action-promote-${d.id}`}>
                              Promote to production
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive dark:text-red-400"
                              data-testid={`action-delete-${d.id}`}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete deployment
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </PageShell>
  );
}
