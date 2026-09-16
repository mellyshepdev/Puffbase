"use client";

import { useEffect, useState } from "react";
import {
  Rocket,
  Globe,
  ExternalLink,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
  GitBranch,
  Copy,
  Server,
  Shield,
  ArrowUpRight,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";

interface Deployment {
  id: number;
  repoId: number;
  environment: string;
  status: string;
  url: string | null;
  domain: string | null;
  branch: string | null;
  commitSha: string | null;
  createdAt: string;
  updatedAt: string;
  repoName: string;
}

const envColors: Record<string, string> = {
  production: "bg-green-500/10 text-green-400 border-green-500/20",
  preview: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  staging: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  development: "bg-slime-500/10 text-slime-400 border-slime-500/20",
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  active: { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-400", label: "Active" },
  deploying: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "text-slime-400", label: "Deploying" },
  failed: { icon: <AlertCircle className="w-4 h-4" />, color: "text-red-400", label: "Failed" },
  pending: { icon: <Clock className="w-4 h-4" />, color: "text-yellow-400", label: "Pending" },
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

export default function DeployPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [envFilter, setEnvFilter] = useState("all");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [repos, setRepos] = useState<{ id: string; name: string }[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRepo, setNewRepo] = useState("");
  const [newEnv, setNewEnv] = useState("production");
  const [newBranch, setNewBranch] = useState("main");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const loadDeployments = () => {
    const params = new URLSearchParams();
    if (envFilter !== "all") params.set("environment", envFilter);
    return fetch(`/api/deployments?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setDeployments(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDeployments();
    fetch("/api/repos").then((r) => r.json()).then((d) => {
      const list = Array.isArray(d) ? d : [];
      setRepos(list);
      if (new URLSearchParams(window.location.search).has("new")) {
        setNewRepo(list[0]?.id ?? "");
        setCreateOpen(true);
      }
    });
  }, [envFilter]);

  const createDeployment = async () => {
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/deployments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoId: newRepo, environment: newEnv, branch: newBranch }),
    });
    setCreating(false);
    if (res.ok) {
      setCreateOpen(false);
      loadDeployments();
    } else {
      const d = await res.json();
      setCreateError(d?.error ?? "Could not create deployment");
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const activeCount = deployments.filter((d) => d.status === "active").length;
  const deployingCount = deployments.filter((d) => d.status === "deploying").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3 glow-text">
            <Rocket className="w-6 h-6 text-slime-400" />
            Deployments
          </h1>
          <p className="text-sm text-[#7a6b9d] mt-1">
            {activeCount} active · {deployingCount} deploying
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setLoading(true); loadDeployments(); }} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#9d8ec2] hover:text-white border border-[var(--color-dark-border)] hover:border-slime-600/30 transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button onClick={() => { setCreateOpen(true); setNewRepo(repos[0]?.id ?? ""); }} className="slime-btn flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Deployment
          </button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="slime-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-4 h-4 text-slime-400" />
            <span className="text-xs text-[#7a6b9d]">Total Deployments</span>
          </div>
          <p className="text-2xl font-bold text-white">{deployments.length}</p>
        </div>
        <div className="slime-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-xs text-[#7a6b9d]">Active</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{activeCount}</p>
        </div>
        <div className="slime-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-[#7a6b9d]">Production</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">
            {deployments.filter((d) => d.environment === "production").length}
          </p>
        </div>
        <div className="slime-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-slime-400" />
            <span className="text-xs text-[#7a6b9d]">Custom Domains</span>
          </div>
          <p className="text-2xl font-bold text-slime-300">
            {new Set(deployments.map((d) => d.domain)).size}
          </p>
        </div>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setCreateOpen(false)}>
          <div className="slime-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">New deployment</h3>
              <button onClick={() => setCreateOpen(false)} className="text-[#5a4d7a] hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            {repos.length === 0 ? (
              <p className="text-sm text-[#7a6b9d]">Create a repository first — deployments attach to repos.</p>
            ) : (
              <div className="space-y-3">
                <select
                  value={newRepo}
                  onChange={(e) => setNewRepo(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white outline-none"
                >
                  {repos.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <select
                  value={newEnv}
                  onChange={(e) => setNewEnv(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white outline-none"
                >
                  {["production", "staging", "preview"].map((env) => <option key={env} value={env}>{env}</option>)}
                </select>
                <input
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  placeholder="Branch"
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white placeholder-[#5a4d7a] outline-none"
                />
                {createError && <p className="text-xs text-red-400">{createError}</p>}
                <button className="slime-btn w-full flex items-center justify-center gap-2" onClick={createDeployment} disabled={creating || !newRepo}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  Deploy
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Environment filter */}
      <div className="flex items-center gap-2">
        {["all", "production", "preview", "staging"].map((env) => (
          <button
            key={env}
            onClick={() => setEnvFilter(env)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              envFilter === env
                ? "bg-slime-600/20 text-slime-300 border border-slime-600/30"
                : "text-[#7a6b9d] border border-transparent hover:text-white"
            }`}
          >
            {env.charAt(0).toUpperCase() + env.slice(1)}
          </button>
        ))}
      </div>

      {/* Deployment List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="slime-card p-5 animate-pulse">
              <div className="h-5 bg-[var(--color-dark-border)] rounded w-1/3 mb-3" />
              <div className="h-3 bg-[var(--color-dark-border)] rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deployments.map((deployment) => {
            const status = statusConfig[deployment.status] || statusConfig.pending;
            return (
              <div key={deployment.id} className="slime-card p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white">{deployment.repoName}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${envColors[deployment.environment] || envColors.development}`}>
                        {deployment.environment}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`flex items-center gap-1 text-xs ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                  </div>
                  {deployment.url && (
                    <a
                      href={deployment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-[#5a4d7a] hover:text-slime-400 hover:bg-[var(--color-dark-hover)] transition-all"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* URL */}
                {deployment.domain && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] mb-3">
                    <Globe className="w-3.5 h-3.5 text-slime-400 flex-shrink-0" />
                    <span className="text-xs text-slime-300 font-mono truncate flex-1">
                      {deployment.domain}
                    </span>
                    <button
                      onClick={() => copyUrl(deployment.url || deployment.domain || "")}
                      className="p-1 rounded text-[#5a4d7a] hover:text-slime-400 transition-colors flex-shrink-0"
                    >
                      {copiedUrl === deployment.url ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-[#5a4d7a]">
                  <div className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-slime-400/60" />
                    {deployment.branch}
                  </div>
                  {deployment.commitSha && (
                    <span className="font-mono bg-[var(--color-dark-bg)] px-1.5 py-0.5 rounded text-[10px]">
                      {deployment.commitSha}
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(deployment.updatedAt)}
                  </div>
                </div>

                {/* Progress bar for deploying */}
                {deployment.status === "deploying" && (
                  <div className="mt-3 h-1 bg-[var(--color-dark-border)] rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-gradient-to-r from-slime-600 to-slime-400 rounded-full animate-pulse" />
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
