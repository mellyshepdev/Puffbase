"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  AlertCircle,
  GitPullRequest,
  Rocket,
  Settings,
  Droplets,
  FolderGit2,
  Activity,
} from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/repos", label: "Repositories", icon: FolderGit2 },
  { href: "/issues", label: "Issues", icon: AlertCircle },
  { href: "/pipelines", label: "Pipelines", icon: GitPullRequest },
  { href: "/deploy", label: "Deployments", icon: Rocket },
  { href: "/status", label: "Status", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 w-64 h-screen flex flex-col bg-[var(--color-dark-surface)] border-r border-[var(--color-dark-border)] z-40">
      {/* Logo */}
      <div className="p-5 border-b border-[var(--color-dark-border)]">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-slime-500 to-goo-700 flex items-center justify-center glow-purple">
            <Droplets className="w-6 h-6 text-white" />
            {/* Drip effect under logo */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-3 bg-slime-500 rounded-b-full opacity-60 group-hover:h-5 transition-all duration-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight glow-text">
              SlimeGit
            </h1>
            <p className="text-[10px] text-slime-400 font-medium uppercase tracking-widest">
              Code Dashboard
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
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
                  ? "bg-gradient-to-r from-slime-700/40 to-slime-900/20 text-white border border-slime-600/30"
                  : "text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white border border-transparent"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-slime-400 rounded-r-full" />
              )}
              <Icon className={clsx("w-[18px] h-[18px]", isActive ? "text-slime-300" : "")} />
              <span>{label}</span>
              {isActive && (
                <div className="absolute -bottom-[3px] left-4 right-4 h-[3px] bg-gradient-to-r from-transparent via-slime-500/40 to-transparent rounded-b-full" />
              )}
            </Link>
          );
        })}
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
