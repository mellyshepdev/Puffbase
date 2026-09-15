"use client";

import { useEffect, useState } from "react";
import { User, Building2, Check, Bell, Shield, Save, Trash2, Plus, Loader2, Key, Copy } from "lucide-react";

interface Account {
  id: string;
  kind: "personal" | "business";
  name: string;
  avatar: string;
  businessUrl?: string | null;
}

const SHEEP = Array.from({ length: 8 }, (_, i) => `sheep-${i + 1}`);

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [active, setActive] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // editable fields for the active account
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("sheep-1");
  const [businessUrl, setBusinessUrl] = useState("");
  const [notif, setNotif] = useState({ pipelines: true, deploys: true, billing: false });

  // developer tokens (pufftokens) - minted + stored through OpenBao
  const [tokens, setTokens] = useState<{ id: string; name: string; kind: string; scopes: string[]; prefix: string; createdAt: string }[]>([]);
  const [tokenName, setTokenName] = useState("");
  const [tokenKind, setTokenKind] = useState<"classic" | "fine-grained">("fine-grained");
  const [tokenScopes, setTokenScopes] = useState<string[]>(["repos:read"]);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [tokenBusy, setTokenBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadTokens = () =>
    fetch("/api/tokens").then((r) => r.json()).then((d) => setTokens(d.tokens ?? []));

  const generateToken = async () => {
    setTokenBusy(true);
    setFreshToken(null);
    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tokenName, kind: tokenKind, scopes: tokenScopes }),
    });
    setTokenBusy(false);
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

  const revokeToken = async (id: string) => {
    await fetch(`/api/tokens?id=${id}`, { method: "DELETE" });
    loadTokens();
  };

  const load = () => {
    loadTokens();
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((r) => {
        setAccounts(r.accounts ?? []);
        const act: Account | null = r.active ?? null;
        setActive(act);
        if (act) {
          setName(act.name);
          setAvatar(act.avatar);
          setBusinessUrl(act.businessUrl ?? "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async () => {
    if (!active) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: active.id,
        name,
        avatar,
        businessUrl: active.kind === "business" ? businessUrl : undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      load();
    } else {
      setError("Save failed");
    }
  };

  const addBusiness = async () => {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "business", name: "Business" }),
    });
    if (res.ok) load();
  };

  const deleteWorkspace = async () => {
    if (!active) return;
    if (accounts.length <= 1) {
      setError("You can't delete your only account");
      return;
    }
    if (!window.confirm(`Delete ${active.name}? Its repositories and settings will be removed.`)) return;
    const res = await fetch("/api/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: active.id }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      const d = await res.json();
      setError(d?.error ?? "Could not delete workspace");
    }
  };

  const switchTo = async (id: string) => {
    if (id === active?.id) return;
    const res = await fetch("/api/accounts/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) window.location.reload();
  };

  const personal = accounts.find((a) => a.kind === "personal");
  const businesses = accounts.filter((a) => a.kind === "business");

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#7a6b9d] text-sm p-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="eyebrow"><span className="pulse-dot" /> ACCOUNT</div>
        <h1 className="text-2xl font-bold text-white mt-1.5"><span className="glow-text">Settings</span></h1>
        <p className="text-sm text-[#7a6b9d] mt-1">Workspace, accounts, and preferences.</p>
      </div>

      {/* Accounts */}
      <section className="slime-card p-5">
        <h2 className="text-base font-semibold text-white mb-1">Accounts</h2>
        <p className="text-xs text-[#7a6b9d] mb-4">
          Personal workspaces are free. Business adds teams, billing, and usage metering via Lago.
          You're editing the active account — switch under the avatar menu.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {personal && (
            <button
              className={`acct-type ${active?.id === personal.id ? "selected" : ""}`}
              onClick={() => switchTo(personal.id)}
            >
              <div className="acct-icon"><User className="w-5 h-5" /></div>
              <div className="text-left">
                <strong>{personal.name}</strong>
                <p>Personal · one workspace, community builds.</p>
              </div>
              {active?.id === personal.id && <Check className="w-4 h-4 text-[#b6f34c] ml-auto" />}
            </button>
          )}
          {businesses.map((b) => (
            <button
              key={b.id}
              className={`acct-type ${active?.id === b.id ? "selected" : ""}`}
              onClick={() => switchTo(b.id)}
            >
              <div className="acct-icon"><Building2 className="w-5 h-5" /></div>
              <div className="text-left">
                <strong>{b.name}</strong>
                <p>Business · groups, metered usage, invoices.</p>
              </div>
              {active?.id === b.id && <Check className="w-4 h-4 text-[#b6f34c] ml-auto" />}
            </button>
          ))}
          <button className="acct-type" onClick={addBusiness}>
            <div className="acct-icon"><Plus className="w-5 h-5" /></div>
            <div className="text-left">
              <strong>Add business account</strong>
              <p>Create a separate business workspace.</p>
            </div>
          </button>
        </div>
      </section>

      {/* Profile */}
      {active && (
        <section className="slime-card p-5">
          <h2 className="text-base font-semibold text-white mb-4">
            Profile — <span className="capitalize">{active.kind}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="field">Display name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            {active.kind === "business" && (
              <label className="field">Business URL
                <input
                  type="url"
                  value={businessUrl}
                  onChange={(e) => setBusinessUrl(e.target.value)}
                  placeholder="https://your-business.com"
                />
              </label>
            )}
          </div>

          <h3 className="text-sm font-semibold text-white mt-6 mb-1">Avatar</h3>
          <p className="text-xs text-[#7a6b9d] mb-3">Pick your flock — each account gets its own sheep.</p>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {SHEEP.map((s) => (
              <button
                key={s}
                onClick={() => setAvatar(s)}
                className={`relative aspect-square rounded-xl border flex items-center justify-center transition-all ${
                  avatar === s
                    ? "border-slime-500 bg-slime-900/30 shadow-[0_0_16px_rgba(139,61,255,0.25)]"
                    : "border-[var(--color-dark-border)] bg-[var(--color-dark-card)] hover:border-slime-700"
                }`}
              >
                <span className="w-10 h-10 rounded-full bg-gradient-to-br from-slime-400 to-goo-700 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/avatars/${s}.svg`} alt={s} className="w-8 h-8" />
                </span>
                {avatar === s && (
                  <Check className="absolute top-1 right-1 w-3.5 h-3.5 text-[#b6f34c]" />
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Notifications */}
      <section className="slime-card p-5">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-slime-400" /> Notifications
        </h2>
        {(["pipelines", "deploys", "billing"] as const).map((k) => (
          <label key={k} className="toggle-row">
            <span className="capitalize">{k === "billing" ? "Billing & usage alerts" : `${k} status changes`}</span>
            <input type="checkbox" checked={notif[k]} onChange={() => setNotif((n) => ({ ...n, [k]: !n[k] }))} />
          </label>
        ))}
      </section>

      {/* Developer tokens */}
      <section className="slime-card p-5">
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Key className="w-4 h-4 text-slime-400" /> Developer tokens
        </h2>
        <p className="text-xs text-[#7a6b9d] mb-4">
          Pufftokens authenticate API calls for this workspace. They&apos;re minted through OpenBao and stored there - the value is shown once.
        </p>

        {tokens.length > 0 && (
          <div className="space-y-2 mb-4">
            {tokens.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border border-[var(--color-dark-border)] px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{t.name} <span className="text-[10px] text-[#5a4d7a] font-mono">{t.prefix}…</span></p>
                  <p className="text-[10px] text-[#5a4d7a]">{t.kind === "classic" ? "classic · all scopes" : `fine-grained · ${t.scopes.join(", ")}`} · {new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => revokeToken(t.id)} className="text-xs text-red-400 hover:text-red-300">Revoke</button>
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
            <div className="grid grid-cols-2 gap-1.5">
              {([
                "repos:read", "repos:write", "issues:read", "issues:write",
                "pipelines:read", "pipelines:write", "deployments:read", "deployments:write",
                "docs:read", "docs:write", "groups:read", "groups:write",
                "integrations:read", "integrations:write",
              ] as const).map((sc) => (
                <label key={sc} className="flex items-center gap-2 text-xs text-[#9d8ec2] px-2 py-1.5 rounded-lg hover:bg-[var(--color-dark-hover)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tokenScopes.includes(sc)}
                    onChange={() => setTokenScopes((cur) => cur.includes(sc) ? cur.filter((x) => x !== sc) : [...cur, sc])}
                    className="accent-[#8bd450]"
                  />
                  <span className="font-mono">{sc}</span>
                </label>
              ))}
            </div>
          )}
          <button
            className="slime-btn flex items-center gap-2"
            onClick={generateToken}
            disabled={tokenBusy || !tokenName.trim() || (tokenKind === "fine-grained" && tokenScopes.length === 0)}
          >
            {tokenBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Generate pufftoken
          </button>
          {freshToken && (
            <div className="rounded-lg border border-slime-600/40 bg-slime-500/5 p-3">
              <p className="text-[10px] text-[#7a6b9d] mb-1">Copy it now - it won&apos;t be shown again:</p>
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

      {/* Security */}
      <section className="slime-card p-5">
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-slime-400" /> Security
        </h2>
        <p className="text-xs text-[#7a6b9d] mb-3">Authentication runs through Keycloak SSO — password and 2FA are managed there.</p>
        <a href="https://auth.theofficialblacksheepco.com/realms/puffbase-customers/account" target="_blank" className="button secondary inline-flex">
          Open account console
        </a>
      </section>

      <div className="flex items-center gap-4">
        <button className="button primary" onClick={save} disabled={saving || !active}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved" : "Save changes"}
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
        <button className="button danger inline-flex items-center gap-2" onClick={deleteWorkspace} disabled={accounts.length <= 1}>
          <Trash2 className="w-4 h-4" /> Delete workspace
        </button>
      </div>
    </div>
  );
}
