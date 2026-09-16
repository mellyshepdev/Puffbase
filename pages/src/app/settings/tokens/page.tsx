"use client";

import { useEffect, useState } from "react";
import { Key, Check, Plus, Loader2, Copy } from "lucide-react";

interface TokenRec {
  id: string;
  name: string;
  kind: string;
  scopes: string[];
  prefix: string;
  createdAt: string;
}

const SCOPE_SECTIONS = [
  {
    title: "Repositories",
    hint: "Browse and clone repos (read), push code and manage repo settings (write).",
    scopes: ["repos:read", "repos:write"],
  },
  {
    title: "Issues",
    hint: "View issues (read), file, edit and close them (write).",
    scopes: ["issues:read", "issues:write"],
  },
  {
    title: "Pipelines",
    hint: "See CI runs and logs (read), trigger and cancel runs (write).",
    scopes: ["pipelines:read", "pipelines:write"],
  },
  {
    title: "Deployments",
    hint: "View deploy status and history (read), promote and roll back deploys (write).",
    scopes: ["deployments:read", "deployments:write"],
  },
  {
    title: "Documents",
    hint: "Read workspace documents (read), create and edit them (write).",
    scopes: ["docs:read", "docs:write"],
  },
  {
    title: "Groups",
    hint: "List teams and members (read), create teams and manage membership (write).",
    scopes: ["groups:read", "groups:write"],
  },
  {
    title: "Integrations",
    hint: "See connected providers (read), connect and disconnect them (write).",
    scopes: ["integrations:read", "integrations:write"],
  },
] as const;

export default function TokenSettings() {
  const [tokens, setTokens] = useState<TokenRec[]>([]);
  const [tokenName, setTokenName] = useState("");
  const [tokenKind, setTokenKind] = useState<"classic" | "fine-grained">("fine-grained");
  const [tokenScopes, setTokenScopes] = useState<string[]>(["repos:read"]);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTokens = () =>
    fetch("/api/tokens").then((r) => r.json()).then((d) => setTokens(d.tokens ?? []));

  useEffect(() => { loadTokens(); }, []);

  const generate = async () => {
    setBusy(true);
    setFreshToken(null);
    setError(null);
    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tokenName, kind: tokenKind, scopes: tokenScopes }),
    });
    setBusy(false);
    if (res.ok) {
      const d = await res.json();
      setFreshToken(d.token);
      setTokenName("");
      loadTokens();
    } else {
      const d = await res.json();
      setError(d?.error ?? "Could not generate token");
    }
  };

  const revoke = async (id: string) => {
    await fetch(`/api/tokens?id=${id}`, { method: "DELETE" });
    loadTokens();
  };

  return (
    <section className="slime-card p-5">
      <h1 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
        <Key className="w-4 h-4 text-slime-400" /> Developer tokens
      </h1>
      <p className="text-xs text-[#7a6b9d] mb-5">
        Pufftokens authenticate API calls for this workspace. They&apos;re minted through OpenBao and stored there — the value is shown once.
      </p>

      {tokens.length > 0 && (
        <div className="space-y-2 mb-5">
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-lg border border-[var(--color-dark-border)] px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{t.name} <span className="text-[10px] text-[#5a4d7a] font-mono">{t.prefix}…</span></p>
                <p className="text-[10px] text-[#5a4d7a]">{t.kind === "classic" ? "classic · all scopes" : `fine-grained · ${t.scopes.join(", ")}`} · {new Date(t.createdAt).toLocaleDateString()}</p>
              </div>
              <button onClick={() => revoke(t.id)} className="text-xs text-red-400 hover:text-red-300">Revoke</button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <input
          value={tokenName}
          onChange={(e) => setTokenName(e.target.value)}
          placeholder="Token name (e.g. ci, laptop)"
          className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white placeholder-[#5a4d7a] outline-none"
        />
        <div className="flex gap-2">
          {(["fine-grained", "classic"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTokenKind(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tokenKind === k
                  ? "bg-slime-600/20 text-slime-300 border border-slime-600/30"
                  : "text-[#7a6b9d] border border-[var(--color-dark-border)] hover:text-white"
              }`}
            >
              {k === "classic" ? "Classic (all scopes)" : "Fine-grained"}
            </button>
          ))}
        </div>
        {tokenKind === "fine-grained" && (
          <div className="space-y-3">
            {SCOPE_SECTIONS.map((sec) => (
              <div key={sec.title} className="rounded-lg border border-[var(--color-dark-border)] px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <p className="text-xs font-semibold text-white">{sec.title}</p>
                  <p className="text-[10px] text-[#5a4d7a] text-right">{sec.hint}</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {sec.scopes.map((sc) => (
                    <label key={sc} className="flex items-center gap-2 text-xs text-[#9d8ec2] px-2 py-1.5 rounded-lg hover:bg-[var(--color-dark-hover)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tokenScopes.includes(sc)}
                        onChange={() => setTokenScopes((cur) => cur.includes(sc) ? cur.filter((x) => x !== sc) : [...cur, sc])}
                        className="accent-[#8bd450]"
                      />
                      <span className="font-mono">{sc.split(":")[1]}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <button
          className="slime-btn flex items-center gap-2"
          onClick={generate}
          disabled={busy || !tokenName.trim() || (tokenKind === "fine-grained" && tokenScopes.length === 0)}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Generate pufftoken
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {freshToken && (
          <div className="rounded-lg border border-slime-600/40 bg-slime-500/5 p-3">
            <p className="text-[10px] text-[#7a6b9d] mb-1">Copy it now — it won&apos;t be shown again:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-slime-300 font-mono break-all">{freshToken}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(freshToken); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                className="p-1.5 rounded text-[#5a4d7a] hover:text-slime-400"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
