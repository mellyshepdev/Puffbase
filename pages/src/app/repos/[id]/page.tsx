"use client";

import { useEffect, useRef, useState, use, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  Sparkles,
  Settings,
  RefreshCw,
  Trash2,
  Radio,
  ExternalLink,
  Users,
  Webhook,
  Plug,
  Key,
} from "lucide-react";
import { CodeButton } from "@/components/CodeButton";
import { avatarSrc } from "@/lib/avatar";

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
  mirrorUrl?: string | null;
  mirrorDirection?: string | null;
  isMirror?: boolean;
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

const SETTINGS_SECTIONS = [
  "general",
  "visibility",
  "collaborators",
  "webhooks",
  "integrations",
  "deploy-keys",
  "mirroring",
  "danger",
] as const;
type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export default function RepoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#9d8ec2]">Loading…</div>}>
      <RepoDetail params={params} />
    </Suspense>
  );
}

function RepoDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [repo, setRepo] = useState<Repo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const router = useRouter();
  const search = useSearchParams();
  // Tab + settings section live in the URL so the sidebar's repo-settings
  // menu can drive this page (and links are shareable).
  const tabParam = search.get("tab");
  const activeTab: "code" | "commits" | "settings" =
    tabParam === "commits" || tabParam === "settings" ? tabParam : "code";
  const secParam = search.get("section");
  const settingsSection: SettingsSection = (SETTINGS_SECTIONS as readonly string[]).includes(
    secParam ?? "",
  )
    ? (secParam as SettingsSection)
    : "general";
  const gotoTab = (tab: string, section?: string) => {
    const q = tab === "settings" ? `?tab=settings&section=${section ?? settingsSection}` : `?tab=${tab}`;
    router.push(`/repos/${id}${q}`);
  };
  const [sDesc, setSDesc] = useState("");
  const [sVisibility, setSVisibility] = useState("private");
  const [sMirrorUrl, setSMirrorUrl] = useState("");
  const [sMirrorDir, setSMirrorDir] = useState("push");
  const [sMirrorToken, setSMirrorToken] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [forking, setForking] = useState(false);
  const [forkError, setForkError] = useState<string | null>(null);

  // Repo settings panels
  interface Collaborator { id: string; name: string; avatar: string | null; role: string; kind: string }
  interface Hook { id: string; url: string; events: string[]; enabled: boolean; hasSecret: boolean; createdAt: string }
  interface Integration { id: string; provider: string; externalName: string | null; createdAt: string }
  interface DeployKey { id: string; name: string; fingerprint: string; canPush: boolean; createdAt: string }
  const [collabs, setCollabs] = useState<Collaborator[]>([]);
  const [collabName, setCollabName] = useState("");
  const [collabRole, setCollabRole] = useState("write");
  const [collabBusy, setCollabBusy] = useState(false);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [hookUrl, setHookUrl] = useState("");
  const [hookEvents, setHookEvents] = useState<string[]>(["push"]);
  const [hookSecret, setHookSecret] = useState("");
  const [hookBusy, setHookBusy] = useState(false);
  const [intgs, setIntgs] = useState<Integration[]>([]);
  const [deployKeys, setDeployKeys] = useState<DeployKey[]>([]);
  const [dkName, setDkName] = useState("");
  const [dkKey, setDkKey] = useState("");
  const [dkPush, setDkPush] = useState(false);
  const [dkBusy, setDkBusy] = useState(false);

  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [commitMsg, setCommitMsg] = useState("");
  const [isPro, setIsPro] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [syncingMirror, setSyncingMirror] = useState(false);

  /* Forge live-sync: the editor publishes frames over the forge pad relay
   * (wss://forge.../pad/<room>), the forge Code tab views /view/<room>. */
  const FORGE_ORIGIN = "https://forge.prime-quality.online";
  const syncWs = useRef<WebSocket | null>(null);
  const syncViewWs = useRef<WebSocket | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedFileRef = useRef<FileNode | null>(null);
  const [syncOn, setSyncOn] = useState(false);
  const [syncRoom, setSyncRoom] = useState("");
  const [forgeEditAt, setForgeEditAt] = useState(0);

  useEffect(() => { selectedFileRef.current = selectedFile; }, [selectedFile]);

  const sendCodeFrame = () => {
    if (syncWs.current?.readyState === WebSocket.OPEN && selectedFile?.path) {
      syncWs.current.send(JSON.stringify({
        t: "code",
        repo: repo?.name ?? "",
        path: selectedFile.path,
        lang: selectedFile.language ?? "",
        content: editedContent,
      }));
    }
  };

  const toggleSync = () => {
    if (syncWs.current) {
      syncWs.current.close();
      return;
    }
    const room = `code-${repo?.name ?? "repo"}-${Math.random().toString(36).slice(2, 8)}`;
    const ws = new WebSocket(`wss://forge.prime-quality.online/pad/${room}`);
    syncWs.current = ws;
    setSyncRoom(room);
    ws.onopen = () => { setSyncOn(true); sendCodeFrame(); };
    const closeAll = () => {
      setSyncOn(false); setSyncRoom("");
      syncWs.current = null;
      syncViewWs.current?.close();
      syncViewWs.current = null;
    };
    ws.onclose = closeAll;
    ws.onerror = closeAll;
    /* A second socket on the room's /view side carries edits back: the forge
     * viewer publishes {t:"edit"} frames through its own pad socket. */
    const vws = new WebSocket(`wss://forge.prime-quality.online/view/${room}`);
    syncViewWs.current = vws;
    vws.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data);
        if (m.t === "edit" && typeof m.content === "string" && m.path === selectedFileRef.current?.path) {
          setEditedContent(m.content);
          setForgeEditAt(Date.now());
        }
      } catch { /* malformed frame must not kill the socket */ }
    };
  };

  /* Stream editor changes to forge, lightly debounced so a burst of typing
   * lands as one frame. */
  useEffect(() => {
    if (!syncOn) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(sendCodeFrame, 300);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedContent, syncOn, selectedFile?.path]);

  useEffect(() => () => { syncWs.current?.close(); }, []);

  const loadTree = () => {
    setTreeLoading(true);
    fetch(`/api/repos/${id}/tree`)
      .then((r) => r.json())
      .then((data) => setFileTree(buildTree(data.tree ?? [])))
      .catch(() => {})
      .finally(() => setTreeLoading(false));
  };

  useEffect(() => {
    fetch("/api/plan")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsPro(Boolean(d?.plan && d.plan !== "free")))
      .catch(() => {});
    fetch(`/api/repos/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setRepo(data);
        setLoading(false);
        if (data) {
          loadTree();
          setSDesc(data.description ?? "");
          setSVisibility(data.visibility === "public" ? "public" : "private");
          setSMirrorUrl(data.mirrorUrl ?? "");
          setSMirrorDir(data.mirrorDirection ?? "push");
        }
      });
  }, [id]);

  // Load the active settings section's data on demand.
  useEffect(() => {
    if (activeTab !== "settings") return;
    const j = (r: Response) => (r.ok ? r.json() : null);
    if (settingsSection === "collaborators") {
      fetch(`/api/repos/${id}/collaborators`).then(j).then((d) => d && setCollabs(d.collaborators ?? [])).catch(() => {});
    } else if (settingsSection === "webhooks") {
      fetch(`/api/repos/${id}/webhooks`).then(j).then((d) => d && setHooks(d.webhooks ?? [])).catch(() => {});
    } else if (settingsSection === "integrations") {
      fetch("/api/integrations").then(j).then((d) => d && setIntgs(d.integrations ?? [])).catch(() => {});
    } else if (settingsSection === "deploy-keys") {
      fetch(`/api/repos/${id}/deploy-keys`).then(j).then((d) => d && setDeployKeys(d.deployKeys ?? [])).catch(() => {});
    }
  }, [activeTab, settingsSection, id]);

  const addCollaborator = async () => {
    setCollabBusy(true); setSettingsMsg(null);
    const res = await fetch(`/api/repos/${id}/collaborators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account: collabName, role: collabRole }),
    });
    const d = await res.json().catch(() => ({}));
    setCollabBusy(false);
    if (!res.ok) return setSettingsMsg(d.error ?? "Failed to add partner");
    setCollabName("");
    setCollabs((c) => [...c.filter((x) => x.id !== d.id), { id: d.id, name: d.name, avatar: d.avatar, role: d.role, kind: d.kind ?? "business" }]);
    setSettingsMsg(`Added ${d.name} as a ${d.role} partner`);
  };

  const removeCollaborator = async (cid: string) => {
    await fetch(`/api/repos/${id}/collaborators?id=${cid}`, { method: "DELETE" });
    setCollabs((c) => c.filter((x) => x.id !== cid));
  };

  const addWebhook = async () => {
    setHookBusy(true); setSettingsMsg(null);
    const res = await fetch(`/api/repos/${id}/webhooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: hookUrl, events: hookEvents, secret: hookSecret || undefined }),
    });
    const d = await res.json().catch(() => ({}));
    setHookBusy(false);
    if (!res.ok) return setSettingsMsg(d.error ?? "Failed to add webhook");
    setHookUrl(""); setHookSecret("");
    setHooks((h) => [...h, d]);
    setSettingsMsg("Webhook added");
  };

  const removeWebhook = async (wid: string) => {
    await fetch(`/api/repos/${id}/webhooks?id=${wid}`, { method: "DELETE" });
    setHooks((h) => h.filter((x) => x.id !== wid));
  };

  const addDeployKey = async () => {
    setDkBusy(true); setSettingsMsg(null);
    const res = await fetch(`/api/repos/${id}/deploy-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: dkName, publicKey: dkKey, canPush: dkPush }),
    });
    const d = await res.json().catch(() => ({}));
    setDkBusy(false);
    if (!res.ok) return setSettingsMsg(d.error ?? "Failed to add key");
    setDkName(""); setDkKey(""); setDkPush(false);
    setDeployKeys((k) => [...k, d]);
    setSettingsMsg("Deploy key added");
  };

  const removeDeployKey = async (kid: string) => {
    await fetch(`/api/repos/${id}/deploy-keys?id=${kid}`, { method: "DELETE" });
    setDeployKeys((k) => k.filter((x) => x.id !== kid));
  };

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
      body: JSON.stringify({
        path: selectedFile.path,
        content: editedContent,
        sha: selectedFile.sha,
        message: commitMsg.trim() || `Update ${selectedFile.name ?? selectedFile.path}`,
      }),
    });
    if (res.ok) {
      const fresh = await fetch(
        `/api/repos/${id}/file?path=${encodeURIComponent(selectedFile.path)}`,
      ).then((r) => r.json());
      setSelectedFile({ ...selectedFile, content: editedContent, sha: fresh.sha });
      setEditMode(false);
    } else {
      const d = await res.json().catch(() => ({}));
      setSaveError(d?.error ?? "Save failed - commit rejected");
    }
    setSaving(false);
  };

  const draftCommit = async () => {
    if (!selectedFile?.path) return;
    setDrafting(true);
    setSaveError(null);
    const r = await fetch("/api/commit-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: selectedFile.path,
        before: selectedFile.content ?? "",
        after: editedContent,
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.message) setCommitMsg(d.message);
    else setSaveError(d?.error ?? "Could not draft a commit message");
    setDrafting(false);
  };

  const saveSettings = async (patch: Record<string, unknown>) => {
    setSavingSettings(true);
    setSettingsMsg(null);
    const res = await fetch(`/api/repos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const d = await res.json().catch(() => ({}));
    setSavingSettings(false);
    if (res.ok) {
      setRepo((r) => (r ? { ...r, ...(patch as Partial<Repo>) } : r));
      setSettingsMsg(d.mirrorNote ?? "Saved.");
    } else {
      setSettingsMsg(d?.error ?? "Save failed");
    }
  };

  const handleSyncMirror = async () => {
    setSyncingMirror(true);
    setSettingsMsg(null);
    const res = await fetch(`/api/repos/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync-mirror" }),
    });
    const d = await res.json().catch(() => ({}));
    setSyncingMirror(false);
    setSettingsMsg(res.ok ? "Pull sync kicked off - the daemon is fetching the remote now." : (d?.error ?? "Sync failed"));
  };

  const handleFork = async () => {
    if (!repo || forking) return;
    const name = window.prompt("Fork as:", `${repo.name}-fork`);
    if (!name) return;
    setForking(true);
    setForkError(null);
    const res = await fetch("/api/repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, forkOf: repo.name }),
    });
    const d = await res.json().catch(() => ({}));
    setForking(false);
    if (res.ok) router.push(`/repos/${d.id}`);
    else setForkError(d?.error ?? "Fork failed");
  };

  const handleDelete = async () => {
    if (!repo) return;
    if (!window.confirm(`Delete ${repo.name}? This removes the repo and its history - no undo.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/repos/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/repos");
    else {
      setDeleting(false);
      setSettingsMsg("Delete failed");
    }
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

      {/* Repo header card - overflow visible so the Code clone dropdown isn't clipped */}
      <div className="slime-card p-5" style={{ overflow: "visible" }}>
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
            <button
              onClick={handleFork}
              disabled={forking}
              title="Fork this repo into your workspace"
              className="flex items-center gap-1.5 text-xs text-[#9d8ec2] px-3 py-1.5 rounded-lg bg-[var(--color-dark-bg)] border border-[var(--color-dark-border)] hover:border-slime-500/50 hover:text-white transition-colors disabled:opacity-50"
            >
              <GitFork className="w-3.5 h-3.5 text-slime-400" /> {forking ? "Forking…" : "Fork"}
            </button>
            <div className="flex items-center gap-1 text-xs text-[#5a4d7a]">
              <Star className="w-3.5 h-3.5" /> {repo.stars.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-xs text-[#5a4d7a]">
              <GitFork className="w-3.5 h-3.5" /> {repo.forks}
            </div>
          </div>
        </div>
        {forkError && (
          <p className="mt-3 pt-3 border-t border-[var(--color-dark-border)] text-xs text-red-400">{forkError}</p>
        )}
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
        {(["code", "commits", "settings"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => gotoTab(tab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-slime-500 text-white"
                : "border-transparent text-[#7a6b9d] hover:text-white"
            }`}
          >
            {tab === "code" ? <Code2 className="w-4 h-4" /> : tab === "commits" ? <Terminal className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
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
                        <button
                          onClick={toggleSync}
                          title="Stream your edits live to the Forge code viewer"
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-colors ${syncOn ? "bg-green-600/25 text-green-300" : "bg-[var(--color-dark-card)] text-[#7a6b9d] hover:text-white"}`}
                        >
                          <Radio className={`w-3 h-3 ${syncOn ? "animate-pulse" : ""}`} /> {syncOn ? "Live" : "Sync"}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setEditMode(true);
                          setCommitMsg(`Update ${selectedFile.name}`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slime-600/20 text-slime-400 text-xs hover:bg-slime-600/30 transition-colors"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Code content */}
                {editMode && syncOn && (
                  <div className="px-4 py-2 text-xs bg-green-600/10 border-b border-green-500/20 flex items-center gap-2 flex-wrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-300">Live in Forge</span>
                    <span className="text-[#5a4d7a] font-mono">room {syncRoom}</span>
                    <a
                      href={`${FORGE_ORIGIN}/?mode=code&room=${encodeURIComponent(syncRoom)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-slime-400 hover:text-slime-300"
                    >
                      <ExternalLink className="w-3 h-3" /> Open Forge viewer
                    </a>
                    <button
                      onClick={() => navigator.clipboard.writeText(`${FORGE_ORIGIN}/?mode=code&room=${encodeURIComponent(syncRoom)}`)}
                      className="text-[#7a6b9d] hover:text-white"
                    >
                      Copy link
                    </button>
                    {forgeEditAt > 0 && (
                      <span className="text-green-400/80 ml-auto">
                        Forge edit applied {new Date(forgeEditAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}
                {saveError && (
                  <div className="px-4 py-1.5 text-xs text-red-400 bg-red-500/10 border-b border-red-500/20">
                    {saveError}
                  </div>
                )}
                {editMode ? (
                  <div>
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full min-h-[400px] p-4 bg-transparent text-sm text-slate-200 font-mono leading-relaxed outline-none resize-none"
                      spellCheck={false}
                    />
                    {/* Commit bar - message + commit button, GitHub-style */}
                    <div className="border-t border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] p-4">
                      <p className="text-xs font-semibold text-white mb-2">Commit changes</p>
                      <div className="flex items-center gap-2">
                        <input
                          value={commitMsg}
                          onChange={(e) => setCommitMsg(e.target.value)}
                          placeholder={`Update ${selectedFile.name}`}
                          className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white placeholder-[#5a4d7a] outline-none focus:border-slime-500/50"
                        />
                        {isPro && (
                          <button
                            onClick={draftCommit}
                            disabled={drafting}
                            title="Puff drafts a commit message from your changes (Pro)"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slime-600/20 text-slime-300 text-xs hover:bg-slime-600/30 transition-colors disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> {drafting ? "Writing…" : "Write for me"}
                          </button>
                        )}
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="slime-btn flex items-center gap-1.5 text-xs py-2 px-4"
                        >
                          <Save className="w-3.5 h-3.5" /> {saving ? "Committing…" : "Commit"}
                        </button>
                      </div>
                      <p className="text-[11px] text-[#5a4d7a] mt-2">
                        Commits straight to <span className="font-mono text-slime-400/80">{repo.defaultBranch}</span>. Leave the message as-is for the generic one.
                      </p>
                    </div>
                  </div>
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

      {/* Settings tab - the section menu lives in the left sidebar */}
      {activeTab === "settings" && (
        <div className="border border-[var(--color-dark-border)] rounded-xl overflow-hidden min-h-[400px]">
          <div className="bg-[var(--color-dark-bg)] p-5 space-y-4">
            {settingsMsg && (
              <p className={`text-xs ${/fail|reject|error/i.test(settingsMsg) ? "text-red-400" : "text-slime-300"}`}>{settingsMsg}</p>
            )}

            {settingsSection === "general" && (
              <>
                <h3 className="text-sm font-semibold text-white">General</h3>
                <div>
                  <label className="block text-xs text-[#7a6b9d] mb-1">Repository name</label>
                  <input value={repo.name} disabled className="w-full max-w-sm px-3 py-2 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] text-sm text-[#5a4d7a] cursor-not-allowed" />
                  <p className="text-[11px] text-[#5a4d7a] mt-1">Renames are not supported yet - the store path is fixed at creation.</p>
                </div>
                <div>
                  <label className="block text-xs text-[#7a6b9d] mb-1">Description</label>
                  <textarea value={sDesc} onChange={(e) => setSDesc(e.target.value)} rows={3} className="w-full max-w-sm px-3 py-2 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] text-sm text-white outline-none resize-none focus:border-slime-500/50" />
                </div>
                <button onClick={() => saveSettings({ description: sDesc })} disabled={savingSettings} className="slime-btn text-xs py-2 px-4 disabled:opacity-50">
                  {savingSettings ? "Saving…" : "Save"}
                </button>
              </>
            )}

            {settingsSection === "visibility" && (
              <>
                <h3 className="text-sm font-semibold text-white">Visibility</h3>
                <div className="space-y-2 max-w-sm">
                  {([
                    { value: "private", label: "Private", desc: "Only you and your groups can see this repo." },
                    { value: "public", label: "Public", desc: "Anyone on Puffbase can view this repo." },
                  ] as const).map((o) => (
                    <label key={o.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${sVisibility === o.value ? "border-slime-500/50 bg-slime-600/10" : "border-[var(--color-dark-border)] hover:border-[#4a3f6a]"}`}>
                      <input type="radio" name="visibility" checked={sVisibility === o.value} onChange={() => setSVisibility(o.value)} className="mt-0.5 accent-slime-500" />
                      <span>
                        <span className="block text-sm text-white font-medium">{o.label}</span>
                        <span className="block text-[11px] text-[#7a6b9d] mt-0.5">{o.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <button onClick={() => saveSettings({ visibility: sVisibility })} disabled={savingSettings || sVisibility === repo.visibility} className="slime-btn text-xs py-2 px-4 disabled:opacity-50">
                  {savingSettings ? "Saving…" : "Change visibility"}
                </button>
              </>
            )}

            {settingsSection === "collaborators" && (
              <>
                <h3 className="text-sm font-semibold text-white">Collaborations</h3>
                <p className="text-[11px] text-[#7a6b9d] max-w-md">
                  Business partners - other Puffbase accounts allowed to work on this repo.
                </p>
                <div className="max-w-md space-y-2">
                  {collabs.length === 0 && (
                    <p className="text-xs text-[#5a4d7a]">No partners on this repo yet.</p>
                  )}
                  {collabs.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--color-dark-border)]">
                      <img src={avatarSrc(c.avatar)} alt="" className="w-7 h-7 rounded-full object-cover" />
                      <span className="text-sm text-white flex-1">{c.name}</span>
                      <span className="text-[10px] uppercase tracking-wider text-slime-300 bg-slime-600/20 px-2 py-0.5 rounded">{c.role}</span>
                      <button onClick={() => removeCollaborator(c.id)} className="text-[#7a6b9d] hover:text-red-400 transition-colors" title="Remove partner">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-end gap-2 max-w-md">
                  <div className="flex-1">
                    <label className="block text-xs text-[#7a6b9d] mb-1">Partner account name</label>
                    <input value={collabName} onChange={(e) => setCollabName(e.target.value)} placeholder="e.g. Tobsco" className="w-full px-3 py-2 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] text-sm text-white placeholder-[#5a4d7a] outline-none focus:border-slime-500/50" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#7a6b9d] mb-1">Role</label>
                    <select value={collabRole} onChange={(e) => setCollabRole(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] text-sm text-white outline-none">
                      <option value="read">Read</option>
                      <option value="write">Write</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button onClick={addCollaborator} disabled={collabBusy || !collabName.trim()} className="slime-btn text-xs py-2 px-4 disabled:opacity-50">
                    <Users className="w-3.5 h-3.5 inline mr-1" />{collabBusy ? "Adding…" : "Add partner"}
                  </button>
                </div>
              </>
            )}

            {settingsSection === "webhooks" && (
              <>
                <h3 className="text-sm font-semibold text-white">Webhooks</h3>
                <p className="text-[11px] text-[#7a6b9d] max-w-md">
                  POST a JSON payload to your URL when repo events happen. If you set a secret, deliveries are signed in the <span className="font-mono">X-Puffbase-Signature</span> header - secrets are never shown after saving.
                </p>
                <div className="max-w-lg space-y-2">
                  {hooks.length === 0 && (
                    <p className="text-xs text-[#5a4d7a]">No webhooks yet.</p>
                  )}
                  {hooks.map((h) => (
                    <div key={h.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--color-dark-border)]">
                      <Webhook className="w-4 h-4 text-slime-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{h.url}</p>
                        <p className="text-[10px] text-[#5a4d7a]">
                          {(h.events.length ? h.events : ["all events"]).join(" · ")}{h.hasSecret ? " · signed" : ""}
                        </p>
                      </div>
                      <button onClick={() => removeWebhook(h.id)} className="text-[#7a6b9d] hover:text-red-400 transition-colors" title="Delete webhook">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="max-w-md space-y-3">
                  <div>
                    <label className="block text-xs text-[#7a6b9d] mb-1">Payload URL</label>
                    <input value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} placeholder="https://example.com/hook" className="w-full px-3 py-2 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] text-sm text-white placeholder-[#5a4d7a] outline-none focus:border-slime-500/50" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#7a6b9d] mb-1">Events</label>
                    <div className="flex flex-wrap gap-3">
                      {["push", "issues", "pipelines", "deployments"].map((ev) => (
                        <label key={ev} className="flex items-center gap-1.5 text-xs text-[#9d8ec2] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hookEvents.includes(ev)}
                            onChange={(e) => setHookEvents((p) => e.target.checked ? [...p, ev] : p.filter((x) => x !== ev))}
                            className="accent-slime-500"
                          />
                          {ev}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[#7a6b9d] mb-1">Secret (optional)</label>
                    <input type="password" value={hookSecret} onChange={(e) => setHookSecret(e.target.value)} placeholder="Signing secret" className="w-full px-3 py-2 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] text-sm text-white placeholder-[#5a4d7a] outline-none focus:border-slime-500/50" />
                  </div>
                  <button onClick={addWebhook} disabled={hookBusy || !hookUrl.trim()} className="slime-btn text-xs py-2 px-4 disabled:opacity-50">
                    {hookBusy ? "Adding…" : "Add webhook"}
                  </button>
                </div>
              </>
            )}

            {settingsSection === "integrations" && (
              <>
                <h3 className="text-sm font-semibold text-white">Integrations</h3>
                <p className="text-[11px] text-[#7a6b9d] max-w-md">
                  Third-party providers connected to this workspace. Repo-to-repo syncing with them is handled under Mirroring.
                </p>
                <div className="max-w-md space-y-2">
                  {intgs.length === 0 && (
                    <p className="text-xs text-[#5a4d7a]">No integrations connected yet.</p>
                  )}
                  {intgs.map((i) => (
                    <div key={i.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--color-dark-border)]">
                      <Plug className="w-4 h-4 text-slime-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white capitalize">{i.provider}</p>
                        {i.externalName && <p className="text-[10px] text-[#5a4d7a] truncate">{i.externalName}</p>}
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-slime-300 bg-slime-600/20 px-2 py-0.5 rounded">connected</span>
                    </div>
                  ))}
                </div>
                <Link href="/integrations" className="inline-flex items-center gap-1.5 text-xs text-slime-300 hover:text-slime-200 transition-colors">
                  Manage integrations <ExternalLink className="w-3 h-3" />
                </Link>
              </>
            )}

            {settingsSection === "deploy-keys" && (
              <>
                <h3 className="text-sm font-semibold text-white">Deploy keys</h3>
                <p className="text-[11px] text-[#7a6b9d] max-w-md">
                  SSH keys that grant automated systems access to this repo only. Read-only unless you check "allow push".
                </p>
                <div className="max-w-lg space-y-2">
                  {deployKeys.length === 0 && (
                    <p className="text-xs text-[#5a4d7a]">No deploy keys yet.</p>
                  )}
                  {deployKeys.map((k) => (
                    <div key={k.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--color-dark-border)]">
                      <Key className="w-4 h-4 text-slime-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{k.name}</p>
                        <p className="text-[10px] text-[#5a4d7a] font-mono truncate">{k.fingerprint}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-slime-300 bg-slime-600/20 px-2 py-0.5 rounded">{k.canPush ? "read/write" : "read-only"}</span>
                      <button onClick={() => removeDeployKey(k.id)} className="text-[#7a6b9d] hover:text-red-400 transition-colors" title="Remove key">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="max-w-md space-y-3">
                  <div>
                    <label className="block text-xs text-[#7a6b9d] mb-1">Title</label>
                    <input value={dkName} onChange={(e) => setDkName(e.target.value)} placeholder="e.g. CI server" className="w-full px-3 py-2 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] text-sm text-white placeholder-[#5a4d7a] outline-none focus:border-slime-500/50" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#7a6b9d] mb-1">Public key</label>
                    <textarea value={dkKey} onChange={(e) => setDkKey(e.target.value)} rows={3} placeholder="ssh-ed25519 AAAA…" className="w-full px-3 py-2 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] text-sm text-white placeholder-[#5a4d7a] outline-none resize-none font-mono focus:border-slime-500/50" />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#9d8ec2] cursor-pointer">
                    <input type="checkbox" checked={dkPush} onChange={(e) => setDkPush(e.target.checked)} className="accent-slime-500" />
                    Allow push access
                  </label>
                  <button onClick={addDeployKey} disabled={dkBusy || !dkName.trim() || !dkKey.trim()} className="slime-btn text-xs py-2 px-4 disabled:opacity-50">
                    {dkBusy ? "Adding…" : "Add deploy key"}
                  </button>
                </div>
              </>
            )}

            {settingsSection === "mirroring" && (
              <>
                <h3 className="text-sm font-semibold text-white">Mirroring</h3>
                <div className="max-w-sm space-y-3">
                  <div>
                    <label className="block text-xs text-[#7a6b9d] mb-1">Direction</label>
                    <select value={sMirrorDir} onChange={(e) => setSMirrorDir(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] text-sm text-white outline-none">
                      <option value="push">Push - this repo mirrors out to a remote</option>
                      <option value="pull">Pull - this repo syncs in from a remote</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#7a6b9d] mb-1">Remote URL</label>
                    <input value={sMirrorUrl} onChange={(e) => setSMirrorUrl(e.target.value)} placeholder="https://github.com/you/project.git" className="w-full px-3 py-2 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] text-sm text-white placeholder-[#5a4d7a] outline-none focus:border-slime-500/50" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#7a6b9d] mb-1">Access token (optional)</label>
                    <input type="password" value={sMirrorToken} onChange={(e) => setSMirrorToken(e.target.value)} placeholder="For private remotes" className="w-full px-3 py-2 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] text-sm text-white placeholder-[#5a4d7a] outline-none focus:border-slime-500/50" />
                  </div>
                  <p className="text-[11px] text-[#5a4d7a]">
                    Push mirrors sync on every commit and register on the store immediately.
                    {repo.isMirror
                      ? " This repo is a pull mirror - the store re-pulls the remote every 8 hours."
                      : " Pull mirroring only works on repos created via Import with \"keep in sync\" checked - the store can't retrofit a mirror onto an existing repo."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => saveSettings({ mirrorUrl: sMirrorUrl, mirrorDirection: sMirrorDir, mirrorToken: sMirrorToken || undefined })} disabled={savingSettings} className="slime-btn text-xs py-2 px-4 disabled:opacity-50">
                    {savingSettings ? "Saving…" : sMirrorUrl ? "Save mirror" : "Clear mirror"}
                  </button>
                  {repo.isMirror && (
                    <button onClick={handleSyncMirror} disabled={syncingMirror} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slime-600/20 text-slime-300 text-xs hover:bg-slime-600/30 transition-colors disabled:opacity-50">
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingMirror ? "animate-spin" : ""}`} /> {syncingMirror ? "Syncing…" : "Sync now"}
                    </button>
                  )}
                </div>
              </>
            )}

            {settingsSection === "danger" && (
              <>
                <h3 className="text-sm font-semibold text-red-400">Danger zone</h3>
                <div className="max-w-md rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                  <p className="text-sm text-white font-medium">Delete this repository</p>
                  <p className="text-[11px] text-[#7a6b9d] mt-1 mb-3">Removes <span className="font-mono">{repo.name}</span> and its full history from the store. There is no undo.</p>
                  <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600/20 text-red-400 text-xs hover:bg-red-600/30 transition-colors disabled:opacity-50">
                    <Trash2 className="w-3.5 h-3.5" /> {deleting ? "Deleting…" : `Delete ${repo.name}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
