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

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for the repo store`);
  return value;
}

async function storeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = requireEnv("GIT_INTERNAL_URL");
  const token = requireEnv("GIT_INTERNAL_TOKEN");
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

let storeAccount: string | undefined;
async function account(): Promise<string> {
  if (!storeAccount) {
    const me = await storeFetch<{ login: string }>("/user");
    storeAccount = me.login;
  }
  return storeAccount;
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
): Promise<RepoMeta> {
  const repo = physical(accountId, name);
  if (!repo) throw new Error("invalid repo name");
  const r = await storeFetch<RepoResponse>("/user/repos", {
    method: "POST",
    body: JSON.stringify({ name: repo, private: true, auto_init: true, description }),
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
  const r = await storeFetch<RepoResponse>("/repos/migrate", {
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

export async function deleteRepo(accountId: string, name: string) {
  const repo = physical(accountId, name);
  if (!repo) throw new Error("invalid repo name");
  await storeFetch(`/repos/${await account()}/${repo}`, { method: "DELETE" });
}

function encodeFilePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function defaultBranch(repo: string): Promise<string> {
  const r = await storeFetch<{ default_branch: string }>(
    `/repos/${await account()}/${repo}`,
  );
  return r.default_branch || "main";
}

export async function repoTree(
  accountId: string,
  name: string,
): Promise<TreeEntry[]> {
  const repo = physical(accountId, name);
  if (!repo) throw new Error("invalid repo name");
  const branch = await defaultBranch(repo);
  const data = await storeFetch<{
    tree: { path: string; type: string; size: number }[];
  }>(
    `/repos/${await account()}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=true`,
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
    `/repos/${await account()}/${repo}/contents/${encodeFilePath(path)}`,
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
  await storeFetch(`/repos/${await account()}/${repo}/contents/${encodeFilePath(path)}`, {
    method: "POST",
    body: JSON.stringify({
      content: Buffer.from(opts.content, "utf8").toString("base64"),
      sha: opts.sha,
      branch: await defaultBranch(repo),
      message: opts.message ?? `${opts.sha ? "Update" : "Create"} ${path}`,
    }),
  });
}
