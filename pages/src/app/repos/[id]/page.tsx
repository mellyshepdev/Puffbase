"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  FolderGit2,
  Star,
  GitFork,
  GitBranch,
  Clock,
  Lock,
  Globe,
  ArrowLeft,
  Code2,
  FileText,
  Folder,
  ChevronRight,
  Pencil,
  Save,
  X,
  Plus,
  Eye,
  Terminal,
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
  defaultBranch: string;
  lastCommitMessage: string | null;
  lastCommitAt: string | null;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  path?: string;
  sha?: string;
  children?: FileNode[];
  content?: string;
  language?: string;
}

/** Build the nested file tree from the flat {path,type} list the API returns. */
function buildTree(entries: { path: string; type: string }[]): FileNode[] {
  const root: FileNode[] = [];
  for (const e of entries) {
    const parts = e.path.split("/");
    let level = root;
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const name = parts[i];
      let node = level.find((n) => n.name === name);
      if (!node) {
        node = isLast && e.type === "file"
          ? { name, type: "file", path: e.path }
          : { name, type: "folder", children: [], path: parts.slice(0, i + 1).join("/") };
        level.push(node);
      }
      if (node.children) level = node.children;
    }
  }
  const sortLevel = (list: FileNode[]) => {
    list.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1));
    list.forEach((n) => n.children && sortLevel(n.children));
  };
  sortLevel(root);
  return root;
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

function FileTreeItem({
  node,
  depth = 0,
  onSelect,
  selected,
}: {
  node: FileNode;
  depth?: number;
  onSelect: (file: FileNode) => void;
  selected: string | null;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full px-2 py-1 text-xs text-[#9d8ec2] hover:text-white hover:bg-[var(--color-dark-hover)] rounded transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <ChevronRight
            className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          <Folder className="w-3.5 h-3.5 text-slime-400" />
          <span>{node.name}</span>
        </button>
        {expanded && node.children?.map((child) => (
          <FileTreeItem
            key={child.name}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
            selected={selected}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node)}
      className={`flex items-center gap-1.5 w-full px-2 py-1 text-xs rounded transition-colors ${
        selected === node.path
          ? "text-slime-300 bg-slime-700/20 border border-slime-700/30"
          : "text-[#7a6b9d] hover:text-white hover:bg-[var(--color-dark-hover)] border border-transparent"
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <FileText className="w-3.5 h-3.5" />
      <span>{node.name}</span>
    </button>
  );
}

export default function RepoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [repo, setRepo] = useState<Repo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [activeTab, setActiveTab] = useState<"code" | "commits">("code");

  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadTree = () => {
    setTreeLoading(true);
    fetch(`/api/repos/${id}/tree`)
      .then((r) => r.json())
      .then((data) => setFileTree(buildTree(data.tree ?? [])))
      .catch(() => {})
      .finally(() => setTreeLoading(false));
  };

  useEffect(() => {
    fetch(`/api/repos/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setRepo(data);
        setLoading(false);
        if (data) loadTree();
      });
  }, [id]);

  const handleSelectFile = (file: FileNode) => {
    setSaveError(null);
    setEditMode(false);
    if (!file.path) return;
    setSelectedFile({ ...file, content: undefined });
    fetch(`/api/repos/${id}/file?path=${encodeURIComponent(file.path)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSelectedFile({ ...file, content: data.content, sha: data.sha });
          setEditedContent(data.content);
        }
      })
      .catch(() => {});
  };

  const handleSave = async () => {
    if (!selectedFile?.path) return;
    setSaving(true);
    setSaveError(null);
    const res = await fetch(`/api/repos/${id}/file`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: selectedFile.path, content: editedContent, sha: selectedFile.sha }),
    });
    if (res.ok) {
      const fresh = await fetch(
        `/api/repos/${id}/file?path=${encodeURIComponent(selectedFile.path)}`,
      ).then((r) => r.json());
      setSelectedFile({ ...selectedFile, content: editedContent, sha: fresh.sha });
      setEditMode(false);
    } else {
      setSaveError("Save failed - commit rejected");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slime-500 to-goo-700 animate-pulse glow-purple" />
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="text-center py-16">
        <p className="text-[#7a6b9d]">Repository not found</p>
        <Link href="/repos" className="text-slime-400 text-sm mt-2 inline-block hover:text-slime-300">
          ← Back to repositories
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb & Header */}
      <div className="flex items-center gap-2 text-xs text-[#5a4d7a]">
        <Link href="/repos" className="hover:text-slime-300 transition-colors">
          <ArrowLeft className="w-4 h-4 inline mr-1" />
          Repositories
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slime-300">{repo.name}</span>
      </div>

      {/* Repo header card */}
      <div className="slime-card p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slime-500/30 to-goo-700/30 flex items-center justify-center glow-purple">
              <FolderGit2 className="w-6 h-6 text-slime-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{repo.name}</h1>
                {repo.visibility === "private" ? (
                  <Lock className="w-4 h-4 text-[#5a4d7a]" />
                ) : (
                  <Globe className="w-4 h-4 text-[#5a4d7a]" />
                )}
              </div>
              <p className="text-xs text-[#7a6b9d] mt-0.5">{repo.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#9d8ec2] px-3 py-1.5 rounded-lg bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)]">
              <GitBranch className="w-3.5 h-3.5 text-slime-400" />
              {repo.defaultBranch}
            </div>
            <CodeButton repo={repo.name} />
            <div className="flex items-center gap-1 text-xs text-[#5a4d7a]">
              <Star className="w-3.5 h-3.5" /> {repo.stars.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-xs text-[#5a4d7a]">
              <GitFork className="w-3.5 h-3.5" /> {repo.forks}
            </div>
          </div>
        </div>
        {repo.lastCommitMessage && (
          <div className="mt-3 pt-3 border-t border-[var(--color-dark-border)] flex items-center gap-2 text-xs text-[#5a4d7a]">
            <Clock className="w-3 h-3" />
            <span className="text-[#9d8ec2]">{repo.lastCommitMessage}</span>
            <span>—</span>
            <span>{repo.lastCommitAt ? timeAgo(repo.lastCommitAt) : ""}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--color-dark-border)]">
        {(["code", "commits"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-slime-500 text-white"
                : "border-transparent text-[#7a6b9d] hover:text-white"
            }`}
          >
            {tab === "code" ? <Code2 className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Code Editor */}
      {activeTab === "code" && (
        <div className="grid grid-cols-[260px_1fr] gap-0 border border-[var(--color-dark-border)] rounded-xl overflow-hidden min-h-[500px]">
          {/* File Tree */}
          <div className="bg-[var(--color-dark-surface)] border-r border-[var(--color-dark-border)] p-3 overflow-y-auto">
            <p className="text-[10px] font-semibold text-[#5a4d7a] uppercase tracking-widest mb-2 px-2">
              Files
            </p>
            {treeLoading ? (
              <p className="text-xs text-[#5a4d7a] px-2 py-2">Loading files…</p>
            ) : fileTree.length === 0 ? (
              <p className="text-xs text-[#5a4d7a] px-2 py-2">Empty repository.</p>
            ) : (
              fileTree.map((node) => (
                <FileTreeItem
                  key={node.path ?? node.name}
                  node={node}
                  onSelect={handleSelectFile}
                  selected={selectedFile?.path || null}
                />
              ))
            )}
          </div>

          {/* Editor/Viewer */}
          <div className="bg-[var(--color-dark-bg)]">
            {selectedFile ? (
              <div>
                {/* File header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-dark-border)] bg-[var(--color-dark-surface)]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slime-400" />
                    <span className="text-xs text-white font-medium">{selectedFile.name}</span>
                    {selectedFile.language && (
                      <span className="text-[10px] text-[#5a4d7a] bg-[var(--color-dark-card)] px-2 py-0.5 rounded">
                        {selectedFile.language}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editMode ? (
                      <>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-green-600/20 text-green-400 text-xs hover:bg-green-600/30 transition-colors disabled:opacity-50"
                        >
                          <Save className="w-3 h-3" /> {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => setEditMode(false)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600/20 text-red-400 text-xs hover:bg-red-600/30 transition-colors"
                        >
                          <X className="w-3 h-3" /> Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditMode(true)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slime-600/20 text-slime-400 text-xs hover:bg-slime-600/30 transition-colors"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Code content */}
                {saveError && (
                  <div className="px-4 py-1.5 text-xs text-red-400 bg-red-500/10 border-b border-red-500/20">
                    {saveError}
                  </div>
                )}
                {editMode ? (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full min-h-[460px] p-4 bg-transparent text-sm text-slate-200 font-mono leading-relaxed outline-none resize-none"
                    spellCheck={false}
                  />
                ) : (
                  <div className="code-block rounded-none border-0">
                    <pre className="p-4 overflow-x-auto">
                      <code className="text-sm leading-relaxed">
                        {(selectedFile.content || "// Empty file").split("\n").map((line, i) => (
                          <div key={i} className="code-line flex">
                            <span className="code-line-number flex-shrink-0">{i + 1}</span>
                            <span className="text-slate-200">{line}</span>
                          </div>
                        ))}
                      </code>
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Eye className="w-10 h-10 text-[#3a2d5a] mb-3" />
                <p className="text-sm text-[#7a6b9d]">Select a file to view its contents</p>
                <p className="text-xs text-[#4a3f6a] mt-1">Click on any file in the tree on the left</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Commits tab */}
      {activeTab === "commits" && (
        <div className="slime-card p-5">
          <div className="space-y-3">
            {[
              { sha: "a3f8d2e", message: repo.lastCommitMessage || "Initial commit", author: "slime_dev", time: repo.lastCommitAt || new Date().toISOString() },
              { sha: "b7c1e4a", message: "refactor: extract reusable hooks for animation system", author: "gooey_queen", time: new Date(Date.now() - 3600000 * 3).toISOString() },
              { sha: "c4d5e6f", message: "test: add integration tests for drip variants", author: "slime_dev", time: new Date(Date.now() - 3600000 * 8).toISOString() },
              { sha: "d1e2f3a", message: "fix: correct z-index stacking on overlay components", author: "blob_master", time: new Date(Date.now() - 3600000 * 24).toISOString() },
              { sha: "e5f6a7b", message: "docs: update README with installation guide", author: "gooey_queen", time: new Date(Date.now() - 3600000 * 48).toISOString() },
            ].map((commit) => (
              <div key={commit.sha} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--color-dark-hover)] transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slime-700/40 to-goo-800/40 flex items-center justify-center text-[10px] text-slime-300 font-mono flex-shrink-0 mt-0.5">
                  {commit.sha.slice(0, 4)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">{commit.message}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#5a4d7a]">
                    <span className="font-mono text-slime-400/70">{commit.sha}</span>
                    <span>•</span>
                    <span>{commit.author}</span>
                    <span>•</span>
                    <span>{timeAgo(commit.time)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
