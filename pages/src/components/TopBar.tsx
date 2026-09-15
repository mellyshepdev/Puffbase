"use client";

import { Search, Bell, ChevronDown, Plus, GitBranch, LogOut, Check, Building2, User as UserIcon, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface SessionUser {
  sub: string;
  email?: string;
  name?: string;
}

interface Account {
  id: string;
  kind: "personal" | "business";
  name: string;
  avatar: string;
  businessUrl?: string | null;
}

export function TopBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [active, setActive] = useState<Account | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((r) => setUser(r.user))
      .catch(() => {});
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((r) => {
        setAccounts(r.accounts ?? []);
        setActive(r.active ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const switchAccount = async (id: string) => {
    if (id === active?.id) return setMenuOpen(false);
    const res = await fetch("/api/accounts/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) window.location.reload();
  };

  const addBusiness = async () => {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "business", name: "Business" }),
    });
    if (res.ok) {
      const acct = await res.json();
      await fetch("/api/accounts/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: acct.id }),
      });
      window.location.reload();
    }
  };

  const label = active?.name || user?.name || user?.email || "Account";

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
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-[var(--color-dark-hover)] transition-all group"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slime-400 to-goo-700 flex items-center justify-center overflow-hidden ring-2 ring-slime-600/30 group-hover:ring-slime-400/50 transition-all">
                {active?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/avatars/${active.avatar}.svg`} alt="" className="w-7 h-7" />
                ) : (
                  <UserIcon className="w-4 h-4 text-white" />
                )}
              </div>
              {active?.kind === "business" && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-slime-600 border-2 border-[var(--color-dark-surface)] flex items-center justify-center">
                  <Building2 className="w-2 h-2 text-white" />
                </div>
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-white truncate max-w-[10rem]">{label}</p>
              <p className="text-[10px] text-slime-400 capitalize">
                {active ? `${active.kind} account` : "account"}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#5a4d7a] hidden md:block" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] shadow-xl overflow-hidden z-50">
              <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#5a4d7a] border-b border-[var(--color-dark-border)]">
                Accounts
              </div>
              {accounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => switchAccount(a.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all text-left"
                >
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-slime-400 to-goo-700 flex items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/avatars/${a.avatar}.svg`} alt="" className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium">{a.name}</span>
                    <span className="block text-[10px] text-[#5a4d7a] capitalize">{a.kind}</span>
                  </span>
                  {a.id === active?.id && <Check className="w-3.5 h-3.5 text-slime-400 shrink-0" />}
                </button>
              ))}
              <button
                onClick={addBusiness}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all border-t border-[var(--color-dark-border)]"
              >
                <Building2 className="w-3.5 h-3.5" />
                Add business account
              </button>
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all"
              >
                <SettingsIcon className="w-3.5 h-3.5" />
                Settings
              </Link>
              <a
                href="/api/auth/logout"
                className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all border-t border-[var(--color-dark-border)]"
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
