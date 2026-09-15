"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Plug, X, Loader2, Unlink, Download } from "lucide-react";

interface IntegrationDef {
  provider: string;
  name: string;
  desc: string;
  detail: string;
  tokenLabel: string;
  tokenHelp: string;
  tokenHelpUrl: string;
  canImport: boolean;
}

const CATALOG: IntegrationDef[] = [
  {
    provider: "github",
    name: "GitHub",
    desc: "Import repositories, sync issues, and trigger pipelines on push.",
    detail: "repos · issues · push hooks",
    tokenLabel: "Personal access token",
    tokenHelp: "github.com → Settings → Developer settings → Tokens",
    tokenHelpUrl: "https://github.com/settings/tokens",
    canImport: true,
  },
  {
    provider: "gitlab",
    name: "GitLab",
    desc: "Mirror projects and run deploys from GitLab pipelines.",
    detail: "projects · mirroring · CI",
    tokenLabel: "Personal access token (read_api + read_repository)",
    tokenHelp: "gitlab.com → Preferences → Access Tokens",
    tokenHelpUrl: "https://gitlab.com/-/user_settings/personal_access_tokens",
    canImport: true,
  },
  {
    provider: "linear",
    name: "Linear",
    desc: "Link issues to branches and close tickets when deploys ship.",
    detail: "issues · cycle tracking",
    tokenLabel: "Personal API key",
    tokenHelp: "linear.app → Settings → API → Personal API keys",
    tokenHelpUrl: "https://linear.app/settings/api",
    canImport: false,
  },
  {
    provider: "notion",
    name: "Notion",
    desc: "Sync docs and release notes into your Notion workspace.",
    detail: "docs · release notes",
    tokenLabel: "Internal integration token",
    tokenHelp: "notion.so/my-integrations → New integration",
    tokenHelpUrl: "https://www.notion.so/my-integrations",
    canImport: false,
  },
];

interface Connection {
  id: string;
  provider: string;
  externalName: string | null;
}

interface RemoteRepo {
  name: string;
  fullName: string;
  cloneUrl: string;
  description: string;
  language: string | null;
  private: boolean;
}

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<IntegrationDef | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [remoteRepos, setRemoteRepos] = useState<Record<string, RemoteRepo[]>>({});
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const load = () => {
    fetch("/api/integrations")
      .then((r) => r.json())
      .then((r) => {
        setConnections(r.integrations ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const conn = (provider: string) => connections.find((c) => c.provider === provider);

  const connect = async (def: IntegrationDef) => {
    if (!token.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: def.provider, token: token.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setConnecting(null);
      setToken("");
      notify(`${def.name} connected as ${data.externalName}`);
      load();
    } else {
      setError(data.error ?? "Connection failed");
    }
  };

  const disconnect = async (c: Connection) => {
    if (!window.confirm(`Disconnect ${c.provider}? Stored credentials are removed.`)) return;
    await fetch(`/api/integrations?id=${c.id}`, { method: "DELETE" });
    setRemoteRepos((r) => {
      const next = { ...r };
      delete next[c.provider];
      return next;
    });
    load();
  };

  const browseRepos = async (provider: string) => {
    setImporting(provider);
    const res = await fetch(`/api/integrations/${provider}/repos`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setRemoteRepos((r) => ({ ...r, [provider]: data.repos ?? [] }));
    } else {
      notify(data.error ?? `Could not list ${provider} repos`);
    }
    setImporting(null);
  };

  const importRepo = async (provider: string, repo: RemoteRepo) => {
    const key = `${provider}:${repo.fullName}`;
    setImported((s) => new Set(s).add(key));
    const res = await fetch(`/api/integrations/${provider}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: repo.name,
        cloneUrl: repo.cloneUrl,
        description: repo.description,
        language: repo.language,
      }),
    });
    if (res.ok) {
      notify(`Imported ${repo.name} — it's in your repos now`);
    } else {
      const data = await res.json().catch(() => ({}));
      notify(data.error ?? `Import of ${repo.name} failed`);
      setImported((s) => {
        const next = new Set(s);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow"><span className="pulse-dot" /> PLATFORM</div>
        <h1 className="text-2xl font-bold text-white mt-1.5"><span className="glow-text">Integrations</span></h1>
        <p className="text-sm text-[#7a6b9d] mt-1">Connect the tools your team already uses.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATALOG.map((def) => {
          const c = conn(def.provider);
          return (
            <article key={def.provider} className="project-card">
              <div className="project-card-top">
                <div className="large-favicon"><Plug className="w-4 h-4" /></div>
                <span className={`visibility ${c ? "public" : "building"}`}>
                  {c ? <CheckCircle2 className="w-3 h-3" /> : null}
                  {c ? "connected" : "available"}
                </span>
              </div>
              <div className="project-title-row"><h3>{def.name}</h3></div>
              <p>{def.desc}</p>
              <div className="project-divider" />
              <div className="project-footer">
                <span className="text-[10px] text-[#5a4d7a] font-mono truncate">
                  {c ? (c.externalName ?? def.detail) : def.detail}
                </span>
                {c ? (
                  <span className="flex items-center gap-1.5 ml-auto">
                    {def.canImport && (
                      <button
                        className="open-project"
                        onClick={() => browseRepos(def.provider)}
                        aria-label={`Browse ${def.name} repos`}
                        title="Browse repos to import"
                      >
                        {importing === def.provider ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      className="open-project"
                      onClick={() => disconnect(c)}
                      aria-label={`Disconnect ${def.name}`}
                      title="Disconnect"
                    >
                      <Unlink className="w-4 h-4" />
                    </button>
                  </span>
                ) : (
                  <button
                    className="open-project ml-auto"
                    onClick={() => {
                      setConnecting(def);
                      setToken("");
                      setError(null);
                    }}
                    aria-label={`Connect ${def.name}`}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Import lists */}
      {(["github", "gitlab"] as const).map((p) => {
        const repos = remoteRepos[p];
        if (!repos) return null;
        return (
          <section key={p} className="slime-card p-5">
            <h2 className="text-base font-semibold text-white mb-3 capitalize">{p} repositories</h2>
            {repos.length === 0 ? (
              <p className="text-sm text-[#7a6b9d]">No repositories found on this account.</p>
            ) : (
              <div className="space-y-2">
                {repos.map((r) => {
                  const key = `${p}:${r.fullName}`;
                  const done = imported.has(key);
                  return (
                    <div
                      key={r.fullName}
                      className="flex items-center gap-3 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-card)] px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white font-medium truncate">{r.fullName}</p>
                        <p className="text-[11px] text-[#5a4d7a] truncate">
                          {[r.language, r.private ? "private" : "public", r.description]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      {done ? (
                        <span className="text-xs text-slime-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Imported
                        </span>
                      ) : (
                        <button
                          className="button secondary text-xs"
                          onClick={() => importRepo(p, r)}
                        >
                          Import
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {/* Connect modal */}
      {connecting && (
        <div className="modal-backdrop" onMouseDown={() => setConnecting(null)}>
          <div className="create-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setConnecting(null)} aria-label="Close">
              <X className="w-4 h-4" />
            </button>
            <div className="modal-icon"><Plug className="w-5 h-5" /></div>
            <div className="section-eyebrow">CONNECT</div>
            <h2>Connect {connecting.name}</h2>
            <p>
              Paste a {connecting.tokenLabel.toLowerCase()} — we verify it against{" "}
              {connecting.name} before saving, and it's stored encrypted.{" "}
              <a
                href={connecting.tokenHelpUrl}
                target="_blank"
                className="text-slime-400 underline underline-offset-2"
              >
                {connecting.tokenHelp} ↗
              </a>
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                connect(connecting);
              }}
            >
              <label>
                {connecting.tokenLabel}
                <input
                  autoFocus
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="paste token"
                />
              </label>
              {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="button secondary" onClick={() => setConnecting(null)}>
                  Cancel
                </button>
                <button type="submit" className="button primary" disabled={!token.trim() || busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Connect <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="ooze-toast">{toast}</div>}
    </div>
  );
}
