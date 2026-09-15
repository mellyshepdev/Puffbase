"use client";

import { useEffect, useState } from "react";
import { User, Building2, Check, Bell, Shield, Save, Trash2, Plus, Loader2 } from "lucide-react";

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

  const load = () => {
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
        <button className="button danger inline-flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete workspace</button>
      </div>
    </div>
  );
}
