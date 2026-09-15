"use client";

import { ArrowRight, CheckCircle2, Plug } from "lucide-react";

const integrations = [
  {
    name: "Gitea",
    desc: "Repositories, issues, and Actions pipelines — the forge behind the dashboard.",
    url: "https://git.prime-quality.online",
    status: "connected",
    detail: "git.prime-quality.online",
  },
  {
    name: "Lago",
    desc: "Usage metering and billing — meters build minutes, API calls, and storage into invoices.",
    url: "https://lago.prime-quality.online",
    status: "connected",
    detail: "lago.prime-quality.online",
  },
  {
    name: "CockroachDB",
    desc: "Primary application database — pgwire-compatible, distributed-ready.",
    url: "",
    status: "connected",
    detail: "tailnet :26257",
  },
  {
    name: "Keycloak SSO",
    desc: "Identity — one puffbase-branded login across dashboard, Gitea, and admin tools.",
    url: "https://auth.theofficialblacksheepco.com",
    status: "connected",
    detail: "auth · realm blacksheep",
  },
  {
    name: "Mastra agents",
    desc: "Agentic layer — repo analysis, deploy assistance, workflow automation over local models.",
    url: "",
    status: "planned",
    detail: "coming soon",
  },
  {
    name: "Stripe",
    desc: "Payment collection for Lago invoices — card payments for business accounts.",
    url: "",
    status: "planned",
    detail: "needs Lago billing first",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow"><span className="pulse-dot" /> PLATFORM</div>
        <h1 className="text-2xl font-bold text-white mt-1.5"><span className="glow-text">Integrations</span></h1>
        <p className="text-sm text-[#7a6b9d] mt-1">The services that make Puffbase one product.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((i) => (
          <article key={i.name} className="project-card">
            <div className="project-card-top">
              <div className="large-favicon"><Plug className="w-4 h-4" /></div>
              <span className={`visibility ${i.status === "connected" ? "public" : "building"}`}>
                {i.status === "connected" ? <CheckCircle2 className="w-3 h-3" /> : null}
                {i.status}
              </span>
            </div>
            <div className="project-title-row"><h3>{i.name}</h3></div>
            <p>{i.desc}</p>
            <div className="project-divider" />
            <div className="project-footer">
              <span className="text-[10px] text-[#5a4d7a] font-mono truncate">{i.detail}</span>
              {i.url && (
                <a href={i.url} target="_blank" className="open-project ml-auto" aria-label={`Open ${i.name}`}>
                  <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
