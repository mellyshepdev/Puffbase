// ---------------------------------------------------------------------------
// Thin client for the internal git daemon (`puffbase-gitea` on puffnet).
// The daemon URL and an "admin" pufftoken come from the OpenBao token
// exchange - no daemon credential lives in this process.
// ---------------------------------------------------------------------------

import { puffToken, daemonUrl } from "./bao";

export type GiteaRepo = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  htmlUrl: string;
  defaultBranch: string;
  updatedAt: string;
  starsCount: number;
  forksCount: number;
};

type GiteaRepoResponse = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  updated_at: string;
  stars_count: number;
  forks_count: number;
};

/** Gitea's own html_url in API responses reflects whatever Host it saw on
 *  the *request that hit it* - since this server calls it over the internal
 *  puffnet network (GITEA_URL=http://gitea:3000), links come back pointing
 *  at that internal hostname, unusable from a browser. GITEA_PUBLIC_URL (the
 *  real public address, e.g. https://git.prime-quality.online) swaps that
 *  prefix back out before a repo ever reaches the client. Falls back to
 *  GITEA_URL unchanged if GITEA_PUBLIC_URL isn't set. */
async function toPublicUrl(internalUrl: string): Promise<string> {
  const publicBase = process.env.GITEA_PUBLIC_URL;
  if (!publicBase) return internalUrl;
  const internalBase = await daemonUrl();
  return internalUrl.startsWith(internalBase)
    ? publicBase.replace(/\/$/, "") + internalUrl.slice(internalBase.length)
    : internalUrl;
}

async function giteaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = await daemonUrl();
  const token = await puffToken("admin");
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `token ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Gitea request failed (${res.status}): ${path}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function toRepo(r: GiteaRepoResponse): Promise<GiteaRepo> {
  return {
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    private: r.private,
    htmlUrl: await toPublicUrl(r.html_url),
    defaultBranch: r.default_branch,
    updatedAt: r.updated_at,
    starsCount: r.stars_count,
    forksCount: r.forks_count,
  };
}

/** Every repo the token's user can see. Legitimately empty on a fresh
 *  instance - that's not an error, just nothing pushed yet. */
export async function listRepos(): Promise<GiteaRepo[]> {
  const data = await giteaFetch<{ ok: boolean; data: GiteaRepoResponse[] }>(
    "/api/v1/repos/search?limit=50",
  );
  return Promise.all((data.data ?? []).map(toRepo));
}

/** Creates a repo under the token's account (puffadmin). Used by the site
 *  builder to give each published project a real repo. */
export async function createRepo(
  name: string,
  description: string,
): Promise<GiteaRepo> {
  const data = await giteaFetch<GiteaRepoResponse>("/api/v1/user/repos", {
    method: "POST",
    body: JSON.stringify({ name, description, private: true, auto_init: true }),
  });
  return toRepo(data);
}

/* ------------------------------------------------------------------------- *
 * File browsing + editing - backs the console's code editor page. Gitea's
 * contents API is the write path; every save is a real commit on the branch.
 * ------------------------------------------------------------------------- */

/** The contents API wants the filepath in the URL path - slashes are real
 *  separators, so encode segment by segment, never the whole path. */
function encodeFilePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function defaultBranch(owner: string, repo: string): Promise<string> {
  const r = await giteaFetch<{ default_branch: string }>(
    `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
  );
  return r.default_branch;
}

export type RepoTreeEntry = { path: string; type: "file" | "dir"; size: number };

export async function repoTree(
  owner: string,
  repo: string,
  ref?: string,
): Promise<RepoTreeEntry[]> {
  const branch = ref ?? (await defaultBranch(owner, repo));
  const data = await giteaFetch<{
    tree: { path: string; type: string; size: number }[];
  }>(
    `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=true`,
  );
  return (data.tree ?? []).map((e) => ({
    path: e.path,
    type: e.type === "tree" ? "dir" : "file",
    size: e.size,
  }));
}

export type RepoFile = {
  path: string;
  name: string;
  sha: string;
  size: number;
  content: string;
};

export async function readRepoFile(
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<RepoFile> {
  const q = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const data = await giteaFetch<{
    type: string;
    name: string;
    path: string;
    sha: string;
    size: number;
    content?: string;
  }>(
    `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeFilePath(path)}${q}`,
  );
  if (data.type !== "file") throw new Error(`Not a file: ${path}`);
  return {
    path: data.path,
    name: data.name,
    sha: data.sha,
    size: data.size,
    content: Buffer.from(data.content ?? "", "base64").toString("utf8"),
  };
}

export async function writeRepoFile(
  owner: string,
  repo: string,
  path: string,
  opts: { content: string; message: string; branch?: string; sha?: string },
): Promise<void> {
  const body: Record<string, unknown> = {
    content: Buffer.from(opts.content, "utf8").toString("base64"),
    message: opts.message,
    branch: opts.branch ?? (await defaultBranch(owner, repo)),
  };
  // sha present = update existing file (PUT); absent = create (POST)
  if (opts.sha) body.sha = opts.sha;
  await giteaFetch(
    `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeFilePath(path)}`,
    { method: opts.sha ? "PUT" : "POST", body: JSON.stringify(body) },
  );
}

export async function deleteRepoFile(
  owner: string,
  repo: string,
  path: string,
  opts: { sha: string; message: string; branch?: string },
): Promise<void> {
  await giteaFetch(
    `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeFilePath(path)}`,
    {
      method: "DELETE",
      body: JSON.stringify({
        sha: opts.sha,
        message: opts.message,
        branch: opts.branch ?? (await defaultBranch(owner, repo)),
      }),
    },
  );
}
