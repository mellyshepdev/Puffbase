// ---------------------------------------------------------------------------
// Puffbase document store. Each account gets a private document space -
// create documents, edit files, every save is a real commit with history.
//
// Storage runs on the internal git daemon on puffnet (GIT_INTERNAL_URL /
// GIT_INTERNAL_TOKEN). That daemon is plumbing only: its URL, repo names,
// and API never reach the client. Tenant isolation is the name prefix -
// every document physically lives as `u-<owner8>-<name>` and every function
// below resolves through that prefix, so one account can never address
// another account's space.
// ---------------------------------------------------------------------------

export type DocumentMeta = {
  name: string;
  updatedAt: string;
};

export type TreeEntry = { path: string; type: "file" | "dir"; size: number };

export type DocFile = { path: string; content: string; sha: string };

import { puffToken, daemonUrl } from "@/lib/pufftoken";

// Every call exchanges for the owner's pufftoken via OpenBao - no static
// daemon token lives in this process.
async function storeFetch<T>(owner: string, path: string, init?: RequestInit): Promise<T> {
  const baseUrl = await daemonUrl();
  const token = await puffToken(owner);
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    ...init,
    headers: {
      Authorization: `token ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`document store request failed (${res.status}): ${path}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Login name of the token's account - the physical owner of every space.
 *  Resolved once from the daemon rather than hardcoded. */
let storeAccount: string | undefined;
async function account(owner: string): Promise<string> {
  if (!storeAccount) {
    const me = await storeFetch<{ login: string }>(owner, "/user");
    storeAccount = me.login;
  }
  return storeAccount;
}

function prefix(owner: string): string {
  return `u-${owner.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 8)}`;
}

const DOC_NAME = /^[a-z0-9][a-z0-9-]{0,50}$/;

/** Maps a user-facing document name to its physical repo name. Returns null
 *  for anything that isn't a valid in-space name - callers 404 on null, so
 *  a name can never escape the caller's own prefix. */
function physical(owner: string, name: string): string | null {
  if (!DOC_NAME.test(name)) return null;
  return `${prefix(owner)}-${name}`;
}

type RepoResponse = { name: string; updated_at: string; default_branch: string };

export async function listDocuments(owner: string): Promise<DocumentMeta[]> {
  const data = await storeFetch<{ ok: boolean; data: RepoResponse[] }>(
    owner,
    "/repos/search?limit=200",
  );
  const pfx = `${prefix(owner)}-`;
  return (data.data ?? [])
    .filter((r) => r.name.startsWith(pfx))
    .map((r) => ({ name: r.name.slice(pfx.length), updatedAt: r.updated_at }));
}

export async function createDocument(
  owner: string,
  name: string,
): Promise<DocumentMeta> {
  const repo = physical(owner, name);
  if (!repo) throw new Error("invalid document name");
  const r = await storeFetch<RepoResponse>(owner, "/user/repos", {
    method: "POST",
    body: JSON.stringify({ name: repo, private: true, auto_init: true }),
  });
  return { name, updatedAt: r.updated_at };
}

export async function deleteDocument(owner: string, name: string) {
  const repo = physical(owner, name);
  if (!repo) throw new Error("invalid document name");
  await storeFetch(owner, `/repos/${await account(owner)}/${repo}`, { method: "DELETE" });
}

/* ------------------------------------------------------------------------- *
 * Files. The contents API wants the filepath in the URL path - slashes are
 * real separators, so encode segment by segment, never the whole path.
 * ------------------------------------------------------------------------- */

function encodeFilePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function defaultBranch(owner: string, repo: string): Promise<string> {
  const r = await storeFetch<{ default_branch: string }>(
    owner,
    `/repos/${await account(owner)}/${repo}`,
  );
  return r.default_branch || "main";
}

export async function docTree(owner: string, name: string): Promise<TreeEntry[]> {
  const repo = physical(owner, name);
  if (!repo) throw new Error("invalid document name");
  const branch = await defaultBranch(owner, repo);
  const data = await storeFetch<{
    tree: { path: string; type: string; size: number }[];
  }>(
    owner,
    `/repos/${await account(owner)}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=true`,
  );
  return (data.tree ?? []).map((e) => ({
    path: e.path,
    type: e.type === "blob" ? "file" : "dir",
    size: e.size,
  }));
}

export async function docRead(
  owner: string,
  name: string,
  path: string,
): Promise<DocFile> {
  const repo = physical(owner, name);
  if (!repo) throw new Error("invalid document name");
  const data = await storeFetch<{ content: string; sha: string }>(
    owner,
    `/repos/${await account(owner)}/${repo}/contents/${encodeFilePath(path)}`,
  );
  return {
    path,
    content: Buffer.from(data.content, "base64").toString("utf8"),
    sha: data.sha,
  };
}

export async function docWrite(
  owner: string,
  name: string,
  path: string,
  opts: { content: string; sha?: string; message?: string },
): Promise<void> {
  const repo = physical(owner, name);
  if (!repo) throw new Error("invalid document name");
  await storeFetch(owner, `/repos/${await account(owner)}/${repo}/contents/${encodeFilePath(path)}`, {
    method: "POST",
    body: JSON.stringify({
      content: Buffer.from(opts.content, "utf8").toString("base64"),
      sha: opts.sha,
      branch: await defaultBranch(owner, repo),
      message: opts.message ?? `${opts.sha ? "Update" : "Create"} ${path}`,
    }),
  });
}

export async function docDeleteFile(
  owner: string,
  name: string,
  path: string,
  sha: string,
): Promise<void> {
  const repo = physical(owner, name);
  if (!repo) throw new Error("invalid document name");
  await storeFetch(owner, `/repos/${await account(owner)}/${repo}/contents/${encodeFilePath(path)}`, {
    method: "DELETE",
    body: JSON.stringify({
      sha,
      branch: await defaultBranch(owner, repo),
      message: `Delete ${path}`,
    }),
  });
}
