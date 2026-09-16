"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderGit2, AlertCircle, GitMerge, GitPullRequest, Rocket, Users, FileText,
  Loader2, ArrowLeft, ChevronRight,
} from "lucide-react";

type Field =
  | { key: string; label: string; kind: "text"; placeholder?: string; help: string; required?: boolean }
  | { key: string; label: string; kind: "textarea"; placeholder?: string; help: string; required?: boolean }
  | { key: string; label: string; kind: "select"; options: { value: string; label: string }[]; help: string; required?: boolean }
  | { key: string; label: string; kind: "repo"; help: string; required?: boolean };

interface KindConfig {
  title: string;
  icon: typeof FolderGit2;
  blurb: string;
  fields: Field[];
  endpoint: string;
  dest: string;
  submit: string;
  // maps form state -> API body
  build: (v: Record<string, string>) => Record<string, unknown>;
  valid: (v: Record<string, string>) => boolean;
}

const KINDS: Record<string, KindConfig> = {
  repository: {
    title: "New repository",
    icon: FolderGit2,
    blurb: "A repository holds your code, files, and full revision history. It gets its own space in this workspace's store.",
    fields: [
      { key: "name", label: "Repository name", kind: "text", placeholder: "my-project", required: true, help: "Great repository names are short and memorable. Lowercase letters, numbers, and dashes." },
      { key: "description", label: "Description", kind: "textarea", placeholder: "What is this project?", help: "Shown on the repo list and in search. Optional but recommended." },
      { key: "language", label: "Primary language", kind: "select", options: [
        { value: "", label: "—" },
        { value: "TypeScript", label: "TypeScript" }, { value: "JavaScript", label: "JavaScript" },
        { value: "Python", label: "Python" }, { value: "Go", label: "Go" },
        { value: "Rust", label: "Rust" }, { value: "Other", label: "Other" },
      ], help: "Used for the language badge on the repo card. You can change it later." },
    ],
    endpoint: "/api/repos",
    dest: "/repos",
    submit: "Create repository",
    build: (v) => ({ name: v.name, description: v.description, language: v.language || undefined }),
    valid: (v) => v.name.trim().length > 0,
  },
  issue: {
    title: "New issue",
    icon: AlertCircle,
    blurb: "Issues track bugs, tasks, and ideas on a repository. They show up in the workspace issue list and My tasks when assigned.",
    fields: [
      { key: "repoId", label: "Repository", kind: "repo", required: true, help: "Issues always live on a repository - pick which one this belongs to." },
      { key: "title", label: "Title", kind: "text", placeholder: "Short summary of the work", required: true, help: "One line that says what's broken or what needs doing." },
      { key: "body", label: "Description", kind: "textarea", placeholder: "Steps to reproduce, expected behavior, context…", help: "The details. Markdown works here." },
      { key: "priority", label: "Priority", kind: "select", options: [
        { value: "low", label: "Low" }, { value: "medium", label: "Medium" },
        { value: "high", label: "High" }, { value: "critical", label: "Critical" },
      ], help: "How urgent is it? Shows as a colored badge on the issue list." },
      { key: "assignee", label: "Assignee", kind: "text", placeholder: "Who owns this? (your name = My tasks)", help: "Issues assigned to you appear under avatar menu → My tasks." },
    ],
    endpoint: "/api/issues",
    dest: "/issues",
    submit: "Create issue",
    build: (v) => ({ repoId: v.repoId, title: v.title, body: v.body, priority: v.priority, assignee: v.assignee }),
    valid: (v) => Boolean(v.repoId) && v.title.trim().length > 0,
  },
  "merge-request": {
    title: "New merge request",
    icon: GitMerge,
    blurb: "A merge request proposes merging one branch into another on a repository, with review context attached.",
    fields: [
      { key: "repo", label: "Repository", kind: "repo", required: true, help: "The repository this merge request belongs to." },
      { key: "title", label: "Title", kind: "text", placeholder: "What does this change do?", required: true, help: "Shown in the merge request list as #N - title." },
      { key: "head", label: "Source branch (head)", kind: "text", placeholder: "feature-x", required: true, help: "The branch with your changes. It must already exist in the repo - push it or create it in the editor first." },
      { key: "base", label: "Target branch (base)", kind: "text", placeholder: "main", help: "Where the changes get merged. Defaults to main if left empty." },
      { key: "body", label: "Description", kind: "textarea", placeholder: "What changed, why, how to test…", help: "Reviewers read this first. Optional." },
    ],
    endpoint: "/api/merge-requests",
    dest: "/merge-requests",
    submit: "Open merge request",
    build: (v) => ({ repo: v.repo, title: v.title, head: v.head, base: v.base, body: v.body }),
    valid: (v) => Boolean(v.repo) && v.title.trim().length > 0 && v.head.trim().length > 0,
  },
  pipeline: {
    title: "New pipeline run",
    icon: GitPullRequest,
    blurb: "A pipeline run builds and tests a repository on a given branch. Runs start pending and are picked up by the runner.",
    fields: [
      { key: "repoId", label: "Repository", kind: "repo", required: true, help: "Which repository to run the pipeline against." },
      { key: "branch", label: "Branch", kind: "text", placeholder: "main", help: "The ref to build. Defaults to main." },
      { key: "commitMessage", label: "Run label", kind: "text", placeholder: "Manual run", help: "A short note shown next to the run - e.g. 'before release'." },
    ],
    endpoint: "/api/pipelines",
    dest: "/pipelines",
    submit: "Run pipeline",
    build: (v) => ({ repoId: v.repoId, branch: v.branch || "main", commitMessage: v.commitMessage || "Manual run" }),
    valid: (v) => Boolean(v.repoId),
  },
  deployment: {
    title: "New deployment",
    icon: Rocket,
    blurb: "A deployment records a release of a repository into an environment - production, staging, or a preview.",
    fields: [
      { key: "repoId", label: "Repository", kind: "repo", required: true, help: "Which repository is being deployed." },
      { key: "environment", label: "Environment", kind: "select", options: [
        { value: "production", label: "Production" },
        { value: "staging", label: "Staging" },
        { value: "development", label: "Development" },
      ], help: "Where this release goes. Environments are tracked separately in the deploy list." },
      { key: "branch", label: "Branch", kind: "text", placeholder: "main", help: "Which ref gets deployed. Defaults to main." },
    ],
    endpoint: "/api/deployments",
    dest: "/deploy",
    submit: "Create deployment",
    build: (v) => ({ repoId: v.repoId, environment: v.environment || "production", branch: v.branch || "main" }),
    valid: (v) => Boolean(v.repoId),
  },
  group: {
    title: "New group",
    icon: Users,
    blurb: "Groups are teams inside this workspace - they bundle people and repository access together.",
    fields: [
      { key: "name", label: "Group name", kind: "text", placeholder: "Platform team", required: true, help: "Shown in the groups list and usable for access control." },
      { key: "description", label: "Description", kind: "textarea", placeholder: "What this team owns or works on", help: "Optional context for the group." },
    ],
    endpoint: "/api/groups",
    dest: "/groups",
    submit: "Create group",
    build: (v) => ({ name: v.name, description: v.description }),
    valid: (v) => v.name.trim().length > 0,
  },
  document: {
    title: "New document",
    icon: FileText,
    blurb: "A document is a private, versioned space in the editor - every save is a commit. Write docs, notes, or code.",
    fields: [
      { key: "name", label: "Document name", kind: "text", placeholder: "release-notes", required: true, help: "Lowercase letters, numbers, dashes. This becomes the document's address in your editor." },
    ],
    endpoint: "/api/editor",
    dest: "/editor",
    submit: "Create document",
    build: (v) => ({ name: v.name }),
    valid: (v) => v.name.trim().length > 0,
  },
};

function NewItemPage() {
  const { kind } = useParams<{ kind: string }>();
  const router = useRouter();
  const cfg = KINDS[kind ?? ""];
  const [repos, setRepos] = useState<{ id: string; name: string }[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/repos").then((r) => r.json()).then((d) => setRepos(Array.isArray(d) ? d : []));
  }, []);

  if (!cfg) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <p className="text-[#9d8ec2] mb-4">Unknown item type.</p>
        <Link href="/" className="text-slime-400 text-sm hover:underline">← Back to dashboard</Link>
      </div>
    );
  }

  const set = (k: string, v: string) => setValues((cur) => ({ ...cur, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setError("");
    const res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg.build(values)),
    });
    setBusy(false);
    if (res.ok) {
      router.push(cfg.dest);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d?.error ?? "Could not create it");
    }
  };

  const Icon = cfg.icon;

  return (
    <div className="max-w-2xl mx-auto">
      <Link href={cfg.dest} className="inline-flex items-center gap-1.5 text-xs text-[#7a6b9d] hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </Link>

      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-slime-600/20 border border-slime-600/30 flex items-center justify-center">
          <Icon className="w-5 h-5 text-slime-300" />
        </div>
        <h1 className="text-2xl font-bold text-white">{cfg.title}</h1>
      </div>
      <p className="text-sm text-[#9d8ec2] mb-8">{cfg.blurb}</p>

      <div className="slime-card p-6 space-y-6">
        {cfg.fields.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-white mb-1">
              {f.label} {f.required && <span className="text-slime-400">*</span>}
            </label>
            {f.kind === "text" && (
              <input
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white placeholder-[#5a4d7a] outline-none focus:border-slime-500/50"
              />
            )}
            {f.kind === "textarea" && (
              <textarea
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white placeholder-[#5a4d7a] outline-none resize-none focus:border-slime-500/50"
              />
            )}
            {f.kind === "select" && (
              <select
                value={values[f.key] ?? f.options[0].value}
                onChange={(e) => set(f.key, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white outline-none focus:border-slime-500/50"
              >
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
            {f.kind === "repo" && (
              repos.length === 0 ? (
                <p className="text-xs text-[#7a6b9d]">
                  No repositories yet — <Link href="/new/repository" className="text-slime-400 hover:underline">create one first</Link>.
                </p>
              ) : (
                <select
                  value={values[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white outline-none focus:border-slime-500/50"
                >
                  <option value="">Choose a repository…</option>
                  {repos.map((r) => (
                    <option key={r.id} value={kind === "merge-request" ? r.name : String(r.id)}>{r.name}</option>
                  ))}
                </select>
              )
            )}
            <p className="text-[11px] text-[#5a4d7a] mt-1.5">{f.help}</p>
          </div>
        ))}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          className="slime-btn w-full flex items-center justify-center gap-2"
          onClick={submit}
          disabled={busy || !cfg.valid(values)}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          {cfg.submit}
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  return <NewItemPage />;
}
