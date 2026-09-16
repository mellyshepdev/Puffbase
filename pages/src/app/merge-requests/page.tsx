"use client";

import { useEffect, useState } from "react";
import { GitMerge, GitBranch, Loader2 } from "lucide-react";

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

  useEffect(() => {
    fetch("/api/merge-requests")
      .then((r) => r.json())
      .then((d) => setMrs(Array.isArray(d) ? d : []))
      .catch(() => setMrs([]));
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <GitMerge className="w-6 h-6 text-slime-400" />
        <h1 className="text-2xl font-bold text-white">Merge requests</h1>
      </div>
      <p className="text-sm text-[#7a6b9d] mb-6">
        Open merge requests across this workspace&apos;s repositories.
      </p>

      {mrs === null ? (
        <div className="flex items-center gap-2 text-[#7a6b9d] text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : mrs.length === 0 ? (
        <div className="slime-card p-8 text-center">
          <GitMerge className="w-8 h-8 text-[#5a4d7a] mx-auto mb-3" />
          <p className="text-sm text-[#9d8ec2]">No open merge requests.</p>
          <p className="text-xs text-[#5a4d7a] mt-1">When a repo gets a PR, it shows up here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mrs.map((m) => (
            <div key={`${m.repo}-${m.number}`} className="slime-card p-4 flex items-center gap-4">
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
    </div>
  );
}
