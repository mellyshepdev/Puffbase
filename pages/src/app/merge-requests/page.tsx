"use client";

import { useEffect, useState } from "react";
import { GitMerge, GitBranch, Loader2, Plus, X } from "lucide-react";

interface MR {
  id: number;
  number: number;
  title: string;
  state: string;
  repo: string;
  headBranch: string;
  baseBranch: string;
  user: string;
  createdAt: string;
}

export default function MergeRequestsPage() {
  const [mrs, setMrs] = useState<MR[] | null>(null);
  const [repos, setRepos] = useState<{ id: string; name: string }[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRepo, setNewRepo] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newHead, setNewHead] = useState("");
  const [newBase, setNewBase] = useState("main");
  const [newBody, setNewBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const load = () =>
    fetch("/api/merge-requests")
      .then((r) => r.json())
      .then((d) => setMrs(Array.isArray(d) ? d : []))
      .catch(() => setMrs([]));

  useEffect(() => {
    load();
    fetch("/api/repos").then((r) => r.json()).then((d) => {
      const list = Array.isArray(d) ? d : [];
      setRepos(list);
      if (list[0]) setNewRepo(list[0].name);
    });
    if (new URLSearchParams(window.location.search).has("new")) setCreateOpen(true);
  }, []);

  const create = async () => {
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/merge-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo: newRepo, title: newTitle, head: newHead, base: newBase, body: newBody }),
    });
    setCreating(false);
    if (res.ok) {
      setCreateOpen(false);
      setNewTitle(""); setNewHead(""); setNewBody("");
      load();
    } else {
      const d = await res.json();
      setCreateError(d?.error ?? "Could not open merge request");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <GitMerge className="w-6 h-6 text-slime-400" />
          <h1 className="text-2xl font-bold text-white">Merge requests</h1>
        </div>
        <button className="slime-btn flex items-center gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> New merge request
        </button>
      </div>
      <p className="text-sm text-[#7a6b9d] mb-6">
        Open merge requests across this workspace&apos;s repositories.
      </p>

      {mrs === null ? (
        <div className="flex items-center gap-2 text-[#7a6b9d] text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : mrs.length === 0 ? (
        <div className="slime-card drip-natural p-8 text-center">
          <GitMerge className="w-8 h-8 text-[#5a4d7a] mx-auto mb-3" />
          <p className="text-sm text-[#9d8ec2]">No open merge requests.</p>
          <p className="text-xs text-[#5a4d7a] mt-1">When a repo gets a PR, it shows up here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mrs.map((m, i) => (
            <div key={`${m.repo}-${m.number}`} className={`slime-card drip-${["natural","med","sm","long"][i % 4]} p-4 flex items-center gap-4`}>
              <GitMerge className="w-4 h-4 text-slime-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  <span className="text-[#5a4d7a] font-mono">#{m.number}</span> {m.title}
                </p>
                <p className="text-[11px] text-[#7a6b9d] flex items-center gap-1.5 mt-0.5">
                  <span className="font-medium text-[#9d8ec2]">{m.repo}</span>
                  <GitBranch className="w-3 h-3" />
                  <span className="font-mono">{m.headBranch}</span>
                  <span>→</span>
                  <span className="font-mono">{m.baseBranch}</span>
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-[#5a4d7a]">{m.user}</p>
                <p className="text-[10px] text-[#5a4d7a]">
                  {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setCreateOpen(false)}>
          <div className="slime-card drip-med p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">New merge request</h3>
              <button onClick={() => setCreateOpen(false)} className="text-[#5a4d7a] hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            {repos.length === 0 ? (
              <p className="text-sm text-[#7a6b9d]">Create a repository first — merge requests live on repos.</p>
            ) : (
              <div className="space-y-3">
                <select
                  value={newRepo}
                  onChange={(e) => setNewRepo(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white outline-none"
                >
                  {repos.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white placeholder-[#5a4d7a] outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={newHead}
                    onChange={(e) => setNewHead(e.target.value)}
                    placeholder="Head branch (e.g. feature-x)"
                    className="px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white placeholder-[#5a4d7a] outline-none"
                  />
                  <input
                    value={newBase}
                    onChange={(e) => setNewBase(e.target.value)}
                    placeholder="Base branch"
                    className="px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white placeholder-[#5a4d7a] outline-none"
                  />
                </div>
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Description (optional)"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white placeholder-[#5a4d7a] outline-none resize-none"
                />
                {createError && <p className="text-xs text-red-400">{createError}</p>}
                <button
                  className="slime-btn w-full flex items-center justify-center gap-2"
                  onClick={create}
                  disabled={creating || !newTitle.trim() || !newHead.trim()}
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
                  Open merge request
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
