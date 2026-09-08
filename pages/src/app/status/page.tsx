"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Server,
  Database,
  Globe,
  Cpu,
  HardDrive,
  Wifi,
  Shield,
  Zap,
} from "lucide-react";

interface Stats {
  repos: number;
  openIssues: number;
  totalStars: number;
  activePipelines: number;
  totalPipelines: number;
  successPipelines: number;
  activeDeployments: number;
  successRate: number;
}

const services = [
  { name: "API Gateway", status: "operational", icon: Globe, latency: "12ms", uptime: "99.99%" },
  { name: "Build System", status: "operational", icon: Cpu, latency: "—", uptime: "99.97%" },
  { name: "Database Cluster", status: "operational", icon: Database, latency: "3ms", uptime: "100%" },
  { name: "Edge Network", status: "operational", icon: Wifi, latency: "8ms", uptime: "99.98%" },
  { name: "Storage Service", status: "operational", icon: HardDrive, latency: "5ms", uptime: "99.99%" },
  { name: "Auth Service", status: "degraded", icon: Shield, latency: "45ms", uptime: "99.91%" },
  { name: "Pipeline Runner", status: "operational", icon: Server, latency: "—", uptime: "99.95%" },
  { name: "CDN", status: "operational", icon: Zap, latency: "2ms", uptime: "100%" },
];

const incidents = [
  {
    title: "Elevated latency on Auth Service",
    status: "investigating",
    severity: "minor",
    time: "25 minutes ago",
    updates: [
      { time: "25 min ago", text: "We are investigating reports of increased latency on the authentication service." },
      { time: "15 min ago", text: "Root cause identified: connection pool exhaustion on auth-db replica. Scaling up replicas." },
      { time: "5 min ago", text: "Additional replicas provisioned. Latency improving. Monitoring closely." },
    ],
  },
  {
    title: "Pipeline Runner scheduled maintenance",
    status: "completed",
    severity: "maintenance",
    time: "2 hours ago",
    updates: [
      { time: "3h ago", text: "Scheduled maintenance window beginning for pipeline runner infrastructure upgrade." },
      { time: "2h ago", text: "Maintenance completed successfully. All systems operational." },
    ],
  },
];

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  operational: { bg: "bg-green-500/10", text: "text-green-400", dot: "bg-green-400" },
  degraded: { bg: "bg-yellow-500/10", text: "text-yellow-400", dot: "bg-yellow-400" },
  outage: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
};

export default function StatusPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3 glow-text">
          <Activity className="w-6 h-6 text-slime-400" />
          System Status
        </h1>
        <p className="text-sm text-[#7a6b9d] mt-1">Real-time monitoring of all SlimeGit services</p>
      </div>

      {/* Overall status banner */}
      <div className="slime-card p-5 bg-gradient-to-r from-[var(--color-dark-card)] to-green-900/10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center glow-purple">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">All Systems Operational</h2>
            <p className="text-sm text-[#7a6b9d]">
              7 of 8 services fully operational · 1 minor degradation
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-[#5a4d7a]">
            <Clock className="w-3.5 h-3.5" />
            Last checked: just now
          </div>
        </div>
      </div>

      {/* Uptime bars (last 30 days) */}
      <div className="slime-card p-5">
        <h2 className="text-base font-semibold text-white mb-4">Uptime — Last 30 Days</h2>
        <div className="flex items-end gap-[2px] h-10">
          {Array.from({ length: 30 }, (_, i) => {
            const hasIssue = i === 5 || i === 12 || i === 25;
            return (
              <div
                key={i}
                className={`flex-1 rounded-sm transition-all hover:opacity-80 ${
                  hasIssue ? "bg-yellow-500/60" : "bg-green-500/60"
                }`}
                style={{ height: hasIssue ? "60%" : "100%" }}
                title={`Day ${30 - i}: ${hasIssue ? "99.5%" : "100%"}`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2 text-[10px] text-[#5a4d7a]">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-500/60" />
            <span className="text-[#7a6b9d]">Operational</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-yellow-500/60" />
            <span className="text-[#7a6b9d]">Degraded</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-500/60" />
            <span className="text-[#7a6b9d]">Outage</span>
          </div>
        </div>
      </div>

      {/* Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {services.map((service) => {
          const colors = statusColors[service.status] || statusColors.operational;
          return (
            <div key={service.name} className="slime-card p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                <service.icon className={`w-5 h-5 ${colors.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-white">{service.name}</h3>
                  <div className={`w-2 h-2 rounded-full ${colors.dot} animate-pulse`} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-[#5a4d7a]">
                  <span>Latency: <span className="text-[#9d8ec2]">{service.latency}</span></span>
                  <span>Uptime: <span className="text-[#9d8ec2]">{service.uptime}</span></span>
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                {service.status}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active Incidents */}
      <div className="slime-card p-5">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          Recent Incidents
        </h2>
        <div className="space-y-4">
          {incidents.map((incident, i) => (
            <div key={i} className="p-4 rounded-lg bg-[var(--color-dark-bg)]/50 border border-[var(--color-dark-border)]">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    incident.severity === "minor"
                      ? "bg-yellow-500/15 text-yellow-400"
                      : "bg-blue-500/15 text-blue-400"
                  }`}
                >
                  {incident.severity}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    incident.status === "investigating"
                      ? "bg-orange-500/15 text-orange-400"
                      : "bg-green-500/15 text-green-400"
                  }`}
                >
                  {incident.status}
                </span>
                <h3 className="text-sm font-medium text-white">{incident.title}</h3>
                <span className="text-[10px] text-[#5a4d7a] ml-auto">{incident.time}</span>
              </div>
              <div className="space-y-2 ml-4 border-l-2 border-[var(--color-dark-border)] pl-4">
                {incident.updates.map((update, j) => (
                  <div key={j} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-slime-500 -ml-[21px] mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-[#5a4d7a]">{update.time}</span>
                      <p className="text-xs text-[#9d8ec2] mt-0.5">{update.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Stats */}
      {stats && (
        <div className="slime-card p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-slime-400" />
            Platform Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Repos", value: stats.repos, color: "text-slime-300" },
              { label: "Total Stars", value: stats.totalStars.toLocaleString(), color: "text-yellow-400" },
              { label: "Pipeline Success", value: `${stats.successRate}%`, color: "text-green-400" },
              { label: "Open Issues", value: stats.openIssues, color: "text-orange-400" },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-3 rounded-lg bg-[var(--color-dark-bg)]/50">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[11px] text-[#5a4d7a] mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
