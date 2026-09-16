"use client";

import { Search, Bell, ChevronDown, Plus, GitBranch, GitMerge, LogOut, Check, Building2, User as UserIcon, Settings as SettingsIcon, Star, ListTodo, Smile, Pencil, FolderGit2, AlertCircle, GitPullRequest, Rocket, Users, FileText, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { avatarSrc } from "@/lib/avatar";
import NewAccountDialog from "@/components/NewAccountDialog";

// "+ New" dropdown - each item lands on a full setup page (/new/<kind>).
const NEW_ITEMS = [
  { href: "/new/repository", label: "Repository", icon: FolderGit2 },
  { href: "/new/issue", label: "Issue", icon: AlertCircle },
  { href: "/new/merge-request", label: "Merge request", icon: GitMerge },
  { href: "/new/pipeline", label: "Pipeline run", icon: GitPullRequest },
  { href: "/new/deployment", label: "Deployment", icon: Rocket },
  { href: "/new/group", label: "Group", icon: Users },
  { href: "/new/document", label: "Document", icon: FileText },
];

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
  statusEmoji?: string | null;
  statusText?: string | null;
}

export function TopBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchRepos, setSearchRepos] = useState<{ id: string; name: string; description?: string | null }[]>([]);
  const [searchIssues, setSearchIssues] = useState<{ id: number; title: string; repoName?: string }[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [active, setActive] = useState<Account | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusEmoji, setStatusEmoji] = useState("");
  const [statusText, setStatusText] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newAcctOpen, setNewAcctOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const newRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((r) => {
        setUser(r.user);
        setIsAdmin(!!r.isAdmin);
      })
      .catch(() => {});
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((r) => {
        setAccounts(r.accounts ?? []);
        setActive(r.active ?? null);
      })
      .catch(() => {});
  }, []);

  // Live search - debounced fan-out over the account's repos + issues.
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchRepos([]);
      setSearchIssues([]);
      return;
    }
    const t = setTimeout(() => {
      const enc = encodeURIComponent(q);
      fetch(`/api/repos?search=${enc}`)
        .then((r) => r.json())
        .then((d) => setSearchRepos(Array.isArray(d) ? d.slice(0, 5) : []))
        .catch(() => {});
      fetch(`/api/issues?search=${enc}`)
        .then((r) => r.json())
        .then((d) => setSearchIssues(Array.isArray(d) ? d.slice(0, 5) : []))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!menuOpen && !newOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
      if (!newRef.current?.contains(e.target as Node)) setNewOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen, newOpen]);

  const switchAccount = async (id: string) => {
    if (id === active?.id) return setMenuOpen(false);
    const res = await fetch("/api/accounts/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) window.location.reload();
  };

  const onAccountCreated = async (acct: { id: string }) => {
    await fetch("/api/accounts/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: acct.id }),
    });
    window.location.reload();
  };

  const label = active?.name || user?.name || user?.email || "Account";

  const saveStatus = async () => {
    if (!active) return;
    const res = await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: active.id, statusEmoji, statusText }),
    });
    if (res.ok) {
      const updated = await res.json();
      setActive(updated);
      setAccounts((cur) => cur.map((a) => (a.id === updated.id ? updated : a)));
      setStatusOpen(false);
    }
  };

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
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                const first = searchRepos[0];
                window.location.href = first ? `/repos/${first.id}` : `/repos?search=${encodeURIComponent(searchQuery.trim())}`;
              }
            }}
            className="flex-1 bg-transparent text-sm text-white placeholder-[#5a4d7a] outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-[#5a4d7a] border border-[var(--color-dark-border)] rounded-md bg-[var(--color-dark-bg)]">
            ⌘K
          </kbd>
        </div>

        {/* Live results */}
        {searchFocused && searchQuery.trim() && (
          <div className="absolute left-0 right-0 mt-2 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] shadow-xl overflow-hidden z-50 py-1">
            {/* Brand hit - searching "puffbase" surfaces the emblem */}
            {/puff|sheep|slime|logo|emblem|brand/i.test(searchQuery) && (
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-dark-hover)] transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/puffbase-icon.png"
                  alt="Puffbase"
                  className="w-9 h-9 rounded-lg object-cover shrink-0"
                  style={{ boxShadow: "0 0 14px rgba(139,61,255,.4)" }}
                />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-white">Puffbase</span>
                  <span className="block text-[10px] text-[#5a4d7a]">Slime infra cloud — your dashboard</span>
                </span>
              </Link>
            )}
            {searchRepos.length === 0 && searchIssues.length === 0 && (
              <p className="px-3 py-2.5 text-xs text-[#5a4d7a]">No matches in this workspace.</p>
            )}
            {searchRepos.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-[#5a4d7a]">Repositories</p>
                {searchRepos.map((r) => (
                  <Link
                    key={r.id}
                    href={`/repos/${r.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all"
                  >
                    <FolderGit2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate font-medium">{r.name}</span>
                    {r.description && <span className="truncate text-[#5a4d7a]">{r.description}</span>}
                  </Link>
                ))}
              </>
            )}
            {searchIssues.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-[#5a4d7a]">Issues</p>
                {searchIssues.map((i) => (
                  <Link
                    key={i.id}
                    href="/issues"
                    className="flex items-center gap-2 px-3 py-2 text-xs text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate font-medium">{i.title}</span>
                    {i.repoName && <span className="truncate text-[#5a4d7a]">{i.repoName}</span>}
                  </Link>
                ))}
              </>
            )}
          </div>
        )}

        {/* Drip from search bar */}
        {searchFocused && !searchQuery.trim() && (
          <div className="absolute -bottom-2 left-8 w-1 h-3 bg-slime-500 rounded-b-full animate-pulse" />
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4 ml-6">
        {/* New button -> what to create? */}
        <div className="relative" ref={newRef}>
          <button onClick={() => setNewOpen((v) => !v)} className="slime-btn flex items-center gap-1 text-sm py-2 px-3" aria-label="New" title="New">
            <Plus className="w-4 h-4" />
            <ChevronDown className={`w-3 h-3 transition-transform ${newOpen ? "rotate-180" : ""}`} />
          </button>
          {newOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] shadow-xl overflow-hidden z-50 py-1">
              {NEW_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setNewOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all"
                >
                  <Icon className="w-3.5 h-3.5 text-slime-400" />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Notifications -> status feed */}
        <Link href="/status" className="relative p-2 rounded-lg text-[#9d8ec2] hover:text-white hover:bg-[var(--color-dark-hover)] transition-all">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-slime-500 rounded-full border-2 border-[var(--color-dark-surface)]" />
        </Link>

        {/* Branch indicator -> repos */}
        <Link href="/repos" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-dark-card)] border border-[var(--color-dark-border)] text-xs text-[#9d8ec2] hover:text-white transition-all">
          <GitBranch className="w-3.5 h-3.5 text-slime-400" />
          <span>main</span>
        </Link>

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
                  <img src={avatarSrc(active.avatar)} alt="" className="w-7 h-7" style={{ objectFit: "cover" }} />
                ) : (
                  <UserIcon className="w-4 h-4 text-white" />
                )}
              </div>
              {active?.statusEmoji ? (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--color-dark-card)] border-2 border-[var(--color-dark-surface)] flex items-center justify-center text-[8px] leading-none">
                  {active.statusEmoji}
                </div>
              ) : active?.kind === "business" ? (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-slime-600 border-2 border-[var(--color-dark-surface)] flex items-center justify-center">
                  <Building2 className="w-2 h-2 text-white" />
                </div>
              ) : null}
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
            <div className="absolute right-0 mt-2 w-60 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] shadow-xl overflow-hidden z-50">
              {/* user header w/ status */}
              <div className="px-3 py-3 border-b border-[var(--color-dark-border)]">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name ?? label}
                </p>
                <p className="text-[10px] text-[#5a4d7a] truncate">
                  {active?.statusEmoji || active?.statusText
                    ? `${active.statusEmoji ?? ""} ${active.statusText ?? ""}`.trim()
                    : user?.email ?? `${active?.kind ?? ""} account`}
                </p>
              </div>

              {/* profile items, GitLab-style */}
              <Link
                href="/settings/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit profile
              </Link>
              <button
                onClick={() => {
                  setStatusEmoji(active?.statusEmoji ?? "");
                  setStatusText(active?.statusText ?? "");
                  setStatusOpen(true);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all text-left"
              >
                <Smile className="w-3.5 h-3.5" />
                Edit status
              </button>
              <Link
                href="/repos?fav=1"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all"
              >
                <Star className="w-3.5 h-3.5" />
                Favorites
              </Link>
              <Link
                href="/merge-requests"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all"
              >
                <GitMerge className="w-3.5 h-3.5" />
                Merge requests
              </Link>
              <Link
                href="/issues?assignee=me"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all"
              >
                <ListTodo className="w-3.5 h-3.5" />
                My tasks
              </Link>

              <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#5a4d7a] border-t border-b border-[var(--color-dark-border)] mt-1">
                Switch workspace
              </div>
              {accounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => switchAccount(a.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all text-left"
                >
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-slime-400 to-goo-700 flex items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarSrc(a.avatar)} alt="" className="w-5 h-5" style={{ objectFit: "cover", borderRadius: "50%" }} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium">{a.name}</span>
                    <span className="block text-[10px] text-[#5a4d7a] capitalize">{a.kind}</span>
                  </span>
                  {a.id === active?.id && <Check className="w-3.5 h-3.5 text-slime-400 shrink-0" />}
                </button>
              ))}
              <button
                onClick={() => { setMenuOpen(false); setNewAcctOpen(true); }}
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
              {isAdmin && (
                <a
                  href="https://puffbase.prime-quality.online/console"
                  className="flex items-center gap-2 px-3 py-2.5 text-xs text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white transition-all"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin console
                </a>
              )}
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

      {/* Add business account - name + avatar image */}
      {newAcctOpen && (
        <NewAccountDialog kind="business" onClose={() => setNewAcctOpen(false)} onCreated={onAccountCreated} />
      )}

      {/* Edit status modal */}
      {statusOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setStatusOpen(false)}>
          <div className="w-80 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white mb-4">Set status</h3>
            <label className="block text-[10px] uppercase tracking-wider text-[#5a4d7a] mb-1.5">Emoji</label>
            <input
              value={statusEmoji}
              onChange={(e) => setStatusEmoji(e.target.value)}
              placeholder="🐑"
              maxLength={4}
              className="w-full mb-3 px-3 py-2 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white outline-none"
            />
            <label className="block text-[10px] uppercase tracking-wider text-[#5a4d7a] mb-1.5">Status</label>
            <input
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="In the pasture…"
              maxLength={120}
              className="w-full mb-4 px-3 py-2 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white placeholder-[#5a4d7a] outline-none"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setStatusOpen(false)} className="px-3 py-1.5 rounded-lg text-xs text-[#9d8ec2] hover:text-white">
                Cancel
              </button>
              <button onClick={saveStatus} className="slime-btn text-xs py-1.5 px-4">
                Save status
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
