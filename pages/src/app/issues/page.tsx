"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Search,
  Plus,
  Filter,
  X,
  Loader2,
  CheckCircle2,
  CircleDot,
  XCircle,
  AlertTriangle,
  Tag,
  User,
  Clock,
} from "lucide-react";

interface Issue {
  id: number;
  repoId: number;
  title: string;
  body: string | null;
  status: string;
  priority: string;
  assignee: string | null;
  labels: string[];
  repoName: string;
  createdAt: string;
  updatedAt: string;
}

const priorityConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  critical: { color: "bg-red-500/15 text-red-400 border-red-500/30", icon: <AlertTriangle className="w-3 h-3" /> },
  high: { color: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: <AlertCircle className="w-3 h-3" /> },
  medium: { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: <CircleDot className="w-3 h-3" /> },
  low: { color: "bg-slime-500/15 text-slime-400 border-slime-500/30", icon: <CircleDot className="w-3 h-3" /> },
};

const labelColors: Record<string, string> = {
  bug: "bg-red-500/10 text-red-400 border-red-500/20",
  enhancement: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  feature: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  security: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  critical: "bg-red-600/10 text-red-300 border-red-600/20",
  performance: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  default: "bg-slime-500/10 text-slime-400 border-slime-500/20",
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

function IssuesPage() {
  const searchParams = useSearchParams();
  const mineOnly = searchParams.get("assignee") === "me";
  const [issues, setIssues] = useState<Issue[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [repos, setRepos] = useState<{ id: string; name: string }[]>([]);
  const [me, setMe] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newRepo, setNewRepo] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newAssignee, setNewAssignee] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const loadIssues = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (mineOnly) params.set("assignee", "me");
    return fetch(`/api/issues?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setIssues(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadIssues();
    fetch("/api/repos").then((r) => r.json()).then((d) => setRepos(Array.isArray(d) ? d : []));
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setMe(d.user?.name ?? d.user?.email ?? ""));
  }, [search, statusFilter, mineOnly]);

  const createIssue = async () => {
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoId: newRepo, title: newTitle, body: newBody, priority: newPriority, assignee: newAssignee }),
    });
    setCreating(false);
    if (res.ok) {
      setCreateOpen(false);
      setNewTitle(""); setNewBody(""); setNewRepo("");
      loadIssues();
    } else {
      const d = await res.json();
      setCreateError(d?.error ?? "Could not create issue");
    }
  };

  const openCount = issues.filter((i) => i.status === "open").length;
  const closedCount = issues.filter((i) => i.status === "closed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3 glow-text">
            <AlertCircle className="w-6 h-6 text-slime-400" />
            {mineOnly ? "My tasks" : "Issues"}
          </h1>
          <p className="text-sm text-[#7a6b9d] mt-1">
            {openCount} open · {closedCount} closed
            {mineOnly && <> · assigned to {me || "you"} · <a href="/issues" className="text-slime-400 hover:underline">view all</a></>}
          </p>
        </div>
        <button className="slime-btn flex items-center gap-2" onClick={() => { setCreateOpen(true); setNewRepo(repos[0]?.id ?? ""); }}>
          <Plus className="w-4 h-4" />
          New Issue
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-md flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-card)]">
          <Search className="w-4 h-4 text-[#5a4d7a]" />
          <input
            type="text"
            placeholder="Search issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-[#5a4d7a] outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#5a4d7a]" />
          {["all", "open", "closed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s
                  ? s === "open"
                    ? "bg-green-600/20 text-green-400 border border-green-600/30"
                    : s === "closed"
                    ? "bg-purple-600/20 text-purple-400 border border-purple-600/30"
                    : "bg-slime-600/20 text-slime-300 border border-slime-600/30"
                  : "text-[#7a6b9d] border border-transparent hover:text-white"
              }`}
            >
              {s === "open" && <CircleDot className="w-3 h-3" />}
              {s === "closed" && <CheckCircle2 className="w-3 h-3" />}
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Issue List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="slime-card p-4 animate-pulse">
              <div className="h-5 bg-[var(--color-dark-border)] rounded w-2/3 mb-2" />
              <div className="h-3 bg-[var(--color-dark-border)] rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => {
            const priority = priorityConfig[issue.priority] || priorityConfig.medium;
            return (
              <div key={issue.id} className="slime-card p-4 group cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex-shrink-0 ${
                    issue.status === "open" ? "text-green-400" : "text-purple-400"
                  }`}>
                    {issue.status === "open" ? (
                      <CircleDot className="w-5 h-5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <h3 className="text-sm font-medium text-white group-hover:text-slime-300 transition-colors">
                        {issue.title}
                      </h3>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${priority.color}`}>
                        {priority.icon}
                        {issue.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-[11px] text-[#5a4d7a] flex items-center gap-1">
                        <span className="font-mono">{issue.repoName}</span>
                      </span>
                      <span className="text-[10px] text-[#3a2d5a]">•</span>
                      {(issue.labels as string[]).map((label) => (
                        <span
                          key={label}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${
                            labelColors[label] || labelColors.default
                          }`}
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {label}
                        </span>
                      ))}
                      {issue.assignee && (
                        <>
                          <span className="text-[10px] text-[#3a2d5a]">•</span>
                          <span className="text-[11px] text-[#9d8ec2] flex items-center gap-1">
                            <User className="w-3 h-3" />
                            @{issue.assignee}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#4a3f6a] flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {timeAgo(issue.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setCreateOpen(false)}>
          <div className="slime-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">New issue</h3>
              <button onClick={() => setCreateOpen(false)} className="text-[#5a4d7a] hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            {repos.length === 0 ? (
              <p className="text-sm text-[#7a6b9d]">Create a repository first — issues live on repos.</p>
            ) : (
              <div className="space-y-3">
                <select
                  value={newRepo}
                  onChange={(e) => setNewRepo(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white outline-none"
                >
                  {repos.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Issue title"
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white placeholder-[#5a4d7a] outline-none"
                />
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Description (optional)"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white placeholder-[#5a4d7a] outline-none resize-none"
                />
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white outline-none"
                >
                  {["low", "medium", "high", "critical"].map((pr) => <option key={pr} value={pr}>{pr}</option>)}
                </select>
                <input
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  placeholder={`Assignee (optional) — ${me || "your name"}`}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white placeholder-[#5a4d7a] outline-none"
                />
                {createError && <p className="text-xs text-red-400">{createError}</p>}
                <button className="slime-btn w-full flex items-center justify-center gap-2" onClick={createIssue} disabled={creating || !newTitle.trim()}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create issue
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && issues.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle2 className="w-12 h-12 text-[#3a2d5a] mx-auto mb-4" />
          <p className="text-[#7a6b9d]">No issues found</p>
          <p className="text-xs text-[#4a3f6a] mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-[#7a6b9d]">Loading…</div>}>
      <IssuesPage />
    </Suspense>
  );
}
