"use client";

import { useEffect, useState } from "react";
import { Shield, Trash2, Loader2, KeyRound, Plus } from "lucide-react";

interface Account {
  id: string;
  kind: string;
  name: string;
}

interface SshKey {
  id: string;
  name: string;
  publicKey: string;
  fingerprint: string;
  createdAt: string;
}

export default function SecuritySettings() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [active, setActive] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [keys, setKeys] = useState<SshKey[]>([]);
  const [keyName, setKeyName] = useState("");
  const [keyBody, setKeyBody] = useState("");
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const loadKeys = () =>
    fetch("/api/ssh-keys")
      .then((r) => r.json())
      .then((d) => setKeys(d.keys ?? []))
      .catch(() => {});

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((r) => {
        setAccounts(r.accounts ?? []);
        setActive(r.active ?? null);
      });
    loadKeys();
  }, []);

  const addKey = async () => {
    setKeyBusy(true);
    setKeyError(null);
    const res = await fetch("/api/ssh-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: keyName, publicKey: keyBody }),
    });
    setKeyBusy(false);
    if (res.ok) {
      setKeyName("");
      setKeyBody("");
      loadKeys();
    } else {
      const d = await res.json().catch(() => ({}));
      setKeyError(d?.error ?? "Could not add key");
    }
  };

  const removeKey = async (id: string) => {
    await fetch(`/api/ssh-keys?id=${id}`, { method: "DELETE" });
    loadKeys();
  };

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

      <section className="slime-card p-5">
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-slime-400" /> SSH keys
        </h2>
        <p className="text-xs text-[#7a6b9d] mb-4">
          Public keys used to authenticate git over SSH. Paste the contents of your{" "}
          <code className="font-mono text-[#9d8ec2]">~/.ssh/id_ed25519.pub</code> (or{" "}
          <code className="font-mono text-[#9d8ec2]">id_rsa.pub</code>) — never the private key.
        </p>

        {keys.length > 0 && (
          <div className="space-y-2 mb-4">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center gap-3 rounded-lg border border-[var(--color-dark-border)] px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{k.name}</p>
                  <p className="text-[10px] text-[#5a4d7a] font-mono truncate">
                    {k.fingerprint} · added {new Date(k.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => removeKey(k.id)} className="text-xs text-red-400 hover:text-red-300">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <input
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="Key name (e.g. laptop, unit3)"
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white placeholder-[#5a4d7a] outline-none"
          />
          <textarea
            value={keyBody}
            onChange={(e) => setKeyBody(e.target.value)}
            placeholder="ssh-ed25519 AAAAC3NzaC… you@host"
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-xs font-mono text-white placeholder-[#5a4d7a] outline-none resize-none"
          />
          <button
            className="slime-btn flex items-center gap-2"
            onClick={addKey}
            disabled={keyBusy || !keyBody.trim()}
          >
            {keyBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add SSH key
          </button>
          {keyError && <p className="text-xs text-red-400">{keyError}</p>}
        </div>
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
