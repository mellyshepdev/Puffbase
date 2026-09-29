import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bell, Compass, Moon, Rocket, Sun } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { useAuth, logoutUrl } from "@/lib/auth";
import { StatusDot } from "@/components/kit";
import { useActivity, relativeTime } from "@/lib/data";
import { apiRequest, queryClient } from "@/lib/queryClient";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme, toggle } = useTheme();
  const { user, isAdmin } = useAuth();
  const { data: activity } = useActivity();
  const userLabel = user?.name || user?.email || "Signed in";
  const alerts = activity.slice(0, 6);

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

        <DeployDialog />

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
              {alerts.length > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_2px_hsl(280_90%_62%/0.8)]" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider">
              Activity
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {alerts.length === 0 ? (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                No recent activity
              </DropdownMenuItem>
            ) : (
              alerts.map((n) => (
                <DropdownMenuItem key={n.id} className="gap-2" data-testid={`notification-${n.id}`}>
                  <StatusDot status={n.severity} />
                  <span className="flex-1 text-xs">{n.message}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {relativeTime(n.timestamp)}
                  </span>
                </DropdownMenuItem>
              ))
            )}
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
                (window.location.href = "https://dash.puff-base.com/")
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

/* Real deploy: POST /api/deployments writes the row and, when a subdomain is
 * supplied, registers a real Host() edge route through the locator. */
function DeployDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [environment, setEnvironment] = useState<string>("production");
  const [subdomain, setSubdomain] = useState("");
  const [error, setError] = useState<string | null>(null);

  const deploy = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/deployments", {
        name: name.trim(),
        version: version.trim(),
        environment,
        status: "in-progress",
        lastDeployed: new Date().toISOString(),
        subdomain: subdomain.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: (d: { name: string; url?: string | null }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Deploy queued",
        description: d.url ? `${d.name} will answer at ${d.url}` : `${d.name} is rolling out.`,
      });
      setOpen(false);
      setName("");
      setVersion("");
      setSubdomain("");
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          data-testid="button-deploy"
          className="hidden gap-1.5 sm:inline-flex"
        >
          <Rocket className="h-4 w-4" />
          Deploy
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New deployment</DialogTitle>
          <DialogDescription>
            Registers the rollout — and with a subdomain, a real edge route.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="deploy-name" className="text-xs">Service name</Label>
            <Input
              id="deploy-name"
              data-testid="input-deploy-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="goo-gateway"
              className="h-9 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="deploy-version" className="text-xs">Version</Label>
              <Input
                id="deploy-version"
                data-testid="input-deploy-version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0.0"
                className="h-9 font-mono text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Environment</Label>
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger data-testid="select-deploy-env" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["production", "staging", "development"].map((env) => (
                    <SelectItem key={env} value={env} className="text-xs capitalize">
                      {env}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="deploy-subdomain" className="text-xs">
              Subdomain <span className="text-muted-foreground">(optional — creates the edge route)</span>
            </Label>
            <Input
              id="deploy-subdomain"
              data-testid="input-deploy-subdomain"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
              placeholder="my-service"
              className="h-9 font-mono text-xs"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            data-testid="button-deploy-confirm"
            disabled={!name.trim() || !version.trim() || deploy.isPending}
            onClick={() => deploy.mutate()}
          >
            Deploy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
