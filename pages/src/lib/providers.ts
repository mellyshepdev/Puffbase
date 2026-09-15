// Provider verification + listing for the integrations page. Each provider
// connects with a personal access token / integration token - verified live
// against the provider API before anything is stored.

export type Provider = "github" | "gitlab" | "linear" | "notion";

export const PROVIDERS: Provider[] = ["github", "gitlab", "linear", "notion"];

export interface ProviderIdentity {
  /** Display name on the provider (username / workspace). */
  name: string;
  meta: Record<string, unknown>;
}

export interface RemoteRepo {
  name: string;
  fullName: string;
  cloneUrl: string;
  description: string;
  language: string | null;
  private: boolean;
  updatedAt: string | null;
}

async function json(res: Response, what: string) {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${what} failed (${res.status})${body ? `: ${body.slice(0, 160)}` : ""}`);
  }
  return res.json();
}

/* ---------------------------------- github --------------------------------- */

const GH = "https://api.github.com";
const ghHeaders = (t: string) => ({
  Authorization: `Bearer ${t}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "puffbase",
});

export async function githubVerify(token: string): Promise<ProviderIdentity> {
  const me = await json(await fetch(`${GH}/user`, { headers: ghHeaders(token) }), "GitHub auth");
  return { name: me.login, meta: { id: me.id, type: me.type } };
}

export async function githubRepos(token: string): Promise<RemoteRepo[]> {
  const repos = await json(
    await fetch(`${GH}/user/repos?per_page=100&sort=updated&affiliation=owner`, {
      headers: ghHeaders(token),
    }),
    "GitHub repo list",
  );
  return repos.map((r: Record<string, unknown>) => ({
    name: r.name,
    fullName: r.full_name,
    cloneUrl: r.clone_url,
    description: r.description ?? "",
    language: r.language ?? null,
    private: !!r.private,
    updatedAt: r.updated_at ?? null,
  }));
}

/* ---------------------------------- gitlab --------------------------------- */

const GL = "https://gitlab.com/api/v4";
const glHeaders = (t: string) => ({ "PRIVATE-TOKEN": t });

export async function gitlabVerify(token: string): Promise<ProviderIdentity> {
  const me = await json(await fetch(`${GL}/user`, { headers: glHeaders(token) }), "GitLab auth");
  return { name: me.username, meta: { id: me.id } };
}

export async function gitlabRepos(token: string): Promise<RemoteRepo[]> {
  const projects = await json(
    await fetch(`${GL}/projects?membership=true&per_page=100&order_by=last_activity_at`, {
      headers: glHeaders(token),
    }),
    "GitLab project list",
  );
  return projects.map((p: Record<string, unknown>) => ({
    name: p.name,
    fullName: p.path_with_namespace,
    cloneUrl: p.http_url_to_repo,
    description: p.description ?? "",
    language: null,
    private: p.visibility !== "public",
    updatedAt: p.last_activity_at ?? null,
  }));
}

/* ---------------------------------- linear --------------------------------- */

export async function linearVerify(token: string): Promise<ProviderIdentity> {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({
      query: "{ viewer { id name email } issues(first: 1) { nodes { id } } }",
    }),
  });
  const data = await json(res, "Linear auth");
  if (!data.data?.viewer) throw new Error("Linear auth failed: invalid token");
  return {
    name: data.data.viewer.name ?? data.data.viewer.email ?? "Linear user",
    meta: { id: data.data.viewer.id, email: data.data.viewer.email },
  };
}

/* ---------------------------------- notion --------------------------------- */

export async function notionVerify(token: string): Promise<ProviderIdentity> {
  const res = await fetch("https://api.notion.com/v1/users/me", {
    headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28" },
  });
  const me = await json(res, "Notion auth");
  const ws = me.bot?.owner?.workspace_name ?? me.name ?? "Notion workspace";
  return { name: ws, meta: { botId: me.id } };
}

/* --------------------------------- dispatch -------------------------------- */

export async function verifyProvider(
  provider: Provider,
  token: string,
): Promise<ProviderIdentity> {
  switch (provider) {
    case "github":
      return githubVerify(token);
    case "gitlab":
      return gitlabVerify(token);
    case "linear":
      return linearVerify(token);
    case "notion":
      return notionVerify(token);
  }
}

export async function listRemoteRepos(
  provider: Provider,
  token: string,
): Promise<RemoteRepo[]> {
  switch (provider) {
    case "github":
      return githubRepos(token);
    case "gitlab":
      return gitlabRepos(token);
    default:
      throw new Error(`${provider} does not have repositories`);
  }
}
