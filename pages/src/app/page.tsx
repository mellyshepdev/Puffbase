"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FolderGit2,
  AlertCircle,
  GitPullRequest,
  Rocket,
  Star,
  Activity,
  TrendingUp,
  Clock,
  ArrowRight,
  Zap,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  CircleDot,
} from "lucide-react";

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
    { label: "Total Stars", value: stats?.totalStars || 0, icon: Star, color: "yellow", href: "/repos" },
    { label: "Active Pipelines", value: stats?.activePipelines || 0, icon: GitPullRequest, color: "blue", href: "/pipelines" },
    { label: "Deployments", value: stats?.activeDeployments || 0, icon: Rocket, color: "green", href: "/deploy" },
    { label: "Success Rate", value: `${stats?.successRate || 0}%`, icon: TrendingUp, color: "emerald", href: "/pipelines" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="glow-text">Dashboard</span>
            <Zap className="w-5 h-5 text-slime-400" />
          </h1>
          <p className="text-sm text-[#7a6b9d] mt-1">Welcome back, slime_dev. Here&apos;s your overview.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#5a4d7a]">
          <Clock className="w-3.5 h-3.5" />
          <span>Last updated: just now</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
          <div className="space-y-3">
            {repos.map((repo) => (
              <Link
                key={repo.id}
                href={`/repos/${repo.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--color-dark-hover)] transition-all group border border-transparent hover:border-slime-800/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slime-700/50 to-goo-800/50 flex items-center justify-center flex-shrink-0">
                    <FolderGit2 className="w-4 h-4 text-slime-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white group-hover:text-slime-300 transition-colors truncate">
                      {repo.name}
                    </p>
                    <p className="text-xs text-[#5a4d7a] truncate">
                      {repo.lastCommitMessage || "No commits yet"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  {repo.language && (
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: languageColors[repo.language] || "#8b3dff" }}
                      />
                      <span className="text-xs text-[#7a6b9d]">{repo.language}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-[#5a4d7a]">
                    <Star className="w-3 h-3" />
                    {repo.stars}
                  </div>
                  <span className="text-[11px] text-[#4a3f6a]">{repo.lastCommitAt ? timeAgo(repo.lastCommitAt) : ""}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

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
    </div>
  );
}
