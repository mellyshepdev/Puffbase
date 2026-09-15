import { useState } from "react";
import { Bell, Command, Compass, Moon, Rocket, Search, Sun } from "lucide-react";
import { startPuffbaseTour } from "@/lib/tour";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { useAuth, logoutUrl } from "@/lib/auth";
import { StatusDot } from "@/components/kit";

const NOTIFICATIONS = [
  { id: 1, text: "ooze-queue latency above SLO", tone: "degraded", when: "3m" },
  { id: 2, text: "goo-gateway v4.12.0 deployed", tone: "deployed", when: "26m" },
  { id: 3, text: "residue-analytics health check failed", tone: "failed", when: "1h" },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme, toggle } = useTheme();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [query, setQuery] = useState("");
  const userLabel = user?.name || user?.email || "Signed in";

  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl"
    >
      {/* slime lip hanging off the bottom of the header */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-full h-4"
        style={{
          background:
            "radial-gradient(6px 10px at 10px 0, hsl(279 88% 58% / 0.75) 98%, transparent 100%) 0 0 / 38px 16px repeat-x, radial-gradient(3px 14px at 4px 0, hsl(287 90% 66% / 0.6) 98%, transparent 100%) 19px 0 / 53px 16px repeat-x",
          filter: "drop-shadow(0 3px 8px hsl(278 90% 50% / 0.4))",
        }}
      />

      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <SidebarTrigger data-testid="button-sidebar-toggle" className="h-8 w-8" />
        <Separator orientation="vertical" className="mr-1 hidden h-6 md:block" />

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold tracking-tight" data-testid="text-page-title">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        <div className="relative hidden w-64 lg:block xl:w-80">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="input-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services, deploys…"
            className="h-9 border-border/70 bg-card/60 pl-8 pr-12 text-xs backdrop-blur"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-border/80 bg-muted px-1.5 font-mono text-[10px] text-muted-foreground xl:flex">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => startPuffbaseTour()}
          data-testid="button-tour"
          aria-label="Take a guided tour"
          title="Take a guided tour"
        >
          <Compass className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          data-testid="button-deploy"
          onClick={() =>
            toast({
              title: "Deploy queued",
              description: "goo-gateway is oozing toward production.",
            })
          }
          className="hidden gap-1.5 sm:inline-flex"
        >
          <Rocket className="h-3.5 w-3.5" />
          Deploy
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9"
              data-testid="button-notifications"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_2px_hsl(280_90%_62%/0.8)]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider">
              Alerts
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {NOTIFICATIONS.map((n) => (
              <DropdownMenuItem key={n.id} className="gap-2" data-testid={`notification-${n.id}`}>
                <StatusDot status={n.tone} />
                <span className="flex-1 text-xs">{n.text}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{n.when}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={toggle}
          data-testid="button-theme-toggle"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded-full hover-elevate"
              data-testid="button-avatar-menu"
              aria-label="Account menu"
              title={userLabel}
            >
              <Avatar className="h-8 w-8 border border-primary/40" data-testid="img-avatar">
                <AvatarFallback className="bg-primary/20 font-mono text-[11px] text-primary">
                  {initials(userLabel)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {user?.email ?? userLabel}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() =>
                (window.location.href = "https://app.prime-quality.online")
              }
              data-testid="menu-item-dashboard"
            >
              User dashboard
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem
                onSelect={() => (window.location.hash = "#/")}
                data-testid="menu-item-admin"
              >
                Admin dashboard
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => (window.location.hash = "#/settings")}
              data-testid="menu-item-settings"
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => (window.location.href = logoutUrl)}
              data-testid="menu-item-sign-out"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default Header;
