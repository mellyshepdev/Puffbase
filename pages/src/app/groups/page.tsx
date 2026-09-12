"use client";

import { useState } from "react";
import { Users, Plus, X, ArrowRight, Crown, ShieldCheck, User } from "lucide-react";

interface Group {
  name: string;
  desc: string;
  members: number;
  repos: number;
  role: "owner" | "admin" | "member";
}

const initialGroups: Group[] = [
  { name: "core-team", desc: "Platform engineers — full access to all repos and pipelines.", members: 6, repos: 14, role: "owner" },
  { name: "frontend", desc: "UI squad — slime-ui, landing pages, design system.", members: 4, repos: 5, role: "admin" },
  { name: "contractors", desc: "External contributors — scoped repo access only.", members: 9, repos: 3, role: "member" },
];

const roleIcon = { owner: Crown, admin: ShieldCheck, member: User };

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setGroups((g) => [...g, { name: n, desc: "", members: 1, repos: 0, role: "owner" }]);
    setOpen(false);
    setName("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="eyebrow"><span className="pulse-dot" /> TEAMS & ACCESS</div>
          <h1 className="text-2xl font-bold text-white mt-1.5"><span className="glow-text">Groups</span></h1>
          <p className="text-sm text-[#7a6b9d] mt-1">Teams map to Gitea organizations — members inherit repo and pipeline access.</p>
        </div>
        <button className="button primary" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> New group
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => {
          const RoleIcon = roleIcon[g.role];
          return (
            <article key={g.name} className="project-card">
              <div className="project-card-top">
                <div className="large-favicon"><Users className="w-4 h-4" /></div>
                <span className="visibility public flex items-center gap-1"><RoleIcon className="w-3 h-3" />{g.role}</span>
              </div>
              <div className="project-title-row"><h3>{g.name}</h3></div>
              <p>{g.desc || "No description yet."}</p>
              <div className="project-meta">
                <span>{g.members} member{g.members !== 1 ? "s" : ""}</span>
                <span>{g.repos} repo{g.repos !== 1 ? "s" : ""}</span>
              </div>
              <div className="project-divider" />
              <div className="project-footer">
                <span className="deploy-state live"><i />Active</span>
                <button className="open-project ml-auto" aria-label={`Open ${g.name}`}><ArrowRight className="w-4 h-4" /></button>
              </div>
            </article>
          );
        })}
      </div>

      {open && (
        <div className="modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div className="create-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setOpen(false)} aria-label="Close"><X className="w-4 h-4" /></button>
            <div className="modal-icon"><Users className="w-5 h-5" /></div>
            <div className="section-eyebrow">NEW TEAM</div>
            <h2>Create a group</h2>
            <p>Groups become organizations in Gitea and clearance tiers in Keycloak.</p>
            <form onSubmit={create}>
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
