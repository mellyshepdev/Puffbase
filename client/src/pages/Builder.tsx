import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  Globe2,
  Loader2,
  Plus,
  Rocket,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EmptyState,
  PageShell,
  SectionTitle,
  StatusPill,
} from "@/components/kit";
import { relativeTime } from "@/lib/data";
import type { BuilderProject } from "@shared/schema";

/* ------------------------------------------------------------------------ */

type BuilderStatus = {
  llm: boolean;
  model: string;
  lago: boolean;
  deployDomain: string | null;
  notify: string[];
};

type ProjectDetail = BuilderProject & {
  revisions: { id: number; instruction: string; createdAt: string }[];
};

const SURVEY_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: "business", label: "What does it do?", placeholder: "Mobile phone repair, cloud backups, a bakery..." },
  { key: "audience", label: "Who is it for?", placeholder: "Local customers, startups, other devs..." },
  { key: "vibe", label: "Vibe / style", placeholder: "Minimal and dark, playful slime, corporate clean..." },
  { key: "colors", label: "Colors", placeholder: "Purple + slime green, or leave blank to let it choose" },
  { key: "sections", label: "Sections to include", placeholder: "Hero, pricing, testimonials, FAQ, contact..." },
  { key: "cta", label: "Primary call to action", placeholder: "Book a repair, Start free trial, Get a quote..." },
  { key: "contact", label: "Contact details to show", placeholder: "Email, phone, address, hours..." },
];

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

function useBuilderStatus() {
  return useQuery<BuilderStatus>({ queryKey: ["/api/builder/status"], retry: false });
}
function useProjects() {
  return useQuery<BuilderProject[]>({ queryKey: ["/api/builder/projects"], retry: false });
}
function useProject(id: number | null, poll: boolean) {
  return useQuery<ProjectDetail>({
    queryKey: ["/api/builder/projects", id],
    queryFn: () => api(`/api/builder/projects/${id}`),
    enabled: id !== null,
    refetchInterval: poll ? 4000 : false,
    retry: false,
  });
}

// kit.tsx StatusPill keys on the status string itself - map builder states
// onto the tones it already knows.
const STATUS_TONE_KEY: Record<string, string> = {
  survey: "idle",
  generating: "in-progress",
  preview: "info",
  deploying: "in-progress",
  live: "deployed",
  failed: "failed",
};

/* ----------------------------- project list ----------------------------- */

function ProjectList({ onNew }: { onNew: () => void }) {
  const { data: projects, isLoading } = useProjects();
  const { data: status } = useBuilderStatus();

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionTitle hint={`${projects?.length ?? 0} projects`}>Site Builder</SectionTitle>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Answer a few questions, the vat generates a site, you refine it,
            then publish it to your own subdomain.
          </p>
        </div>
        <Button data-testid="button-new-project" onClick={onNew}>
          <Plus className="mr-1.5 h-4 w-4" /> New site
        </Button>
      </div>

      {status && !status.llm && (
        <Card className="mt-6 border-warning/40 bg-warning/10 p-4 text-sm">
          The generation backend isn&apos;t configured yet — projects can be
          created but generation will fail until an LLM endpoint is set.
        </Card>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading &&
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        {!isLoading && !projects?.length && (
          <div className="sm:col-span-2 xl:col-span-3">
            <EmptyState
              title="Nothing generated yet"
              hint="Start a new site - the survey takes about a minute."
            />
          </div>
        )}
        {projects?.map((p) => (
          <Link key={p.id} href={`/builder/${p.id}`}>
            <Card className="group h-full cursor-pointer p-5 transition-colors hover:border-primary/50">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {relativeTime(p.updatedAt)}
                  </div>
                </div>
                <StatusPill status={STATUS_TONE_KEY[p.status] ?? "idle"} />
              </div>
              {p.url && (
                <div className="mt-3 flex items-center gap-1.5 truncate font-mono text-xs text-primary">
                  <Globe2 className="h-3.5 w-3.5 shrink-0" />
                  {p.url.replace("https://", "")}
                </div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}

/* ------------------------------- survey --------------------------------- */

function Survey({ onDone }: { onDone: (id: number) => void }) {
  const [name, setName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [subdomain, setSubdomain] = useState("");
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () =>
      api("/api/builder/projects", {
        method: "POST",
        body: JSON.stringify({
          name,
          survey: answers,
          subdomain: subdomain || undefined,
        }),
      }),
    onSuccess: (project: BuilderProject) => {
      queryClient.invalidateQueries({ queryKey: ["/api/builder/projects"] });
      onDone(project.id);
    },
  });

  return (
    <PageShell>
      <SectionTitle hint="intake">New site</SectionTitle>
      <Card className="mt-6 max-w-2xl space-y-5 p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Site name</label>
          <Input
            data-testid="input-project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Swoop's Repair Shop"
          />
        </div>
        {SURVEY_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="mb-1.5 block text-sm font-medium">{f.label}</label>
            <Textarea
              rows={f.key === "sections" ? 2 : 1}
              value={answers[f.key] ?? ""}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [f.key]: e.target.value }))
              }
              placeholder={f.placeholder}
            />
          </div>
        ))}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Subdomain (optional)
          </label>
          <Input
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
            placeholder="my-shop"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Where it publishes on the deploy domain. Blank = auto-generated.
          </p>
        </div>
        {create.error && (
          <p className="text-sm text-destructive">{create.error.message}</p>
        )}
        <Button
          data-testid="button-start-generation"
          disabled={!name.trim() || create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-4 w-4" />
          )}
          Generate my site
        </Button>
      </Card>
    </PageShell>
  );
}

/* ------------------------------ detail ---------------------------------- */

function ProjectDetail({ id }: { id: number }) {
  const { data: project, isLoading } = useProject(id, true);
  const [instruction, setInstruction] = useState("");
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/builder/projects", id] });

  const revise = useMutation({
    mutationFn: () =>
      api(`/api/builder/projects/${id}/revise`, {
        method: "POST",
        body: JSON.stringify({ instruction }),
      }),
    onSuccess: () => {
      setInstruction("");
      invalidate();
    },
  });
  const publish = useMutation({
    mutationFn: () =>
      api(`/api/builder/projects/${id}/publish`, { method: "POST" }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: () =>
      api(`/api/builder/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/builder/projects"] });
      window.location.hash = "#/builder";
    },
  });

  const generating = project?.status === "generating" || project?.status === "deploying";

  if (isLoading || !project) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-[480px] rounded-xl" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/builder">
            <Button variant="ghost" size="icon" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <SectionTitle>{project.name}</SectionTitle>
            <div className="mt-0.5 flex items-center gap-2">
              <StatusPill status={STATUS_TONE_KEY[project.status] ?? "idle"} />
              <span className="font-mono text-[10px] uppercase text-muted-foreground">{project.status}</span>
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener"
                  className="font-mono text-xs text-primary hover:underline"
                >
                  {project.url.replace("https://", "")}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={!project.html || generating || publish.isPending}
            onClick={() => publish.mutate()}
          >
            {publish.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-1.5 h-4 w-4" />
            )}
            {project.status === "live" ? "Republish" : "Publish"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete project"
            disabled={remove.isPending}
            onClick={() => {
              if (confirm(`Delete "${project.name}"? This withdraws its public route.`))
                remove.mutate();
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {(publish.error || revise.error) && (
        <p className="mt-3 text-sm text-destructive">
          {publish.error?.message ?? revise.error?.message}
        </p>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          {generating ? (
            <div className="flex h-[560px] flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">
                {project.status === "deploying"
                  ? "Publishing to the edge…"
                  : "The vat is generating your site — local models take a few minutes."}
              </p>
            </div>
          ) : project.html ? (
            <iframe
              title="site preview"
              src={`/api/builder/projects/${id}/preview`}
              className="h-[560px] w-full bg-white"
              sandbox="allow-scripts"
            />
          ) : (
            <div className="flex h-[560px] items-center justify-center">
              <EmptyState
                title={project.status === "failed" ? "Generation failed" : "Nothing yet"}
                hint={
                  project.status === "failed"
                    ? "The model didn't return a usable page. Try a revision or regenerate."
                    : "Waiting on the first generation."
                }
              />
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-2 text-sm font-medium">Request a change</div>
            <Textarea
              rows={3}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Make the hero punchier, add a pricing table, darker background…"
            />
            <Button
              className="mt-2 w-full"
              size="sm"
              disabled={!instruction.trim() || generating || revise.isPending || !project.html}
              onClick={() => revise.mutate()}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" /> Apply change
            </Button>
          </Card>

          {project.revisions.length > 0 && (
            <Card className="p-4">
              <div className="mb-2 text-sm font-medium">History</div>
              <ul className="space-y-2">
                {[...project.revisions].reverse().map((r) => (
                  <li key={r.id} className="text-xs">
                    <div className="truncate text-muted-foreground">
                      {r.instruction}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground/70">
                      {relativeTime(r.createdAt)}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {project.lagoSubscriptionId && (
            <Card className="p-4 text-xs text-muted-foreground">
              Billed via Lago subscription{" "}
              <span className="font-mono">{project.lagoSubscriptionId.slice(0, 12)}…</span>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}

/* ------------------------------- export --------------------------------- */

export default function Builder() {
  const params = useParams<{ id?: string }>();
  const [creating, setCreating] = useState(false);
  const projectId = params.id ? Number(params.id) : null;

  useEffect(() => {
    if (projectId !== null) setCreating(false);
  }, [projectId]);

  const content = useMemo(() => {
    if (creating) return <Survey onDone={(id) => (window.location.hash = `#/builder/${id}`)} />;
    if (projectId !== null && !Number.isNaN(projectId))
      return <ProjectDetail id={projectId} />;
    return <ProjectList onNew={() => setCreating(true)} />;
  }, [creating, projectId]);

  return content;
}
