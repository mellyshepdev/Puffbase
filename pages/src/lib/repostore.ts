// ---------------------------------------------------------------------------
// Account repositories. Every repo a user creates or imports lives as a real
// private repo on the internal git daemon, named `r-<account8>-<name>`.
// Same plumbing rule as gitstore.ts: the daemon URL, physical repo names,
// and its API never reach the client - callers only ever address their own
// account's prefix.
// ---------------------------------------------------------------------------

export type RepoMeta = {
  name: string;
  description: string;
  defaultBranch: string;
  updatedAt: string;
};

export type TreeEntry = { path: string; type: "file" | "dir"; size: number };

export type RepoFile = { path: string; content: string; sha: string };

import { puffToken, daemonUrl } from "@/lib/pufftoken";

// Every call exchanges for the account's pufftoken via OpenBao - no static
// daemon token lives in this process.
async function storeFetch<T>(accountId: string, path: string, init?: RequestInit): Promise<T> {
  const baseUrl = await daemonUrl();
  const token = await puffToken(accountId);
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    ...init,
    headers: {
      Authorization: `token ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`repo store request failed (${res.status}): ${path}${body ? ` ${body.slice(0, 160)}` : ""}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const storeAccounts = new Map<string, string>();
async function account(accountId: string): Promise<string> {
  let login = storeAccounts.get(accountId);
  if (!login) {
    const me = await storeFetch<{ login: string }>(accountId, "/user");
    login = me.login;
    storeAccounts.set(accountId, login);
  }
  return login;
}

function prefix(accountId: string): string {
  return `r-${accountId.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 8)}`;
}

const REPO_NAME = /^[a-z0-9][a-z0-9-_.]{0,80}$/;

/** Maps a user-facing repo name to its physical name. Null = invalid name. */
function physical(accountId: string, name: string): string | null {
  if (!REPO_NAME.test(name)) return null;
  return `${prefix(accountId)}-${name}`;
}

type RepoResponse = {
  name: string;
  description: string;
  updated_at: string;
  default_branch: string;
};

export async function createRepo(
  accountId: string,
  name: string,
  description = "",
  opts: { readme?: boolean; gitignore?: string } = {},
): Promise<RepoMeta> {
  const repo = physical(accountId, name);
  if (!repo) throw new Error("invalid repo name");
  const r = await storeFetch<RepoResponse>(accountId, "/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name: repo,
      private: true,
      auto_init: true,
      readme: opts.readme === false ? "" : "Default",
      ...(opts.gitignore ? { gitignores: opts.gitignore } : {}),
      description,
    }),
  });
  return { name, description, defaultBranch: r.default_branch, updatedAt: r.updated_at };
}

/** Import (clone) a repo from GitHub/GitLab/etc via the daemon's migrate API. */
export async function migrateRepo(
  accountId: string,
  name: string,
  cloneAddr: string,
  opts: { service: "github" | "gitlab"; authToken?: string; description?: string },
): Promise<RepoMeta> {
  const repo = physical(accountId, name);
  if (!repo) throw new Error("invalid repo name");
  const r = await storeFetch<RepoResponse>(accountId, "/repos/migrate", {
    method: "POST",
    body: JSON.stringify({
      clone_addr: cloneAddr,
      repo_name: repo,
      service: opts.service,
      auth_token: opts.authToken,
      private: true,
      mirror: false,
      description: opts.description ?? "",
    }),
  });
  return {
    name,
    description: opts.description ?? "",
    defaultBranch: r.default_branch,
    updatedAt: r.updated_at,
  };
}

export interface PullMeta {
  id: number;
  number: number;
  title: string;
  state: string;
  headBranch: string;
  baseBranch: string;
  user: string;
  createdAt: string;
}

/** Open pull requests on one of the account's repos (daemon-side). */
export async function listPulls(accountId: string, name: string): Promise<PullMeta[]> {
  const repo = physical(accountId, name);
  if (!repo) return [];
  const prs = await storeFetch<{
    id: number; number: number; title: string; state: string; html_url: string;
    head?: { ref?: string }; base?: { ref?: string };
    user?: { login?: string }; created_at?: string;
  }[]>(accountId, `/repos/${await account(accountId)}/${repo}/pulls?state=open&limit=50`);
  return prs.map((p) => ({
    id: p.id,
    number: p.number,
    title: p.title,
    state: p.state,
    headBranch: p.head?.ref ?? "",
    baseBranch: p.base?.ref ?? "",
    user: p.user?.login ?? "",
    createdAt: p.created_at ?? "",
  }));
}

/** Open a merge request on one of the account's repos. */
export async function createPull(
  accountId: string,
  name: string,
  opts: { head: string; base: string; title: string; body?: string },
): Promise<PullMeta> {
  const repo = physical(accountId, name);
  if (!repo) throw new Error("invalid repo name");
  const p = await storeFetch<{
    id: number; number: number; title: string; state: string; html_url: string;
    head?: { ref?: string }; base?: { ref?: string };
    user?: { login?: string }; created_at?: string;
  }>(accountId, `/repos/${await account(accountId)}/${repo}/pulls`, {
    method: "POST",
    body: JSON.stringify({ head: opts.head, base: opts.base, title: opts.title, body: opts.body }),
  });
  return {
    id: p.id, number: p.number, title: p.title, state: p.state,
    headBranch: p.head?.ref ?? "", baseBranch: p.base?.ref ?? "",
    user: p.user?.login ?? "", createdAt: p.created_at ?? "",
  };
}

/** Patch daemon-side repo attributes (description / private flag). */
export async function updateRepo(
  accountId: string,
  name: string,
  patch: { description?: string; private?: boolean },
): Promise<void> {
  const repo = physical(accountId, name);
  if (!repo) throw new Error("invalid repo name");
  await storeFetch(accountId, `/repos/${await account(accountId)}/${repo}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/** Register a push mirror on the daemon repo (best-effort - needs gitea >=1.21). */
export async function addPushMirror(
  accountId: string,
  name: string,
  remoteAddr: string,
  opts: { authToken?: string; interval?: string } = {},
): Promise<void> {
  const repo = physical(accountId, name);
  if (!repo) throw new Error("invalid repo name");
  await storeFetch(accountId, `/repos/${await account(accountId)}/${repo}/push_mirrors`, {
    method: "POST",
    body: JSON.stringify({
      remote_address: remoteAddr,
      auth_token: opts.authToken,
      interval: opts.interval ?? "8h",
      sync_on_commit: true,
    }),
  });
}

export async function deleteRepo(accountId: string, name: string) {
  const repo = physical(accountId, name);
  if (!repo) throw new Error("invalid repo name");
  await storeFetch(accountId, `/repos/${await account(accountId)}/${repo}`, { method: "DELETE" });
}

function encodeFilePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function defaultBranch(accountId: string, repo: string): Promise<string> {
  const r = await storeFetch<{ default_branch: string }>(
    accountId,
    `/repos/${await account(accountId)}/${repo}`,
  );
  return r.default_branch || "main";
}

export async function repoTree(
  accountId: string,
  name: string,
): Promise<TreeEntry[]> {
  const repo = physical(accountId, name);
  if (!repo) throw new Error("invalid repo name");
  const branch = await defaultBranch(accountId, repo);
  const data = await storeFetch<{
    tree: { path: string; type: string; size: number }[];
  }>(
    accountId,
    `/repos/${await account(accountId)}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=true`,
  );
  return (data.tree ?? []).map((e) => ({
    path: e.path,
    type: e.type === "blob" ? "file" : "dir",
    size: e.size,
  }));
}

export async function repoRead(
  accountId: string,
  name: string,
  path: string,
): Promise<RepoFile> {
  const repo = physical(accountId, name);
  if (!repo) throw new Error("invalid repo name");
  const data = await storeFetch<{ content: string; sha: string }>(
    accountId,
    `/repos/${await account(accountId)}/${repo}/contents/${encodeFilePath(path)}`,
  );
  return {
    path,
    content: Buffer.from(data.content, "base64").toString("utf8"),
    sha: data.sha,
  };
}

export async function repoWrite(
  accountId: string,
  name: string,
  path: string,
  opts: { content: string; sha?: string; message?: string },
): Promise<void> {
  const repo = physical(accountId, name);
  if (!repo) throw new Error("invalid repo name");
  await storeFetch(accountId, `/repos/${await account(accountId)}/${repo}/contents/${encodeFilePath(path)}`, {
    method: "POST",
    body: JSON.stringify({
      content: Buffer.from(opts.content, "utf8").toString("base64"),
      sha: opts.sha,
      branch: await defaultBranch(accountId, repo),
      message: opts.message ?? `${opts.sha ? "Update" : "Create"} ${path}`,
    }),
  });
}
