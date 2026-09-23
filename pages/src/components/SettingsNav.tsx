"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Users,
  Bell,
  Key,
  Shield,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import clsx from "clsx";

const ITEMS = [
  { href: "/settings", label: "Accounts", icon: Users, exact: true },
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/plan", label: "Membership", icon: Sparkles },
  { href: "/settings/tokens", label: "Developer tokens", icon: Key },
  { href: "/settings/security", label: "Security", icon: Shield },
  { href: "/settings/advanced", label: "Advanced", icon: SlidersHorizontal },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
              active
                ? "bg-slime-600/20 text-white font-medium border-l-2 border-slime-500"
                : "text-[#9d8ec2] hover:bg-[var(--color-dark-hover)] hover:text-white",
            )}
          >
            <Icon className={clsx("w-4 h-4", active ? "text-slime-300" : "")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
