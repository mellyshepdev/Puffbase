"use client";

import { Search, Bell, ChevronDown, Plus, GitBranch, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

interface SessionUser {
  sub: string;
  email?: string;
  name?: string;
}

function initials(label: string) {
  const parts = label.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function TopBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((r) => setUser(r.user))
      .catch(() => {});
  }, []);

  const label = user?.name || user?.email || "Account";

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-[var(--color-dark-border)] bg-[var(--color-dark-surface)]/80 backdrop-blur-xl flex items-center justify-between px-6">
      {/* Search bar */}
      <div className="flex-1 max-w-xl relative">
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${
            searchFocused
              ? "border-slime-500 bg-[var(--color-dark-bg)] shadow-[0_0_20px_rgba(139,61,255,0.15)]"
              : "border-[var(--color-dark-border)] bg-[var(--color-dark-card)]"
          }`}
        >
          <Search className={`w-4 h-4 transition-colors ${searchFocused ? "text-slime-400" : "text-[#5a4d7a]"}`} />
          <input
            type="text"
            placeholder="Search repositories, issues, pipelines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 bg-transparent text-sm text-white placeholder-[#5a4d7a] outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-[#5a4d7a] border border-[var(--color-dark-border)] rounded-md bg-[var(--color-dark-bg)]">
            ⌘K
          </kbd>
        </div>

        {/* Drip from search bar */}
        {searchFocused && (
          <div className="absolute -bottom-2 left-8 w-1 h-3 bg-slime-500 rounded-b-full animate-pulse" />
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4 ml-6">
        {/* New button */}
        <button className="slime-btn flex items-center gap-2 text-sm py-2 px-4">
          <Plus className="w-4 h-4" />
          <span>New</span>
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-[#9d8ec2] hover:text-white hover:bg-[var(--color-dark-hover)] transition-all">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-slime-500 rounded-full border-2 border-[var(--color-dark-surface)]" />
        </button>

        {/* Branch indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-dark-card)] border border-[var(--color-dark-border)] text-xs text-[#9d8ec2]">
          <GitBranch className="w-3.5 h-3.5 text-slime-400" />
          <span>main</span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-[var(--color-dark-border)]" />

        {/* Avatar / Account */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-[var(--color-dark-hover)] transition-all group"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slime-400 to-goo-700 flex items-center justify-center text-white text-sm font-bold ring-2 ring-slime-600/30 group-hover:ring-slime-400/50 transition-all">
                {initials(label)}
              </div>
              {/* Slime drip from avatar */}
              <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-2 bg-slime-500 rounded-b-full opacity-0 group-hover:opacity-60 transition-opacity" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-white truncate max-w-[10rem]">{label}</p>
              <p className="text-[10px] text-slime-400">{user?.email && user?.name ? user.email : "blacksheep account"}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#5a4d7a] hidden md:block" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] shadow-xl overflow-hidden z-50">
              <a
                href="/api/auth/logout"
                className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
