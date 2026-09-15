import { useMemo, useState } from "react";
import type { GiteaRepo } from "@/lib/data";
import { ExternalLink, GitBranch, Lock, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageShell, SectionTitle } from "@/components/kit";
import { relativeTime, useRepos } from "@/lib/data";

export default function Repositories() {
  const { data, isLoading } = useRepos();
  const [query, setQuery] = useState("");

  const repos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((r) => !q || r.name.toLowerCase().includes(q));
  }, [data, query]);

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionTitle hint={`${data.length} repos`}>Repositories</SectionTitle>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Live from this workspace's Gitea instance - push something to see it show up here.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="input-filter-repositories"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter repositories"
            className="h-9 w-56 bg-card/60 pl-8 text-xs backdrop-blur"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="space-y-4 p-5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </Card>
          ))}
        </div>
      ) : repos.length === 0 ? (
        <EmptyState
          title={data.length === 0 ? "No repositories yet" : "No repositories match that filter"}
          hint={
            data.length === 0
              ? "Push a repo to Gitea and it'll show up here."
              : "Try a different name."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {repos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function RepoCard({ repo }: { repo: GiteaRepo }) {
  return (
    <Card
      data-testid={`card-repo-${repo.id}`}
      className="ooze-card goo-glow group relative overflow-hidden border-card-border/80 bg-card/70 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5"
    >
      <div className="px-5 pb-5 pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-mono text-sm font-semibold" data-testid={`text-repo-name-${repo.id}`}>
              {repo.name}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
              <GitBranch className="h-3 w-3" />
              {repo.defaultBranch}
              {repo.private && (
                <>
                  <span aria-hidden="true">·</span>
                  <Lock className="h-3 w-3" />
                  private
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <Star className="h-3.5 w-3.5" />
            {repo.starsCount}
          </div>
        </div>

        {repo.description && (
          <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{repo.description}</p>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
          <span className="font-mono text-[10px] text-muted-foreground">
            updated {relativeTime(repo.updatedAt)}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-[11px]" asChild>
            <a href={repo.htmlUrl} target="_blank" rel="noreferrer">
              Open <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>
    </Card>
  );
}
