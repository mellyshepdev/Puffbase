import { useState } from "react";
import Editor from "@monaco-editor/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileCode,
  FilePlus,
  FolderPlus,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageShell, SectionTitle } from "@/components/kit";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { relativeTime } from "@/lib/data";

type DocumentMeta = { name: string; updatedAt: string };
type TreeEntry = { path: string; type: "file" | "dir"; size: number };
type DocFile = { path: string; content: string; sha: string };

const NAME_RE = /^[a-z0-9][a-z0-9-]{0,50}$/;

function langFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    html: "html", css: "css", js: "javascript", ts: "typescript",
    tsx: "typescript", jsx: "javascript", json: "json", md: "markdown",
    py: "python", yaml: "yaml", yml: "yaml", sh: "shell", sql: "sql",
  };
  return map[ext] ?? "plaintext";
}

export default function Documents() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [doc, setDoc] = useState<string | null>(null);
  const [file, setFile] = useState<DocFile | null>(null);
  const [draft, setDraft] = useState("");
  const [newDoc, setNewDoc] = useState("");
  const [newFile, setNewFile] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);

  const docs = useQuery<DocumentMeta[]>({ queryKey: ["/api/documents"] });

  const tree = useQuery<TreeEntry[]>({
    queryKey: ["/api/documents", doc ?? "", "tree"],
    enabled: !!doc,
  });

  const dirty = file !== null && draft !== file.content;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
  };

  const createDoc = useMutation({
    mutationFn: (name: string) =>
      apiRequest("POST", "/api/documents", { name }),
    onSuccess: (_r, name) => {
      setNewDoc("");
      setDoc(name);
      refresh();
    },
    onError: () =>
      toast({ title: "Couldn't create document", variant: "destructive" }),
  });

  const deleteDoc = useMutation({
    mutationFn: (name: string) =>
      apiRequest("DELETE", `/api/documents/${name}`),
    onSuccess: (_r, name) => {
      if (doc === name) {
        setDoc(null);
        setFile(null);
      }
      refresh();
    },
    onError: () =>
      toast({ title: "Couldn't delete document", variant: "destructive" }),
  });

  async function openFile(path: string) {
    if (!doc) return;
    setLoadingFile(true);
    try {
      const res = await fetch(
        `/api/documents/${doc}/file?path=${encodeURIComponent(path)}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error();
      const data = (await res.json()) as DocFile;
      setFile(data);
      setDraft(data.content);
    } catch {
      toast({ title: "Couldn't open file", variant: "destructive" });
    } finally {
      setLoadingFile(false);
    }
  }

  const saveFile = useMutation({
    mutationFn: () =>
      apiRequest("PUT", `/api/documents/${doc}/file`, {
        path: file!.path,
        content: draft,
        sha: file!.sha,
      }),
    onSuccess: () => {
      setFile(file ? { ...file, content: draft } : file);
      toast({ title: "Saved", description: file?.path });
      tree.refetch();
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const createFile = useMutation({
    mutationFn: (path: string) =>
      apiRequest("PUT", `/api/documents/${doc}/file`, { path, content: "" }),
    onSuccess: (_r, path) => {
      setNewFile("");
      tree.refetch().then(() => openFile(path));
    },
    onError: () =>
      toast({ title: "Couldn't create file", variant: "destructive" }),
  });

  const deleteFile = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", `/api/documents/${doc}/file`, {
        path: file!.path,
        sha: file!.sha,
      }),
    onSuccess: () => {
      setFile(null);
      tree.refetch();
    },
    onError: () =>
      toast({ title: "Couldn't delete file", variant: "destructive" }),
  });

  const files = (tree.data ?? []).filter((e) => e.type === "file");

  return (
    <PageShell>
      <SectionTitle hint="Your private file space - every save is a commit">
        Documents
      </SectionTitle>

      <div className="mt-4 grid gap-4 lg:grid-cols-[16rem_1fr]">
        {/* document list */}
        <Card className="h-fit space-y-2 p-3">
          <div className="flex gap-1.5">
            <Input
              value={newDoc}
              onChange={(e) => setNewDoc(e.target.value)}
              placeholder="new-document"
              className="h-8 font-mono text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && NAME_RE.test(newDoc))
                  createDoc.mutate(newDoc);
              }}
            />
            <Button
              size="sm"
              className="h-8 px-2"
              disabled={!NAME_RE.test(newDoc) || createDoc.isPending}
              onClick={() => createDoc.mutate(newDoc)}
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {docs.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (docs.data ?? []).length === 0 ? (
            <p className="p-2 font-mono text-[11px] text-muted-foreground">
              No documents yet. Create one above.
            </p>
          ) : (
            (docs.data ?? []).map((d) => (
              <div
                key={d.name}
                className={`group flex items-center gap-2 rounded px-2 py-1.5 font-mono text-xs ${
                  doc === d.name
                    ? "bg-primary/15 text-primary"
                    : "hover:bg-accent/50"
                }`}
              >
                <button
                  className="min-w-0 flex-1 truncate text-left"
                  onClick={() => {
                    setDoc(d.name);
                    setFile(null);
                  }}
                >
                  {d.name}
                  <span className="ml-2 text-[10px] text-muted-foreground">
                    {relativeTime(d.updatedAt)}
                  </span>
                </button>
                <button
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  title="Delete document"
                  onClick={() => {
                    if (confirm(`Delete "${d.name}" and all its files?`))
                      deleteDoc.mutate(d.name);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            ))
          )}
        </Card>

        {/* file tree + editor */}
        {!doc ? (
          <EmptyState
            title="Pick or create a document"
            hint="Documents hold files in your own private space. Only you can see them."
          />
        ) : (
          <Card className="flex min-h-[32rem] flex-col">
            <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-2">
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                {files.map((f) => (
                  <button
                    key={f.path}
                    onClick={() => openFile(f.path)}
                    className={`flex shrink-0 items-center gap-1 rounded px-2 py-1 font-mono text-[11px] ${
                      file?.path === f.path
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-accent/50"
                    }`}
                  >
                    <FileCode className="h-3 w-3" />
                    {f.path}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  value={newFile}
                  onChange={(e) => setNewFile(e.target.value)}
                  placeholder="path/file.md"
                  className="h-7 w-36 font-mono text-[11px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newFile.trim())
                      createFile.mutate(newFile.trim());
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2"
                  disabled={!newFile.trim() || createFile.isPending}
                  onClick={() => createFile.mutate(newFile.trim())}
                >
                  <FilePlus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {loadingFile ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !file ? (
              <div className="flex flex-1 items-center justify-center font-mono text-xs text-muted-foreground">
                {tree.isLoading
                  ? "loading..."
                  : files.length === 0
                    ? "empty document - create a file above"
                    : "select a file"}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-border/60 px-3 py-1.5">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {file.path}
                  </span>
                  {dirty && (
                    <span className="font-mono text-[10px] text-primary">
                      unsaved
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2"
                      onClick={() => {
                        if (confirm(`Delete ${file.path}?`))
                          deleteFile.mutate();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 px-3"
                      disabled={!dirty || saveFile.isPending}
                      onClick={() => saveFile.mutate()}
                    >
                      <Save className="mr-1 h-3.5 w-3.5" />
                      Save
                    </Button>
                  </div>
                </div>
                <div className="min-h-0 flex-1">
                  <Editor
                    height="100%"
                    language={langFor(file.path)}
                    theme="vs-dark"
                    value={draft}
                    onChange={(v) => setDraft(v ?? "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                    }}
                  />
                </div>
              </>
            )}
          </Card>
        )}
      </div>
    </PageShell>
  );
}
