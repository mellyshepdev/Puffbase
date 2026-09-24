"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

export default function NotificationSettings() {
  const [notif, setNotif] = useState({ pipelines: true, deploys: true, billing: false });

  return (
    <section className="slime-card drip-natural p-5">
      <h1 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
        <Bell className="w-4 h-4 text-slime-400" /> Notifications
      </h1>
      <p className="text-xs text-[#7a6b9d] mb-5">
        What this workspace should ping you about.
      </p>
      {(["pipelines", "deploys", "billing"] as const).map((k) => (
        <label key={k} className="toggle-row">
          <span className="capitalize">{k === "billing" ? "Billing & usage alerts" : `${k} status changes`}</span>
          <input type="checkbox" checked={notif[k]} onChange={() => setNotif((n) => ({ ...n, [k]: !n[k] }))} />
        </label>
      ))}
    </section>
  );
}
