"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  SlidersHorizontal,
  Link2,
  Building2,
  Handshake,
  ListTodo,
  Key,
  Trash2,
  Loader2,
  Copy,
  Check,
} from "lucide-react";

interface Account {
  id: string;
  kind: string;
  name: string;
  businessUrl?: string | null;
}

export default function AdvancedSettings() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [active, setActive] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [urlBusy, setUrlBusy] = useState(false);

  const [subName, setSubName] = useState("");
  const [subBusy, setSubBusy] = useState(false);

  const [partnerName, setPartnerName] = useState("");
  const [partnerDesc, setPartnerDesc] = useState("");
  const [partnerBusy, setPartnerBusy] = useState(false);

  const [tokenName, setTokenName] = useState("");
  const [tokenBusy, setTokenBusy] = useState(false);
  const [minted, setMinted] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [delBusy, setDelBusy] = useState(false);

  const flash = (m: string) => {
    setNote(m);
    setTimeout(() => setNote(null), 3200);
  };

  const load = () =>
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((r) => {
        setAccounts(r.accounts ?? []);
        setActive(r.active ?? null);
        setUrl(r.active?.businessUrl ?? "");
      })
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const saveUrl = async () => {
    if (!active) return;
    setUrlBusy(true);
    setError(null);
    const res = await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: active.id, businessUrl: url }),
    });
    setUrlBusy(false);
    if (res.ok) {
      flash("Workspace URL updated");
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d?.error ?? "Could not update the URL");
    }
  };

  const createSub = async () => {
    if (!subName.trim()) return;
    setSubBusy(true);
    setError(null);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "business", name: subName.trim() }),
    });
    setSubBusy(false);
    if (res.ok) {
      setSubName("");
      flash("Sub-business created — switch to it from the account menu");
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d?.error ?? "Could not create the sub-business");
    }
  };

  const addPartner = async () => {
    if (!partnerName.trim()) return;
    setPartnerBusy(true);
    setError(null);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: partnerName.trim(), description: partnerDesc.trim() || undefined }),
    });
    setPartnerBusy(false);
    if (res.ok) {
      setPartnerName("");
      setPartnerDesc("");
      flash("Partner added");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d?.error ?? "Could not add the partner");
    }
  };

  const mintToken = async () => {
    if (!tokenName.trim()) return;
    setTokenBusy(true);
    setError(null);
    setMinted(null);
    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tokenName.trim(), kind: "classic" }),
    });
    setTokenBusy(false);
    if (res.ok) {
      const d = await res.json();
      setMinted(d.token ?? null);
      setTokenName("");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d?.error ?? "Could not mint the token");
    }
  };

  const deleteBusiness = async () => {
    if (!active) return;
    if (accounts.length <= 1) {
      setError("You can't delete your only workspace");
      return;
    }
    if (!window.confirm(`Delete ${active.name}? Its repositories, issues, pipelines and settings will be removed.`)) return;
    setDelBusy(true);
    const res = await fetch("/api/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: active.id }),
    });
    setDelBusy(false);
    if (res.ok) {
      window.location.reload();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d?.error ?? "Could not delete the workspace");
    }
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white placeholder-[#5a4d7a] outline-none";

  return (
    <div className="space-y-6">
      <section className="slime-card p-5">
        <h1 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slime-400" /> Advanced
        </h1>
        <p className="text-xs text-[#7a6b9d]">
          Workspace-level controls. These apply to <span className="text-white">{active?.name ?? "…"}</span> — the active workspace.
        </p>
      </section>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {note && <p className="text-xs text-[#b6f34c]">{note}</p>}

      {/* change your url */}
      <section className="slime-card p-5">
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-slime-400" /> Workspace URL
        </h2>
        <p className="text-xs text-[#7a6b9d] mb-4">The public URL shown for this business.</p>
        <div className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-business.example"
            className={inputCls}
          />
          <button onClick={saveUrl} disabled={urlBusy} className="slime-btn text-xs py-2 px-4 whitespace-nowrap">
            {urlBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save URL"}
          </button>
        </div>
      </section>

      {/* create a sub-business */}
      <section className="slime-card p-5">
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slime-400" /> Create a sub-business
        </h2>
        <p className="text-xs text-[#7a6b9d] mb-4">
          A separate business workspace under your login — its own repos, pipelines and settings.
        </p>
        <div className="flex gap-2">
          <input
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            placeholder="Sub-business name"
            maxLength={120}
            className={inputCls}
          />
          <button onClick={createSub} disabled={subBusy} className="slime-btn text-xs py-2 px-4 whitespace-nowrap">
            {subBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create"}
          </button>
        </div>
      </section>

      {/* add a partner */}
      <section className="slime-card p-5">
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Handshake className="w-4 h-4 text-slime-400" /> Add a partner
        </h2>
        <p className="text-xs text-[#7a6b9d] mb-4">
          Partners are groups inside this workspace — manage them on the Groups page.
        </p>
        <div className="space-y-2">
          <input
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            placeholder="Partner name"
            maxLength={120}
            className={inputCls}
          />
          <input
            value={partnerDesc}
            onChange={(e) => setPartnerDesc(e.target.value)}
            placeholder="What they do (optional)"
            maxLength={500}
            className={inputCls}
          />
          <div className="flex gap-2">
            <button onClick={addPartner} disabled={partnerBusy} className="slime-btn text-xs py-2 px-4">
              {partnerBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add partner"}
            </button>
            <Link href="/groups" className="px-4 py-2 rounded-lg text-xs text-[#9d8ec2] hover:text-white border border-[var(--color-dark-border)]">
              Manage groups →
            </Link>
          </div>
        </div>
      </section>

      {/* issue board */}
      <section className="slime-card p-5">
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-slime-400" /> Issue board
        </h2>
        <p className="text-xs text-[#7a6b9d] mb-4">Track work across this workspace's repositories.</p>
        <Link href="/issues" className="button secondary inline-flex text-xs">
          Open the issue board
        </Link>
      </section>

      {/* business access tokens */}
      <section className="slime-card p-5">
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Key className="w-4 h-4 text-slime-400" /> Business access tokens
        </h2>
        <p className="text-xs text-[#7a6b9d] mb-4">
          Classic pufftokens for this workspace — full API access. The token value is shown once.
          Fine-grained scopes live under <Link href="/settings/tokens" className="text-slime-400 hover:text-white">Developer tokens</Link>.
        </p>
        <div className="flex gap-2">
          <input
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="Token name (e.g. ci-runner)"
            maxLength={120}
            className={inputCls}
          />
          <button onClick={mintToken} disabled={tokenBusy} className="slime-btn text-xs py-2 px-4 whitespace-nowrap">
            {tokenBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Mint token"}
          </button>
        </div>
        {minted && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-slime-600/40 bg-[#0b0712] px-3 py-2">
            <code className="flex-1 text-xs text-[#b6f34c] break-all">{minted}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(minted).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1600); }}
              className="text-[#9d8ec2] hover:text-white flex-shrink-0"
              aria-label="Copy token"
            >
              {copied ? <Check className="w-4 h-4 text-[#b6f34c]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}
      </section>

      {/* delete a business */}
      <section className="slime-card p-5 border-red-900/40">
        <h2 className="text-base font-semibold text-red-400 mb-1 flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> Delete this business
        </h2>
        <p className="text-xs text-[#7a6b9d] mb-4">
          Removes <span className="text-white">{active?.name ?? "the active workspace"}</span> — repositories,
          issues, pipelines, deployments, groups and integrations. This can&apos;t be undone.
        </p>
        <button
          onClick={deleteBusiness}
          disabled={delBusy || active?.kind !== "business"}
          className="px-4 py-2 rounded-lg text-xs font-bold bg-red-500/10 border border-red-500/40 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-40"
        >
          {delBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : active?.kind === "business" ? `Delete ${active.name}` : "Only business workspaces can be deleted"}
        </button>
      </section>
    </div>
  );
}
