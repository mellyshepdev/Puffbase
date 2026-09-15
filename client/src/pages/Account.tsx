import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  ExternalLink,
  FileCode,
  Globe,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageShell, SectionTitle, StatusPill } from "@/components/kit";
import { useAuth, logoutUrl } from "@/lib/auth";
import { relativeTime } from "@/lib/data";

type BuilderProject = {
  id: number;
  name: string;
  status: string;
  url: string | null;
  subdomain: string | null;
  stripeCustomerId: string | null;
  lagoSubscriptionId: string | null;
  updatedAt: string;
};

type DocumentMeta = { name: string; updatedAt: string };

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default function Account() {
  const { user, isAdmin } = useAuth();
  const projects = useQuery<BuilderProject[]>({
    queryKey: ["/api/builder/projects"],
  });
  const documents = useQuery<DocumentMeta[]>({
    queryKey: ["/api/documents"],
  });

  const projectList = projects.data ?? [];
  const docList = documents.data ?? [];
  const liveSites = projectList.filter((p) => p.status === "live").length;
  const hasCard = projectList.some((p) => p.stripeCustomerId);
  const subscription = projectList.find((p) => p.lagoSubscriptionId)
    ?.lagoSubscriptionId;

  const label = user?.name || user?.email || "Signed in";

  return (
    <PageShell>
      <SectionTitle hint="Your account, your stuff, your billing">
        Account
      </SectionTitle>

      <div className="mt-4 grid gap-4 lg:grid-cols-[20rem_1fr]">
        {/* profile */}
        <Card className="h-fit p-5">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border border-primary/40">
              <AvatarFallback className="bg-primary/20 font-mono text-sm text-primary">
                {initials(label)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{label}</div>
              {user?.email && user?.name && (
                <div className="truncate font-mono text-[11px] text-muted-foreground">
                  {user.email}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2 border-t border-border/60 pt-4 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">account</span>
              <span>{isAdmin ? "operator" : "member"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">card on file</span>
              <span className={hasCard ? "text-primary" : ""}>
                {hasCard ? "yes" : "none"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">subscription</span>
              <span className={subscription ? "text-primary" : ""}>
                {subscription ? `${subscription.slice(0, 12)}…` : "none"}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-border/60 py-2">
              <div className="text-lg font-bold">{projectList.length}</div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                sites
              </div>
            </div>
            <div className="rounded-md border border-border/60 py-2">
              <div className="text-lg font-bold">{liveSites}</div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                live
              </div>
            </div>
            <div className="rounded-md border border-border/60 py-2">
              <div className="text-lg font-bold">{docList.length}</div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                docs
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="mt-4 w-full"
            asChild
          >
            <a href={logoutUrl}>
              <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
            </a>
          </Button>
        </Card>

        {/* projects + docs */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" /> Your sites
              </h3>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" asChild>
                <Link href="/builder">New site</Link>
              </Button>
            </div>
            {projects.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : projectList.length === 0 ? (
              <EmptyState
                title="No sites yet"
                hint="Open the Site Builder, answer the survey, and the vat generates your first site."
              />
            ) : (
              <ul className="divide-y divide-border/60">
                {projectList.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 py-2.5 text-sm"
                  >
                    <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Link
                      href={`/builder/${p.id}`}
                      className="min-w-0 flex-1 truncate hover:text-primary"
                    >
                      {p.name}
                    </Link>
                    <StatusPill status={p.status} />
                    {p.status === "live" && p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-primary"
                        title={p.url}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {relativeTime(p.updatedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <FileCode className="h-4 w-4 text-primary" /> Your documents
              </h3>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" asChild>
                <Link href="/documents">Open editor</Link>
              </Button>
            </div>
            {documents.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : docList.length === 0 ? (
              <EmptyState
                title="No documents yet"
                hint="Your private file space - create a document in the editor."
              />
            ) : (
              <ul className="divide-y divide-border/60">
                {docList.map((d) => (
                  <li
                    key={d.name}
                    className="flex items-center gap-3 py-2.5 font-mono text-xs"
                  >
                    <FileCode className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <Link
                      href="/documents"
                      className="min-w-0 flex-1 truncate hover:text-primary"
                    >
                      {d.name}
                    </Link>
                    <span className="text-[10px] text-muted-foreground">
                      {relativeTime(d.updatedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="h-4 w-4 text-primary" /> Billing
            </h3>
            <p className="text-xs text-muted-foreground">
              {subscription
                ? "Subscription active on your account."
                : hasCard
                  ? "A card is on file - billing attaches when you subscribe a site."
                  : "No card on file yet. The Site Builder collects one through the hosted checkout before generation."}
            </p>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
