"use client";

import { useEffect, useState } from "react";
import { User, Building2, Check, Plus, Loader2 } from "lucide-react";

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

  const addBusiness = async () => {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "business", name: "Business" }),
    });
    if (res.ok) load();
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
            <div className="acct-icon"><User className="w-5 h-5" /></div>
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
            <div className="acct-icon"><Building2 className="w-5 h-5" /></div>
            <div className="text-left">
              <strong>{b.name}</strong>
              <p>Business · groups, metered usage, invoices.</p>
            </div>
            {activeId === b.id && <Check className="w-4 h-4 text-[#b6f34c] ml-auto" />}
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
  );
}
