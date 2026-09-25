"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import {
  LayoutDashboard,
  GitBranch,
  AlertCircle,
  GitPullRequest,
  GitMerge,
  Rocket,
  Settings,
  FolderGit2,
  Activity,
  Sparkles,
  ArrowRight,
  Plug,
  ChevronDown,
  Milestone,
  Code2,
} from "lucide-react";
import clsx from "clsx";
import { useRef } from "react";
import { SettingsNav } from "@/components/SettingsNav";
import { RepoSettingsNav } from "@/components/RepoSettingsNav";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/repos", label: "Repositories", icon: FolderGit2 },
  { href: "/issues", label: "Issues", icon: AlertCircle },
  { href: "/merge-requests", label: "Merge requests", icon: GitMerge },
  { href: "/pipelines", label: "Pipelines", icon: GitPullRequest },
  { href: "/deploy", label: "Deployments", icon: Rocket },
  { href: "/builder", label: "Site Builder", icon: Sparkles },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/status", label: "Status", icon: Activity },
];

// The icon's dropdown - the full workspace menu, GitLab-style.
const menuItems = [
  { href: "/", label: "Home / Dashboard", icon: LayoutDashboard },
  { href: "/repos", label: "Repositories", icon: FolderGit2 },
  { href: "/issues", label: "Issues", icon: AlertCircle },
  { href: "/issues?milestone=1", label: "Milestones", icon: Milestone },
  { href: "/merge-requests", label: "Merge requests", icon: GitMerge },
  { href: "/repos", label: "Branches", icon: GitBranch },
  { href: "/pipelines", label: "Pipelines", icon: GitPullRequest },
  { href: "/deploy", label: "Deployments", icon: Rocket },
  { href: "/builder", label: "Site Builder", icon: Sparkles },
  { href: "/editor", label: "Editor", icon: Code2 },
  { href: "/status", label: "Status", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [logoMenuOpen, setLogoMenuOpen] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!logoMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (!logoRef.current?.contains(e.target as Node)) setLogoMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [logoMenuOpen]);

  useEffect(() => {
    fetch("/api/repos").then((r) => r.json()).then((r) => setProjects(r.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <aside className="fixed top-0 left-0 w-64 h-screen flex flex-col bg-[var(--color-dark-surface)] border-r border-[var(--color-dark-border)] z-40 overflow-hidden">
      {/* Ooze backdrop, matching the admin dashboard's sidebar treatment */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <img
          src="/ooze-sidebar.webp"
          alt=""
          className="h-full w-full object-cover opacity-[0.22] saturate-150"
        />
        <div className="absolute inset-0 bg-[var(--color-dark-surface)]/[0.92]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(190deg, hsl(280 70% 30% / 0.55), transparent 45%), linear-gradient(to top, hsl(275 80% 40% / 0.35), transparent 55%)",
          }}
        />
        <img
          src="/ooze-drip-rail.webp"
          alt=""
          className="absolute right-0 top-0 h-full w-8 object-cover opacity-40 mix-blend-screen"
        />
      </div>

      {/* Logo: icon opens the workspace menu, wordmark goes to the landing page */}
      <div className="p-5 border-b border-[var(--color-dark-border)] relative" ref={logoRef}>
        <div className="flex items-center gap-2.5 group">
          <button
            onClick={() => setLogoMenuOpen((v) => !v)}
            className="flex items-center gap-1 rounded-lg p-1 -m-1 hover:bg-[var(--color-dark-hover)] transition-all"
            title="Menu"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/puffbase-emblem.png" alt="" className="h-28 w-auto shrink-0 object-contain drop-shadow-[0_0_12px_hsl(280_90%_60%/0.55)]" />
            <ChevronDown className={clsx("w-3 h-3 text-[#5a4d7a] transition-transform", logoMenuOpen && "rotate-180")} />
          </button>
          <a href="https://puffbase.prime-quality.online" className="min-w-0">
            <div className="truncate text-base font-bold tracking-tight text-white">Puffbase</div>
            <div className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-[#5a4d7a]">
              slime infra cloud
            </div>
          </a>
        </div>
        {logoMenuOpen && (
          <div className="absolute left-3 right-3 top-full mt-1 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] shadow-xl z-50 py-1">
            {menuItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setLogoMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all"
              >
                <Icon className="w-3.5 h-3.5 text-slime-400" />
                {label}
              </Link>
            ))}
            <Link
              href="/plan"
              onClick={() => setLogoMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#b6f34c] hover:bg-[var(--color-dark-hover)] transition-all border-t border-[var(--color-dark-border)] mt-1 pt-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Upgrade subscription
            </Link>
          </div>
        )}
      </div>

      {/* Navigation — on settings pages the workspace-settings menu sits on
          top of the regular nav inside this same panel, pushing it down */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {(pathname.startsWith("/settings") || pathname === "/plan") && (
          <div className="mb-4 pb-4 border-b border-[var(--color-dark-border)]">
            <p className="px-3 mb-3 text-[10px] font-semibold text-slime-400/60 uppercase tracking-widest">
              Workspace settings
            </p>
            <SettingsNav />
          </div>
        )}
        {/^\/repos\/[^/]+/.test(pathname) && (
          <div className="mb-4 pb-4 border-b border-[var(--color-dark-border)]">
            <p className="px-3 mb-3 text-[10px] font-semibold text-slime-400/60 uppercase tracking-widest">
              Repo settings
            </p>
            <Suspense fallback={null}>
              <RepoSettingsNav />
            </Suspense>
          </div>
        )}
        <p className="px-3 mb-3 text-[10px] font-semibold text-slime-400/60 uppercase tracking-widest">
          Navigation
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group",
                isActive
                  ? "bg-gradient-to-r from-slime-700/40 to-slime-900/20 text-[#b6f34c] border border-slime-600/30"
                  : "text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white border border-transparent"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-slime-400 rounded-r-full" />
              )}
              <Icon className={clsx("w-[18px] h-[18px]", isActive ? "text-[#b6f34c]" : "")} />
              <span>{label}</span>
              {isActive && (
                <div className="absolute -bottom-[3px] left-4 right-4 h-[3px] bg-gradient-to-r from-transparent via-slime-500/40 to-transparent rounded-b-full" />
              )}
            </Link>
          );
        })}

        {/* Mini projects */}
        {projects.length > 0 && (
          <div className="mt-5">
            <p className="px-3 mb-2 text-[10px] font-semibold text-slime-400/60 uppercase tracking-widest">
              Projects
            </p>
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/repos/${p.id}`}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all"
              >
                <span className="w-5 h-5 rounded-md bg-gradient-to-br from-slime-500 to-goo-700 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                  {p.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate">{p.name}</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#b6f34c]" />
              </Link>
            ))}
          </div>
        )}

        {/* Upgrade card */}
        <div className="mt-5 mx-1 p-4 rounded-xl border border-slime-600/40 bg-gradient-to-br from-[#31114b] to-[#190f28] relative overflow-hidden drip-med">
          <div className="w-7 h-7 rounded-lg bg-[#b6f34c] flex items-center justify-center mb-2.5">
            <Sparkles className="w-4 h-4 text-[#241132]" />
          </div>
          <p className="text-xs font-bold text-white">Unlock the whole slime</p>
          <p className="text-[10px] text-[#9d8ec2] mt-1 mb-2.5">Unlimited builds, private repos, and more.</p>
          <Link href="/plan" className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#b6f34c] hover:text-white transition-colors">
            Explore Pro <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </nav>

      {/* Bottom section with slime drip effect */}
      <div className="p-4 border-t border-[var(--color-dark-border)] relative">
        {/* Decorative drips */}
        <div className="absolute -top-4 left-6 w-1.5 h-5 bg-gradient-to-b from-slime-600 to-slime-500 rounded-b-full opacity-40" />
        <div className="absolute -top-6 left-20 w-1 h-7 bg-gradient-to-b from-slime-700 to-slime-500 rounded-b-full opacity-30" />
        <div className="absolute -top-3 right-12 w-1.5 h-4 bg-gradient-to-b from-slime-600 to-slime-400 rounded-b-full opacity-35" />

        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all"
        >
          <Settings className="w-[18px] h-[18px]" />
          <span>Settings</span>
        </Link>
        <div className="mt-3 px-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-[#7a6b9d]">All systems operational</span>
        </div>
      </div>
    </aside>
  );
}
