"use client";

import { useEffect, useState } from "react";
import {
  GitPullRequest,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Loader2,
  CircleDot,
  Clock,
  GitBranch,
  Terminal,
  Zap,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

interface Pipeline {
  id: number;
  repoId: number;
  branch: string;
  status: string;
  stage: string;
  commitSha: string | null;
  commitMessage: string | null;
  duration: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  repoName: string;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  success: { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-400" },
  failed: { icon: <XCircle className="w-4 h-4" />, color: "text-red-400" },
  running: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-slime-400" },
  pending: { icon: <CircleDot className="w-4 h-4" />, color: "text-yellow-400" },
};

const stages = ["lint", "build", "test", "deploy"];

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StageIndicator({ currentStage, status }: { currentStage: string; status: string }) {
  const currentIndex = stages.indexOf(currentStage);
  return (
    <div className="flex items-center gap-1">
      {stages.map((stage, i) => {
        const isCompleted = i < currentIndex || (i === currentIndex && status === "success");
        const isCurrent = i === currentIndex && status !== "success";
        const isFailed = i === currentIndex && status === "failed";
        return (
          <div key={stage} className="flex items-center">
            <div
              className={`w-6 h-1.5 rounded-full transition-colors ${
                isCompleted
                  ? "bg-green-500"
                  : isFailed
                  ? "bg-red-500"
                  : isCurrent
                  ? "bg-slime-400 animate-pulse"
                  : "bg-[var(--color-dark-border)]"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [repos, setRepos] = useState<{ id: string; name: string }[]>([]);
  const [runOpen, setRunOpen] = useState(false);
  const [runRepo, setRunRepo] = useState("");
  const [runBranch, setRunBranch] = useState("main");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    fetch(`/api/pipelines?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setPipelines(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [statusFilter]);

  useEffect(() => {
    fetch("/api/repos").then((r) => r.json()).then((d) => {
      const list = Array.isArray(d) ? d : [];
      setRepos(list);
      if (new URLSearchParams(window.location.search).has("new")) {
        setRunRepo(list[0]?.id ?? "");
        setRunOpen(true);
      }
    });
  }, []);

  const runPipeline = async () => {
    setRunning(true);
    setRunError("");
    const res = await fetch("/api/pipelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoId: runRepo, branch: runBranch }),
    });
    setRunning(false);
    if (res.ok) {
      setRunOpen(false);
      setStatusFilter((f) => f); // retrigger list
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      fetch(`/api/pipelines?${params}`).then((r) => r.json()).then((d) => setPipelines(Array.isArray(d) ? d : []));
    } else {
      const d = await res.json();
      setRunError(d?.error ?? "Could not start pipeline");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3 glow-text">
            <GitPullRequest className="w-6 h-6 text-slime-400" />
            CI/CD Pipelines
          </h1>
          <p className="text-sm text-[#7a6b9d] mt-1">
            {pipelines.filter((p) => p.status === "running").length} running ·{" "}
            {pipelines.filter((p) => p.status === "success").length} passed ·{" "}
            {pipelines.filter((p) => p.status === "failed").length} failed
          </p>
        </div>
        <button className="slime-btn flex items-center gap-2" onClick={() => { setRunOpen(true); setRunRepo(repos[0]?.id ?? ""); }}>
          <Zap className="w-4 h-4" />
          Run Pipeline
        </button>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2">
        {["all", "running", "success", "failed", "pending"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === s
                ? s === "running"
                  ? "bg-slime-600/20 text-slime-300 border border-slime-600/30"
                  : s === "success"
                  ? "bg-green-600/20 text-green-400 border border-green-600/30"
                  : s === "failed"
                  ? "bg-red-600/20 text-red-400 border border-red-600/30"
                  : s === "pending"
                  ? "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30"
                  : "bg-slime-600/20 text-slime-300 border border-slime-600/30"
                : "text-[#7a6b9d] border border-transparent hover:text-white"
            }`}
          >
            {s !== "all" && statusConfig[s]?.icon}
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Pipeline List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`slime-card drip-${["natural","med","sm","long"][i % 4]} p-5 animate-pulse`}>
              <div className="h-5 bg-[var(--color-dark-border)] rounded w-1/3 mb-3" />
              <div className="h-3 bg-[var(--color-dark-border)] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {pipelines.map((pipeline, i) => {
            const status = statusConfig[pipeline.status] || statusConfig.pending;
            const isExpanded = expandedId === pipeline.id;
            return (
              <div key={pipeline.id} className={`slime-card drip-${["natural","med","sm","long"][i % 4]} overflow-hidden`}>
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-[var(--color-dark-hover)] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : pipeline.id)}
                >
                  <div className={status.color}>{status.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{pipeline.repoName}</span>
                      <span className={`status-${pipeline.status} text-[10px] px-2 py-0.5 rounded-full font-medium`}>
                        {pipeline.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#5a4d7a] mt-0.5 truncate">{pipeline.commitMessage}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <StageIndicator currentStage={pipeline.stage} status={pipeline.status} />
                    <div className="flex items-center gap-1.5 text-xs text-[#7a6b9d]">
                      <GitBranch className="w-3 h-3 text-slime-400" />
                      {pipeline.branch}
                    </div>
                    {pipeline.commitSha && (
                      <span className="text-xs font-mono text-[#5a4d7a] bg-[var(--color-dark-bg)] px-2 py-0.5 rounded">
                        {pipeline.commitSha}
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-xs text-[#5a4d7a]">
                      <Clock className="w-3 h-3" />
                      {formatDuration(pipeline.duration)}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#5a4d7a]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#5a4d7a]" />
                    )}
                  </div>
                </div>

                {/* Expanded section */}
                {isExpanded && (
                  <div className="border-t border-[var(--color-dark-border)] p-4 bg-[var(--color-dark-bg)]/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Terminal className="w-4 h-4 text-slime-400" />
                      <span className="text-xs font-medium text-white">Pipeline Logs</span>
                    </div>
                    <div className="code-block p-3 text-xs space-y-1">
                      <p className="text-slate-400">$ git checkout {pipeline.branch}</p>
                      <p className="text-slate-400">$ npm ci</p>
                      <p className="text-green-400">✓ Dependencies installed ({Math.floor(Math.random() * 30 + 10)}s)</p>
                      <p className="text-slate-400">$ npm run lint</p>
                      <p className="text-green-400">✓ Linting passed</p>
                      <p className="text-slate-400">$ npm run build</p>
                      {pipeline.status === "failed" ? (
                        <p className="text-red-400">✗ Build failed — {pipeline.commitMessage}</p>
                      ) : pipeline.status === "running" ? (
                        <p className="text-slime-400 animate-pulse">⟳ Building...</p>
                      ) : (
                        <>
                          <p className="text-green-400">✓ Build succeeded</p>
                          <p className="text-slate-400">$ npm test</p>
                          <p className="text-green-400">✓ All tests passed</p>
                          {pipeline.stage === "deploy" && (
                            <>
                              <p className="text-slate-400">$ deploy --env production</p>
                              <p className="text-green-400">✓ Deployed successfully</p>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
