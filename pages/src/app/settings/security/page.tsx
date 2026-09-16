"use client";

import { useEffect, useState } from "react";
import { Shield, Trash2, Loader2 } from "lucide-react";

interface Account {
  id: string;
  kind: string;
  name: string;
}

export default function SecuritySettings() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [active, setActive] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((r) => {
        setAccounts(r.accounts ?? []);
        setActive(r.active ?? null);
      });
  }, []);

  const deleteWorkspace = async () => {
    if (!active) return;
    if (accounts.length <= 1) {
      setError("You can't delete your only account");
      return;
    }
    if (!window.confirm(`Delete ${active.name}? Its repositories and settings will be removed.`)) return;
    setBusy(true);
    const res = await fetch("/api/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: active.id }),
    });
    setBusy(false);
    if (res.ok) {
      window.location.reload();
    } else {
      const d = await res.json();
      setError(d?.error ?? "Could not delete workspace");
    }
  };

  return (
    <div className="space-y-6">
      <section className="slime-card p-5">
        <h1 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-slime-400" /> Security
        </h1>
        <p className="text-xs text-[#7a6b9d] mb-4">
          Authentication runs through Puffbase SSO — password and two-factor are managed in the account console.
        </p>
        <a href="https://auth.theofficialblacksheepco.com/realms/puffbase-customers/account" target="_blank" className="button secondary inline-flex">
          Open account console
        </a>
      </section>

      <section className="slime-card p-5 border-red-900/40">
        <h2 className="text-base font-semibold text-red-400 mb-2">Danger zone</h2>
        <p className="text-xs text-[#7a6b9d] mb-4">
          Deleting this workspace removes its repositories, issues, pipelines, deployments, groups, and integrations. This can&apos;t be undone.
        </p>
        <button
          className="button danger inline-flex items-center gap-2"
          onClick={deleteWorkspace}
          disabled={busy || accounts.length <= 1}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Delete this workspace
        </button>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </section>
    </div>
  );
}
