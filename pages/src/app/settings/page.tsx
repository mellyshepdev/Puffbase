"use client";

import { useEffect, useState } from "react";
import { Check, Plus, Loader2 } from "lucide-react";
import { avatarSrc } from "@/lib/avatar";
import NewAccountDialog from "@/components/NewAccountDialog";

interface Account {
  id: string;
  kind: "personal" | "business";
  name: string;
  avatar: string;
}

export default function AccountsSettings() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);

  const load = () =>
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((r) => {
        setAccounts(r.accounts ?? []);
        setActiveId(r.active?.id ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const switchTo = async (id: string) => {
    if (id === activeId) return;
    const res = await fetch("/api/accounts/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) window.location.reload();
  };

  const onCreated = () => {
    setNewOpen(false);
    load();
  };

  const personal = accounts.find((a) => a.kind === "personal");
  const businesses = accounts.filter((a) => a.kind === "business");

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#7a6b9d] text-sm p-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <section className="slime-card p-5">
      <h1 className="text-lg font-bold text-white mb-1">Accounts</h1>
      <p className="text-xs text-[#7a6b9d] mb-5">
        Personal workspaces are free. Business adds teams, billing, and usage metering.
        Click a workspace to switch to it.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {personal && (
          <button
            className={`acct-type ${activeId === personal.id ? "selected" : ""}`}
            onClick={() => switchTo(personal.id)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarSrc(personal.avatar)} alt="" className="w-9 h-9 rounded-full shrink-0" style={{ objectFit: "cover" }} />
            <div className="text-left">
              <strong>{personal.name}</strong>
              <p>Personal · one workspace, community builds.</p>
            </div>
            {activeId === personal.id && <Check className="w-4 h-4 text-[#b6f34c] ml-auto" />}
          </button>
        )}
        {businesses.map((b) => (
          <button
            key={b.id}
            className={`acct-type ${activeId === b.id ? "selected" : ""}`}
            onClick={() => switchTo(b.id)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarSrc(b.avatar)} alt="" className="w-9 h-9 rounded-full shrink-0" style={{ objectFit: "cover" }} />
            <div className="text-left">
              <strong>{b.name}</strong>
              <p>Business · groups, metered usage, invoices.</p>
            </div>
            {activeId === b.id && <Check className="w-4 h-4 text-[#b6f34c] ml-auto" />}
          </button>
        ))}
        <button className="acct-type" onClick={() => setNewOpen(true)}>
          <div className="acct-icon"><Plus className="w-5 h-5" /></div>
          <div className="text-left">
            <strong>Add business account</strong>
            <p>Create a separate business workspace.</p>
          </div>
        </button>
      </div>
      {newOpen && (
        <NewAccountDialog kind="business" onClose={() => setNewOpen(false)} onCreated={onCreated} />
      )}
    </section>
  );
}
