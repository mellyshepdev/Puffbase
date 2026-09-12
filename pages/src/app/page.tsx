"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderGit2,
  AlertCircle,
  GitPullRequest,
  Star,
  Activity,
  TrendingUp,
  Clock,
  ArrowRight,
  Zap,
  Plus,
  X,
  Sparkles,
  Rocket,
  Code2,
  GitBranch,
  ChevronDown,
  MoreHorizontal,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  CircleDot,
} from "lucide-react";
import { CodeButton } from "@/components/CodeButton";

interface Stats {
  repos: number;
  openIssues: number;
  totalStars: number;
  activePipelines: number;
  totalPipelines: number;
  successPipelines: number;
  activeDeployments: number;
  successRate: number;
}

interface Repo {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  lastCommitMessage: string | null;
  lastCommitAt: string | null;
}

interface Pipeline {
  id: number;
  repoName: string;
  branch: string;
  status: string;
  stage: string;
  commitMessage: string | null;
  duration: number | null;
  createdAt: string;
}

interface Issue {
  id: number;
  repoName: string;
  title: string;
  status: string;
  priority: string;
  assignee: string | null;
  createdAt: string;
}

const languageColors: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3776ab",
  Go: "#00add8",
  Rust: "#dea584",
  MDX: "#f9ac00",
};

const statusIcons: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-green-400" />,
  failed: <XCircle className="w-4 h-4 text-red-400" />,
  running: <Loader2 className="w-4 h-4 text-slime-400 animate-spin" />,
  pending: <CircleDot className="w-4 h-4 text-yellow-400" />,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [pipelineData, setPipelineData] = useState<Pipeline[]>([]);
  const [issueData, setIssueData] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newProjectName.trim();
    if (!name) return;
    await fetch("/api/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => {});
    setCreateOpen(false);
    setNewProjectName("");
    notify(`${name} created`);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/repos").then((r) => r.json()),
      fetch("/api/pipelines").then((r) => r.json()),
      fetch("/api/issues").then((r) => r.json()),
    ]).then(([s, r, p, i]) => {
      setStats(s);
      setRepos(r.slice(0, 5));
      setPipelineData(p.slice(0, 5));
      setIssueData(i.slice(0, 5));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slime-500 to-goo-700 animate-pulse glow-purple" />
          <p className="text-slime-400 text-sm animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Repositories", value: stats?.repos || 0, icon: FolderGit2, color: "slime", href: "/repos" },
    { label: "Open Issues", value: stats?.openIssues || 0, icon: AlertCircle, color: "red", href: "/issues" },
    { label: "Pipelines Passing", value: `${stats?.successPipelines || 0} / ${stats?.totalPipelines || 0}`, icon: GitPullRequest, color: "blue", href: "/pipelines" },
    { label: "Uptime", value: `${stats?.successRate || 0}%`, icon: TrendingUp, color: "emerald", href: "/deploy" },
  ];

  const codeLines = [
    <><span className="code-purple">import</span> <span className="code-blue">{`{ Button }`}</span> <span className="code-purple">from</span> <span className="code-green">&quot;@orbit/ui&quot;</span></>,
    <><span className="code-purple">import</span> <span className="code-blue">{`{ cn }`}</span> <span className="code-purple">from</span> <span className="code-green">&quot;@/lib/utils&quot;</span></>,
    <>&nbsp;</>,
    <><span className="code-purple">export default function</span> <span className="code-yellow">DeployCard</span>() {'{'}</>,
    <><span className="code-muted indent">return</span> <span className="code-blue indent2">(</span></>,
    <><span className="code-tag indent2">&lt;div</span> <span className="code-attr">className</span>=<span className="code-green">&quot;deploy-card&quot;</span><span className="code-tag">&gt;</span></>,
    <><span className="code-tag indent2">&lt;Button</span> <span className="code-attr">variant</span>=<span className="code-green">&quot;slime&quot;</span><span className="code-tag">&gt;</span></>,
    <><span className="code-text indent3">Ship to production</span></>,
    <><span className="code-tag indent2">&lt;/Button&gt;</span></>,
    <><span className="code-tag indent2">&lt;/div&gt;</span></>,
    <><span className="code-blue indent2">)</span></>,
    <><span className="code-muted">{'}'}</span></>,
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="eyebrow"><span className="pulse-dot" /> ALL SYSTEMS OPERATIONAL</div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3 mt-1.5">
            <span className="glow-text">Good morning, slime_dev</span>
            <span className="wave">✦</span>
          </h1>
          <p className="text-sm text-[#7a6b9d] mt-1">Here&apos;s what&apos;s moving across your workspace today.</p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={() => notify("Import flow opened")}>
            <FolderGit2 className="w-4 h-4" /> Import repo
          </button>
          <button className="button primary" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> New project
          </button>
        </div>
      </div>

      {/* Slime Status hero banner */}
      <section className="hero-card">
        <div className="hero-copy">
          <div className="hero-label"><Zap className="w-3.5 h-3.5" /> SLIME STATUS</div>
          <h2>Everything is <em>flowing.</em></h2>
          <p>Your builds are green, deployments are healthy, and the team is in sync.</p>
          <Link href="/status" className="hero-link">View workspace activity <ArrowRight className="w-4 h-4" /></Link>
        </div>
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <div className="hero-blob"><span /><span /><span /><span /></div>
        <div className="hero-metrics">
          <div><strong>{stats?.successRate || 0}%</strong><span>build success</span></div>
          <div><strong>{stats?.activeDeployments || 0}</strong><span>active deploys</span></div>
          <div><strong>{stats?.totalStars || 0}</strong><span>total stars</span></div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href} className="slime-card p-4 group cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <card.icon className="w-5 h-5 text-slime-400" />
              <ArrowRight className="w-3.5 h-3.5 text-[#3a2d5a] group-hover:text-slime-400 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-[11px] text-[#7a6b9d] mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Repositories */}
        <div className="lg:col-span-2 slime-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-slime-400" />
              Recent Repositories
            </h2>
            <Link href="/repos" className="text-xs text-slime-400 hover:text-slime-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="project-grid">
            {repos.map((repo) => (
              <article className="project-card" key={repo.id}>
                <div className="project-card-top">
                  <div className="large-favicon">{repo.name.slice(0, 2).toUpperCase()}</div>
                  <button className="dots-button" onClick={() => notify(`${repo.name} actions opened`)} aria-label={`More actions for ${repo.name}`}>⋯</button>
                </div>
                <div className="project-title-row">
                  <h3><Link href={`/repos/${repo.id}`}>{repo.name}</Link></h3>
                  <span className="visibility public">Public</span>
                </div>
                <p>{repo.lastCommitMessage || "No commits yet"}</p>
                <div className="project-meta">
                  {repo.language && (
                    <span><i className="language-dot" style={{ backgroundColor: languageColors[repo.language] || "#8b3dff" }} />{repo.language}</span>
                  )}
                  <span><Star className="w-3 h-3" />{repo.stars}</span>
                </div>
                <div className="project-divider" />
                <div className="project-footer">
                  <span className="deploy-state live"><i />Live</span>
                  <span className="project-time">{repo.lastCommitAt ? timeAgo(repo.lastCommitAt) : ""}</span>
                  <Link href={`/repos/${repo.id}`} className="open-project" aria-label={`Open ${repo.name}`}><ArrowRight className="w-4 h-4" /></Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Deploy banner */}
          <section className="deploy-banner">
            <div className="deploy-glow" />
            <div className="deploy-banner-icon"><Rocket className="w-5 h-5" /></div>
            <div>
              <span>DEPLOY WITH CONFIDENCE</span>
              <strong>Ship your next idea.</strong>
              <p>Connect a repo and go live in minutes.</p>
            </div>
            <button onClick={() => notify("Deployment flow opened")} className="button primary workspace-open">
              Deploy <ArrowRight className="w-4 h-4" />
            </button>
          </section>

          {/* Activity Feed */}
          <div className="slime-card p-5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-slime-400" />
            Latest Activity
          </h2>
          <div className="space-y-4">
            {[
              { action: "Pushed to", target: "slime-ui/main", detail: "feat: dripping animation variants", time: "15m ago", type: "push" },
              { action: "Pipeline started", target: "slime-ui/feat/glow-props", detail: "Running tests...", time: "3m ago", type: "pipeline" },
              { action: "Deployed", target: "purple-api", detail: "api.slimegit.dev → production", time: "45m ago", type: "deploy" },
              { action: "Issue opened", target: "ooze-auth", detail: "Session tokens not expiring", time: "1h ago", type: "issue" },
              { action: "PR merged", target: "blob-storage", detail: "Optimize chunk deduplication", time: "2h ago", type: "merge" },
            ].map((event, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1 ${
                      event.type === "push" ? "bg-slime-400" :
                      event.type === "pipeline" ? "bg-blue-400" :
                      event.type === "deploy" ? "bg-green-400" :
                      event.type === "issue" ? "bg-red-400" :
                      "bg-purple-400"
                    }`}
                  />
                  {i < 4 && <div className="w-px flex-1 bg-[var(--color-dark-border)] mt-1" />}
                </div>
                <div className="pb-4 min-w-0">
                  <p className="text-xs">
                    <span className="text-[#9d8ec2]">{event.action}</span>{" "}
                    <span className="text-slime-300 font-medium">{event.target}</span>
                  </p>
                  <p className="text-xs text-[#5a4d7a] mt-0.5 truncate">{event.detail}</p>
                  <p className="text-[10px] text-[#3a2d5a] mt-1">{event.time}</p>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>

      {/* Code workspace — keep your hands in the code */}
      <section className="code-card">
        <div className="code-card-header">
          <div>
            <div className="section-eyebrow">CODE WORKSPACE</div>
            <h2>Keep your hands in the code.</h2>
          </div>
          <div className="code-card-actions">
            <button className="button secondary" onClick={() => notify("Preview opened in a new tab")}>
              <ExternalLink className="w-3.5 h-3.5" /> Preview
            </button>
            <button className="button primary" onClick={() => notify("Editor opened")}>
              <Code2 className="w-3.5 h-3.5" /> Open editor
            </button>
          </div>
        </div>
        <div className="editor-shell">
          <div className="editor-toolbar">
            <div className="editor-file"><span className="file-dot" /> orbit-ui <span>/</span> components <span>/</span> DeployCard.tsx</div>
            <div className="editor-branch"><GitBranch className="w-3.5 h-3.5" /> main <ChevronDown className="w-3 h-3" /></div>
          </div>
          <div className="editor-body">
            <div className="file-tree">
              <div className="tree-heading">EXPLORER <MoreHorizontal className="w-3.5 h-3.5" /></div>
              <div className="tree-item folder"><span>⌄</span> components</div>
              <div className="tree-item selected"><span className="file-type">TS</span> DeployCard.tsx</div>
              <div className="tree-item"><span className="file-type">TS</span> Button.tsx</div>
              <div className="tree-item folder"><span>›</span> lib</div>
              <div className="tree-item folder"><span>›</span> app</div>
              <div className="tree-item"><span className="file-type json">{`{ }`}</span> package.json</div>
              <div className="tree-bottom"><GitBranch className="w-3.5 h-3.5" /> Working tree clean</div>
            </div>
            <div className="code-view">
              <div className="code-tab"><span className="file-type">TS</span> DeployCard.tsx <X className="w-3 h-3 ml-auto" /></div>
              <div className="code-content">
                {codeLines.map((line, index) => (
                  <div className="code-line" key={index}>
                    <span className="line-number">{String(index + 1).padStart(2, "0")}</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom grid: Pipelines & Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Pipelines */}
        <div className="slime-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <GitPullRequest className="w-4 h-4 text-slime-400" />
              Pipeline Activity
            </h2>
            <Link href="/pipelines" className="text-xs text-slime-400 hover:text-slime-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {pipelineData.map((pipe) => (
              <div
                key={pipe.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-dark-bg)]/50 border border-[var(--color-dark-border)] hover:border-slime-800/30 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {statusIcons[pipe.status]}
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{pipe.repoName}</p>
                    <p className="text-[11px] text-[#5a4d7a] truncate">{pipe.commitMessage}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`status-${pipe.status} text-[10px] px-2 py-0.5 rounded-full font-medium`}>
                    {pipe.status}
                  </span>
                  <span className="text-[11px] text-[#5a4d7a] font-mono">{pipe.branch}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Issues */}
        <div className="slime-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slime-400" />
              Open Issues
            </h2>
            <Link href="/issues" className="text-xs text-slime-400 hover:text-slime-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {issueData.map((issue) => (
              <div
                key={issue.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-dark-bg)]/50 border border-[var(--color-dark-border)] hover:border-slime-800/30 transition-all"
              >
                <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  issue.status === "open" ? "bg-green-400" : "bg-purple-400"
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{issue.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[#5a4d7a]">{issue.repoName}</span>
                    <span className="text-[10px] text-[#3a2d5a]">•</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      issue.priority === "critical" ? "bg-red-500/15 text-red-400" :
                      issue.priority === "high" ? "bg-orange-500/15 text-orange-400" :
                      "bg-slime-500/15 text-slime-400"
                    }`}>
                      {issue.priority}
                    </span>
                    {issue.assignee && (
                      <>
                        <span className="text-[10px] text-[#3a2d5a]">•</span>
                        <span className="text-[10px] text-[#7a6b9d]">@{issue.assignee}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New project modal */}
      {createOpen && (
        <div className="modal-backdrop" onMouseDown={() => setCreateOpen(false)}>
          <div className="create-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setCreateOpen(false)} aria-label="Close"><X className="w-4 h-4" /></button>
            <div className="modal-icon"><Sparkles className="w-5 h-5" /></div>
            <div className="section-eyebrow">NEW WORKSPACE</div>
            <h2>Create a new project</h2>
            <p>Start with a clean repository and let the slime do the rest.</p>
            <form onSubmit={createProject}>
              <label>Project name
                <input autoFocus value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="e.g. moonlight-app" />
              </label>
              <div className="modal-actions">
                <button type="button" className="button secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
                <button type="submit" className="button primary" disabled={!newProjectName.trim()}>Create project <ArrowRight className="w-4 h-4" /></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* toast */}
      {toast && <div className="ooze-toast">{toast}</div>}
    </div>
  );
}
