"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Plus,
  Globe,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileEdit,
  Eye,
} from "lucide-react";

interface BuilderProject {
  id: number;
  name: string;
  status: string;
  url: string | null;
  updatedAt: string;
}

interface BuilderStatus {
  llm: boolean;
  crew: boolean;
  stripe: boolean;
  lago: boolean;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  survey: { icon: <FileEdit className="w-3.5 h-3.5" />, color: "text-yellow-400", label: "Needs card" },
  generating: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, color: "text-slime-400", label: "Generating" },
  preview: { icon: <Eye className="w-3.5 h-3.5" />, color: "text-blue-400", label: "Preview" },
  deploying: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, color: "text-slime-400", label: "Publishing" },
  live: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-green-400", label: "Live" },
  failed: { icon: <AlertCircle className="w-3.5 h-3.5" />, color: "text-red-400", label: "Failed" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function BuilderPage() {
  const [projects, setProjects] = useState<BuilderProject[]>([]);
  const [status, setStatus] = useState<BuilderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/builder/status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => {});
    fetch("/api/builder/projects")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error ?? "Could not load projects");
        setProjects(Array.isArray(d) ? d : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3 glow-text">
            <Sparkles className="w-6 h-6 text-slime-400" />
            Site Builder
          </h1>
          <p className="text-sm text-[#7a6b9d] mt-1">
            Answer a few questions — the vat generates your site, you refine it, publish it to your own subdomain.
          </p>
        </div>
        <Link href="/builder/new" className="slime-btn flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New site
        </Link>
      </div>

      {status && !status.llm && (
        <div className="slime-card drip-sm p-4 text-sm text-yellow-300">
          The generation backend isn&apos;t configured yet — projects can be created but generation will fail until an LLM endpoint is set.
        </div>
      )}

      {error && (
        <div className="slime-card drip-sm p-4 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[#7a6b9d] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading projects…
        </div>
      ) : projects.length === 0 ? (
        <div className="slime-card drip-natural p-10 text-center">
          <Sparkles className="w-8 h-8 text-slime-400 mx-auto mb-3" />
          <p className="text-white font-medium">Nothing generated yet</p>
          <p className="text-sm text-[#7a6b9d] mt-1">Start a new site — the survey takes about a minute.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => {
            const st = statusConfig[p.status] ?? statusConfig.preview;
            return (
              <Link key={p.id} href={`/builder/${p.id}`}>
                <div className="slime-card drip-natural p-5 h-full cursor-pointer hover:border-slime-600/40 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-white">{p.name}</div>
                      <div className="mt-1 font-mono text-[11px] text-[#7a6b9d] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(p.updatedAt)}
                      </div>
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs ${st.color}`}>
                      {st.icon} {st.label}
                    </span>
                  </div>
                  {p.url && (
                    <div className="mt-3 flex items-center gap-1.5 truncate font-mono text-xs text-slime-400">
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      {p.url.replace("https://", "")}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
