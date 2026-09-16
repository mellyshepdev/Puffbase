"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FolderGit2,
  Star,
  GitFork,
  Search,
  Lock,
  Globe,
  Clock,
  Code2,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { CodeButton } from "@/components/CodeButton";

interface Repo {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  visibility: string;
  stars: number;
  forks: number;
  isFavorite: boolean;
  lastCommitMessage: string | null;
  lastCommitAt: string | null;
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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ReposPage() {
  const searchParams = useSearchParams();
  const favOnly = searchParams.get("fav") === "1";
  const [repos, setRepos] = useState<Repo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "public" | "private">("all");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (favOnly) params.set("fav", "1");
    fetch(`/api/repos?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRepos(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [search, favOnly]);

  const toggleFav = async (e: React.MouseEvent, repo: Repo) => {
    e.preventDefault();
    e.stopPropagation();
    const res = await fetch(`/api/repos/${repo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: !repo.isFavorite }),
    });
    if (res.ok) {
      const d = await res.json();
      setRepos((cur) =>
        favOnly && !d.isFavorite
          ? cur.filter((r) => r.id !== repo.id)
          : cur.map((r) => (r.id === repo.id ? { ...r, isFavorite: d.isFavorite } : r)),
      );
    }
  };

  const filteredRepos = filter === "all" ? repos : repos.filter((r) => r.visibility === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3 glow-text">
            {favOnly ? <Star className="w-6 h-6 text-[#b6f34c] fill-[#b6f34c]" /> : <FolderGit2 className="w-6 h-6 text-slime-400" />}
            {favOnly ? "Favorites" : "Repositories"}
          </h1>
          <p className="text-sm text-[#7a6b9d] mt-1">
            {repos.length} {favOnly ? "favorites" : "repositories"}
            {favOnly && <> · <Link href="/repos" className="text-slime-400 hover:underline">view all</Link></>}
          </p>
        </div>
        <Link href="/new/repository" className="slime-btn flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Repository
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-card)]">
          <Search className="w-4 h-4 text-[#5a4d7a]" />
          <input
            type="text"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-[#5a4d7a] outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#5a4d7a]" />
          {(["all", "public", "private"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? "bg-slime-700/40 text-slime-300 border border-slime-600/30"
                  : "text-[#7a6b9d] hover:text-white border border-transparent"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Repo Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="slime-card p-5 animate-pulse">
              <div className="h-5 bg-[var(--color-dark-border)] rounded w-1/3 mb-3" />
              <div className="h-4 bg-[var(--color-dark-border)] rounded w-2/3 mb-4" />
              <div className="h-3 bg-[var(--color-dark-border)] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRepos.map((repo) => (
            <Link
              key={repo.id}
              href={`/repos/${repo.id}`}
              className="slime-card p-5 group cursor-pointer"
              style={{ overflow: "visible" }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-5 h-5 text-slime-400" />
                  <h3 className="text-base font-semibold text-white group-hover:text-slime-300 transition-colors">
                    {repo.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <CodeButton repo={repo.name} />
                  {repo.visibility === "private" ? (
                    <Lock className="w-3.5 h-3.5 text-[#5a4d7a]" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-[#5a4d7a]" />
                  )}
                  <span className="text-[10px] text-[#5a4d7a]">{repo.visibility}</span>
                </div>
              </div>

              <p className="text-xs text-[#7a6b9d] mb-4 line-clamp-2">
                {repo.description || "No description provided."}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {repo.language && (
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: languageColors[repo.language] || "#8b3dff" }}
                      />
                      <span className="text-xs text-[#9d8ec2]">{repo.language}</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => toggleFav(e, repo)}
                    title={repo.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    className={`flex items-center gap-1 text-xs transition-colors ${
                      repo.isFavorite ? "text-[#b6f34c]" : "text-[#5a4d7a] hover:text-[#b6f34c]"
                    }`}
                  >
                    <Star className={`w-3 h-3 ${repo.isFavorite ? "fill-[#b6f34c]" : ""}`} />
                    <span>{repo.stars.toLocaleString()}</span>
                  </button>
                  <div className="flex items-center gap-1 text-xs text-[#5a4d7a]">
                    <GitFork className="w-3 h-3" />
                    <span>{repo.forks}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#4a3f6a]">
                  <Clock className="w-3 h-3" />
                  {repo.lastCommitAt ? timeAgo(repo.lastCommitAt) : "Never"}
                </div>
              </div>

              {/* Drip decoration */}
              <div className="absolute bottom-0 left-8 w-1 h-0 group-hover:h-4 bg-gradient-to-b from-slime-600 to-transparent rounded-b-full transition-all duration-300" />
              <div className="absolute bottom-0 right-16 w-1.5 h-0 group-hover:h-3 bg-gradient-to-b from-goo-600 to-transparent rounded-b-full transition-all duration-500" />
            </Link>
          ))}
        </div>
      )}

      {!loading && filteredRepos.length === 0 && (
        <div className="text-center py-16">
          <Code2 className="w-12 h-12 text-[#3a2d5a] mx-auto mb-4" />
          <p className="text-[#7a6b9d]">{favOnly ? "No favorites yet — star a repo to pin it here" : "No repositories found"}</p>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-[#7a6b9d]">Loading…</div>}>
      <ReposPage />
    </Suspense>
  );
}
