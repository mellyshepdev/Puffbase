"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  Folder,
  Plus,
  Save,
  Trash2,
  ArrowLeft,
  Code2,
  Loader2,
  FilePlus2,
} from "lucide-react";
import Link from "next/link";

interface DocMeta {
  name: string;
  updatedAt: string;
}

interface TreeEntry {
  path: string;
  type: "file" | "dir";
  size: number;
}

interface OpenFile {
  path: string;
  sha: string;
  content: string;
  dirty: boolean;
}

function ext(path: string): string {
  return path.split(".").pop() ?? "";
}

export default function EditorPage() {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [doc, setDoc] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeEntry[]>([]);
  const [file, setFile] = useState<OpenFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newDoc, setNewDoc] = useState("");
  const [newFile, setNewFile] = useState("");

  const loadDocs = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/editor");
    if (res.ok) {
      const data = await res.json();
      setDocs(data.documents ?? []);
    } else {
      setError("Could not load your documents");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  const openDoc = async (name: string) => {
    setDoc(name);
    setFile(null);
    setTree([]);
    const res = await fetch(`/api/editor/${encodeURIComponent(name)}`);
    if (res.ok) {
      const data = await res.json();
      setTree(data.tree ?? []);
    } else {
      setError("Could not open document");
    }
  };

  const openFile = async (path: string) => {
    if (!doc) return;
    const res = await fetch(
      `/api/editor/${encodeURIComponent(doc)}/file?path=${encodeURIComponent(path)}`,
    );
    if (res.ok) {
      const data = await res.json();
      setFile({ path, sha: data.sha, content: data.content, dirty: false });
    } else {
      setError(`Could not open ${path}`);
    }
  };

  const createDoc = async () => {
    const name = newDoc.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!name) return;
    const res = await fetch("/api/editor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setNewDoc("");
      await loadDocs();
      await openDoc(name);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not create document");
    }
  };

  const saveFile = async () => {
    if (!doc || !file) return;
    setSaving(true);
    const res = await fetch(`/api/editor/${encodeURIComponent(doc)}/file`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: file.path, content: file.content, sha: file.sha }),
    });
    if (res.ok) {
      const fresh = await fetch(
        `/api/editor/${encodeURIComponent(doc)}/file?path=${encodeURIComponent(file.path)}`,
      );
      const data = await fresh.json();
      setFile({ path: file.path, sha: data.sha, content: data.content, dirty: false });
      await openDoc(doc);
    } else {
      setError("Save failed");
    }
    setSaving(false);
  };

  const createFile = async () => {
    if (!doc) return;
    const path = newFile.trim();
    if (!path) return;
    const res = await fetch(`/api/editor/${encodeURIComponent(doc)}/file`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content: "", message: `Create ${path}` }),
    });
    if (res.ok) {
      setNewFile("");
      await openDoc(doc);
      await openFile(path);
    } else {
      setError("Could not create file");
    }
  };

  const deleteFile = async () => {
    if (!doc || !file) return;
    if (!window.confirm(`Delete ${file.path}? This commits the deletion.`)) return;
    const res = await fetch(
      `/api/editor/${encodeURIComponent(doc)}/file?path=${encodeURIComponent(file.path)}&sha=${encodeURIComponent(file.sha)}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      setFile(null);
      await openDoc(doc);
    } else {
      setError("Delete failed");
    }
  };

  const deleteDoc = async (name: string) => {
    if (!window.confirm(`Delete document "${name}" and all its files?`)) return;
    const res = await fetch(`/api/editor/${encodeURIComponent(name)}`, { method: "DELETE" });
    if (res.ok) {
      if (doc === name) {
        setDoc(null);
        setFile(null);
        setTree([]);
      }
      await loadDocs();
    } else {
      setError("Delete failed");
    }
  };

  const files = tree.filter((t) => t.type === "file");

  return (
    <div className="min-h-screen bg-[#0d0d12] text-zinc-100 flex flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-white/10 bg-[#131318] px-4 h-14 shrink-0">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-slime-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slime-500 to-emerald-700 flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold tracking-tight">Puffbase Editor</span>
        </div>
        {doc && <span className="text-xs text-zinc-500 font-mono">{doc}</span>}
        <div className="ml-auto flex items-center gap-2">
          {file && (
            <>
              <button
                onClick={deleteFile}
                className="flex items-center gap-1.5 px-3 h-8 rounded-md text-xs border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button
                onClick={saveFile}
                disabled={saving || !file.dirty}
                className="flex items-center gap-1.5 px-3 h-8 rounded-md text-xs bg-slime-600 hover:bg-slime-500 disabled:opacity-40 text-white transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save{file.dirty ? "*" : ""}
              </button>
            </>
          )}
        </div>
      </header>

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/30 text-red-300 text-xs px-4 py-2 flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">✕</button>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Sidebar: documents + files */}
        <aside className="w-64 shrink-0 border-r border-white/10 bg-[#131318] flex flex-col min-h-0">
          <div className="p-3 border-b border-white/10">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Documents</div>
            <div className="flex gap-1.5">
              <input
                value={newDoc}
                onChange={(e) => setNewDoc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createDoc()}
                placeholder="new-document"
                className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-md px-2 h-7 text-xs focus:outline-none focus:border-slime-500/50"
              />
              <button
                onClick={createDoc}
                className="w-7 h-7 rounded-md bg-slime-600 hover:bg-slime-500 flex items-center justify-center text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 min-h-0">
            {loading ? (
              <div className="flex items-center gap-2 text-zinc-500 text-xs p-3">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
              </div>
            ) : docs.length === 0 ? (
              <div className="text-zinc-600 text-xs p-3">
                No documents yet. Create one above to start editing — every save is a versioned commit.
              </div>
            ) : (
              docs.map((d) => (
                <div
                  key={d.name}
                  className={`group flex items-center gap-2 rounded-md px-2.5 py-2 cursor-pointer text-sm transition-colors ${
                    doc === d.name ? "bg-slime-600/20 text-slime-300" : "text-zinc-300 hover:bg-white/5"
                  }`}
                  onClick={() => openDoc(d.name)}
                >
                  <Folder className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="truncate font-mono text-xs">{d.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDoc(d.name);
                    }}
                    className="ml-auto opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity"
                    aria-label={`Delete ${d.name}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}

            {doc && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 px-2">Files</div>
                <div className="flex gap-1.5 px-1.5 mb-2">
                  <input
                    value={newFile}
                    onChange={(e) => setNewFile(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createFile()}
                    placeholder="path/to/file.ts"
                    className="flex-1 min-w-0 bg-black/30 border border-white/10 rounded-md px-2 h-7 text-xs font-mono focus:outline-none focus:border-slime-500/50"
                  />
                  <button
                    onClick={createFile}
                    className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors"
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {files.map((f) => (
                  <div
                    key={f.path}
                    onClick={() => openFile(f.path)}
                    className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 cursor-pointer text-xs font-mono transition-colors ${
                      file?.path === f.path
                        ? "bg-slime-600/20 text-slime-300"
                        : "text-zinc-400 hover:bg-white/5"
                    }`}
                  >
                    <FileText className="w-3 h-3 shrink-0 text-zinc-600" />
                    <span className="truncate">{f.path}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Editor pane */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          {file ? (
            <>
              <div className="flex items-center gap-2 border-b border-white/10 px-4 h-9 text-xs text-zinc-500 shrink-0">
                <FileText className="w-3.5 h-3.5" />
                <span className="font-mono">{file.path}</span>
                <span className="text-zinc-600">.{ext(file.path)}</span>
                {file.dirty && <span className="text-slime-400">modified</span>}
              </div>
              <textarea
                value={file.content}
                onChange={(e) => setFile({ ...file, content: e.target.value, dirty: true })}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                    e.preventDefault();
                    void saveFile();
                  }
                }}
                spellCheck={false}
                className="flex-1 w-full bg-[#0d0d12] text-zinc-200 font-mono text-[13px] leading-relaxed p-4 resize-none focus:outline-none"
                placeholder="Start typing…"
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3">
              <Code2 className="w-10 h-10 text-zinc-700" />
              <p className="text-sm">
                {doc ? "Pick a file, or create one in the sidebar" : "Pick a document to open, or create a new one"}
              </p>
              <p className="text-xs text-zinc-700">Every save is a versioned commit — full history, always.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
