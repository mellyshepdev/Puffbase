"use client";

import { ArrowRight, CheckCircle2, Plug } from "lucide-react";

const integrations = [
  {
    name: "GitHub",
    desc: "Import repositories, sync issues, and trigger pipelines on push.",
    url: "https://github.com",
    status: "available",
    detail: "repos · issues · push hooks",
  },
  {
    name: "GitLab",
    desc: "Mirror projects and run deploys from GitLab pipelines.",
    url: "https://gitlab.com",
    status: "available",
    detail: "projects · mirroring · CI",
  },
  {
    name: "Linear",
    desc: "Link issues to branches and close tickets when deploys ship.",
    url: "https://linear.app",
    status: "available",
    detail: "issues · cycle tracking",
  },
  {
    name: "Notion",
    desc: "Sync docs and release notes into your Notion workspace.",
    url: "https://notion.so",
    status: "available",
    detail: "docs · release notes",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow"><span className="pulse-dot" /> PLATFORM</div>
        <h1 className="text-2xl font-bold text-white mt-1.5"><span className="glow-text">Integrations</span></h1>
        <p className="text-sm text-[#7a6b9d] mt-1">Connect the tools your team already uses.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((i) => (
          <article key={i.name} className="project-card">
            <div className="project-card-top">
              <div className="large-favicon"><Plug className="w-4 h-4" /></div>
              <span className={`visibility ${i.status === "available" ? "public" : "building"}`}>
                {i.status === "available" ? <CheckCircle2 className="w-3 h-3" /> : null}
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
