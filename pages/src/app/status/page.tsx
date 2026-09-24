"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Rocket,
  GitBranch,
  CircleDot,
  Loader2,
} from "lucide-react";

interface Stats {
  repos: number;
  openIssues: number;
  activePipelines: number;
  totalPipelines: number;
  successPipelines: number;
  activeDeployments: number;
  successRate: number;
}

interface Pipeline {
  id: number;
  repoName?: string;
  commitMessage?: string;
  status: string;
  branch?: string;
}

interface Deployment {
  id: number;
  repoName?: string;
  status: string;
  environment?: string;
  url?: string;
}

function statusIcon(status: string) {
  switch (status) {
    case "success":
    case "live":
      return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case "failed":
    case "error":
      return <XCircle className="w-4 h-4 text-red-400" />;
    case "running":
    case "building":
      return <Loader2 className="w-4 h-4 text-slime-400 animate-spin" />;
    case "pending":
      return <Clock className="w-4 h-4 text-yellow-400" />;
    default:
      return <AlertTriangle className="w-4 h-4 text-[#7a6b9d]" />;
  }
}

export default function StatusPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats).catch(() => {});
    fetch("/api/pipelines").then((r) => r.json()).then((d) => setPipelines((Array.isArray(d) ? d : []).slice(0, 6))).catch(() => {});
    fetch("/api/deployments").then((r) => r.json()).then((d) => setDeployments((Array.isArray(d) ? d : []).slice(0, 6))).catch(() => {});
  }, []);

  const healthy = stats
    ? stats.activePipelines === 0 || stats.successRate >= 50
    : true;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-1">
        <Activity className="w-6 h-6 text-slime-400" />
        <h1 className="text-2xl font-bold text-white">Workspace status</h1>
      </div>
      <p className="text-sm text-[#7a6b9d] mb-8">
        Health and recent activity for this account&apos;s pipelines and deployments.
      </p>

      <div
        className={`mb-8 rounded-2xl border px-5 py-4 flex items-center gap-3 ${
          healthy ? "border-slime-600/40 bg-slime-500/5" : "border-yellow-600/40 bg-yellow-500/5"
        }`}
      >
        {healthy ? (
          <CheckCircle2 className="w-5 h-5 text-[#b6f34c]" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
        )}
        <div>
          <p className="text-sm font-semibold text-white">
            {healthy ? "Everything looks healthy" : "Some recent runs need attention"}
          </p>
          <p className="text-xs text-[#9d8ec2]">
            {stats
              ? `${stats.successRate}% pipeline success rate · ${stats.activeDeployments} live deployment${stats.activeDeployments === 1 ? "" : "s"}`
              : "Loading stats…"}
          </p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Repositories", value: stats.repos, icon: GitBranch },
            { label: "Open issues", value: stats.openIssues, icon: CircleDot },
            { label: "Pipelines run", value: stats.totalPipelines, icon: Activity },
            { label: "Deployments live", value: stats.activeDeployments, icon: Rocket },
          ].map((c, i) => (
            <div key={c.label} className={`slime-card drip-${["natural","med","sm","long"][i % 4]} p-4`}>
              <c.icon className="w-4 h-4 text-slime-400 mb-2" />
              <p className="text-2xl font-bold text-white">{c.value}</p>
              <p className="text-xs text-[#7a6b9d]">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <section className="slime-card drip-natural p-5">
          <h2 className="text-base font-semibold text-white mb-4">Recent pipelines</h2>
          {pipelines.length === 0 ? (
            <p className="text-sm text-[#5a4d7a]">No pipelines yet.</p>
          ) : (
            <div className="space-y-2.5">
              {pipelines.map((p) => (
                <div key={p.id} className="flex items-center gap-3 text-sm">
                  {statusIcon(p.status)}
                  <span className="text-white flex-1 truncate">{p.repoName ?? "pipeline"}{p.commitMessage ? ` · ${p.commitMessage}` : ""}</span>
                  {p.branch && <span className="text-[10px] font-mono text-[#5a4d7a]">{p.branch}</span>}
                  <span className="text-[10px] text-[#5a4d7a]">{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="slime-card drip-natural p-5">
          <h2 className="text-base font-semibold text-white mb-4">Recent deployments</h2>
          {deployments.length === 0 ? (
            <p className="text-sm text-[#5a4d7a]">No deployments yet.</p>
          ) : (
            <div className="space-y-2.5">
              {deployments.map((d) => (
                <div key={d.id} className="flex items-center gap-3 text-sm">
                  {statusIcon(d.status)}
                  <span className="text-white flex-1 truncate">{d.repoName ?? "deployment"}</span>
                  {d.environment && <span className="text-[10px] font-mono text-[#5a4d7a]">{d.environment}</span>}
                  <span className="text-[10px] text-[#5a4d7a]">{d.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
