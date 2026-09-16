"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Plus, X, ArrowRight, Crown } from "lucide-react";

interface Group {
  id: string;
  name: string;
  description: string | null;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    fetch("/api/groups")
      .then((r) => r.json())
      .then((r) => setGroups(r.groups ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    if (new URLSearchParams(window.location.search).has("new")) setOpen(true);
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: n }),
    });
    if (res.ok) {
      setOpen(false);
      setName("");
      setError(null);
      load();
    } else {
      setError("Could not create group");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="eyebrow"><span className="pulse-dot" /> TEAMS & ACCESS</div>
          <h1 className="text-2xl font-bold text-white mt-1.5"><span className="glow-text">Groups</span></h1>
          <p className="text-sm text-[#7a6b9d] mt-1">Teams share repo and pipeline access inside this account.</p>
        </div>
        <button className="button primary" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> New group
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-sm text-[#7a6b9d]">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-[#7a6b9d] col-span-full">No groups yet — create one for your team.</p>
        ) : (
          groups.map((g) => (
            <article key={g.id} className="project-card">
              <div className="project-card-top">
                <div className="large-favicon"><Users className="w-4 h-4" /></div>
                <span className="visibility public flex items-center gap-1"><Crown className="w-3 h-3" />owner</span>
              </div>
              <div className="project-title-row"><h3>{g.name}</h3></div>
              <p>{g.description || "No description yet."}</p>
              <div className="project-divider" />
              <div className="project-footer">
                <span className="deploy-state live"><i />Active</span>
                <Link href="/repos" className="open-project ml-auto" aria-label={`Open ${g.name} repositories`}><ArrowRight className="w-4 h-4" /></Link>
              </div>
            </article>
          ))
        )}
      </div>

      {open && (
        <div className="modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="create-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setOpen(false)} aria-label="Close"><X className="w-4 h-4" /></button>
            <div className="modal-icon"><Users className="w-5 h-5" /></div>
            <div className="section-eyebrow">NEW TEAM</div>
            <h2>Create a group</h2>
            <p>Groups organize repo and pipeline access for this account.</p>
            <form onSubmit={create}>
              {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
              <label>Group name
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. data-team" />
              </label>
              <div className="modal-actions">
                <button type="button" className="button secondary" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="button primary" disabled={!name.trim()}>Create group <ArrowRight className="w-4 h-4" /></button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
