"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Settings,
  Lock,
  RefreshCw,
  Users,
  Webhook,
  Plug,
  Key,
  Trash2,
} from "lucide-react";
import clsx from "clsx";

const ITEMS = [
  { section: "general", label: "General", icon: Settings },
  { section: "visibility", label: "Visibility", icon: Lock },
  { section: "collaborators", label: "Collaborations", icon: Users },
  { section: "webhooks", label: "Webhooks", icon: Webhook },
  { section: "integrations", label: "Integrations", icon: Plug },
  { section: "deploy-keys", label: "Deploy keys", icon: Key },
  { section: "mirroring", label: "Mirroring", icon: RefreshCw },
  { section: "danger", label: "Danger zone", icon: Trash2 },
];

/** Repo-settings menu rendered at the top of the left sidebar while the
 *  visitor is inside /repos/<id> — above the regular Navigation items. */
export function RepoSettingsNav() {
  const pathname = usePathname();
  const search = useSearchParams();
  const m = pathname.match(/^\/repos\/([^/]+)/);
  if (!m) return null;
  const repoId = m[1];
  const inSettings = search.get("tab") === "settings";
  const active = inSettings ? search.get("section") ?? "general" : null;
  return (
    <nav className="space-y-0.5">
      {ITEMS.map(({ section, label, icon: Icon }) => (
        <Link
          key={section}
          href={`/repos/${repoId}?tab=settings&section=${section}`}
          className={clsx(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
            active === section
              ? "bg-slime-600/20 text-white font-medium border-l-2 border-slime-500"
              : "text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white",
          )}
        >
          <Icon className={clsx("w-4 h-4", active === section ? "text-slime-300" : "")} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
