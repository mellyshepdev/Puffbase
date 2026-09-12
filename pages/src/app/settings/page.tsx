"use client";

import { useState } from "react";
import { User, Building2, Check, Bell, Shield, Save, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const [accountType, setAccountType] = useState<"personal" | "business">("personal");
  const [name, setName] = useState("slime_dev");
  const [email, setEmail] = useState("dev@puffbase.local");
  const [org, setOrg] = useState("");
  const [notif, setNotif] = useState({ pipelines: true, deploys: true, billing: false });
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="eyebrow"><span className="pulse-dot" /> ACCOUNT</div>
        <h1 className="text-2xl font-bold text-white mt-1.5"><span className="glow-text">Settings</span></h1>
        <p className="text-sm text-[#7a6b9d] mt-1">Workspace, account type, and preferences.</p>
      </div>

      {/* Personal or Business */}
      <section className="slime-card p-5">
        <h2 className="text-base font-semibold text-white mb-1">Account type</h2>
        <p className="text-xs text-[#7a6b9d] mb-4">Personal workspaces are free. Business adds teams, billing, and usage metering via Lago.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            className={`acct-type ${accountType === "personal" ? "selected" : ""}`}
            onClick={() => setAccountType("personal")}
          >
            <div className="acct-icon"><User className="w-5 h-5" /></div>
            <div className="text-left">
              <strong>Personal</strong>
              <p>One workspace. Unlimited public repos, community builds.</p>
            </div>
            {accountType === "personal" && <Check className="w-4 h-4 text-[#b6f34c] ml-auto" />}
          </button>
          <button
            className={`acct-type ${accountType === "business" ? "selected" : ""}`}
            onClick={() => setAccountType("business")}
          >
            <div className="acct-icon"><Building2 className="w-5 h-5" /></div>
            <div className="text-left">
              <strong>Business</strong>
              <p>Groups, metered usage, invoices, priority pipelines.</p>
            </div>
            {accountType === "business" && <Check className="w-4 h-4 text-[#b6f34c] ml-auto" />}
          </button>
        </div>
      </section>

      {/* Profile */}
      <section className="slime-card p-5">
        <h2 className="text-base font-semibold text-white mb-4">Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="field">Display name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {accountType === "business" && (
            <label className="field md:col-span-2">Organization name
              <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="e.g. Acme studio" />
            </label>
          )}
        </div>
      </section>

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
        <a href="https://auth.theofficialblacksheepco.com/realms/blacksheep/account" target="_blank" className="button secondary inline-flex">
          Open account console
        </a>
      </section>

      <div className="flex items-center gap-4">
        <button className="button primary" onClick={save}>
          <Save className="w-4 h-4" /> {saved ? "Saved" : "Save changes"}
        </button>
        <button className="text-[11px] text-red-400/80 hover:text-red-400 inline-flex items-center gap-1">
          <Trash2 className="w-3.5 h-3.5" /> Delete workspace
        </button>
      </div>
    </div>
  );
}
