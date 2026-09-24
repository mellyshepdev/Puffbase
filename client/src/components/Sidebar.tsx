import { Link, useLocation } from "wouter";
import {
  Activity as ActivityIcon,
  BarChart3,
  Boxes,
  CircleUser,
  FileCode,
  GitBranch,
  LayoutDashboard,
  Rocket,
  Settings as SettingsIcon,
  Sparkles,
  Waves,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PuffbaseLogo } from "@/components/PuffbaseLogo";
import { SlimeBar } from "@/components/kit";
import { useAuth, logoutUrl } from "@/lib/auth";
import oozeSidebar from "@/assets/ooze-sidebar.webp";
import oozeRail from "@/assets/ooze-drip-rail.webp";

export const NAV_ITEMS = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  // The user dashboard is the customer app (dash.puff-base.com), not a
  // console route - external flag renders a plain anchor, not a hash Link.
  { title: "Dashboard", url: "https://dash.puff-base.com/", icon: CircleUser, external: true },
  { title: "Deployments", url: "/deployments", icon: Rocket },
  { title: "Services", url: "/services", icon: Boxes },
  { title: "Repositories", url: "/repositories", icon: GitBranch, adminOnly: true },
  { title: "Site Builder", url: "/builder", icon: Sparkles },
  { title: "Documents", url: "/documents", icon: FileCode },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: SettingsIcon },
] as const;

export function AppSidebar() {
  const [location] = useLocation();
  const { isAdmin } = useAuth();
  const navItems = NAV_ITEMS.filter((item) => !("adminOnly" in item && item.adminOnly) || isAdmin);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 [&_[data-sidebar=sidebar]]:bg-transparent"
    >
      {/* --- oozing sidebar backdrop --- */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <img
          src={oozeSidebar}
          alt=""
          className="h-full w-full object-cover opacity-[0.22] saturate-150"
        />
        <div className="absolute inset-0 bg-sidebar/[0.92]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(190deg, hsl(280 70% 30% / 0.55), transparent 45%), linear-gradient(to top, hsl(275 80% 40% / 0.35), transparent 55%)",
          }}
        />
        {/* slime running down the sidebar's right edge */}
        <img
          src={oozeRail}
          alt=""
          className="absolute right-0 top-0 h-full w-8 object-cover opacity-40 mix-blend-screen"
        />
        <div className="ooze-rail absolute right-0 top-0 h-full w-[2px]" />
      </div>

      <SidebarHeader className="px-3 pb-1 pt-4">
        {/* Real anchor, not the hash router - logo exits the console back to
            the public landing page at /. Console home is "Overview" in nav. */}
        <a href="/" data-testid="link-home-logo" className="block rounded-md p-1 hover-elevate">
          <PuffbaseLogo />
        </a>
      </SidebarHeader>

      <SidebarContent className="slime-scroll">
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/70">
            Platform
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = location === item.url;
                const inner = (
                  <>
                    <item.icon />
                    <span>{item.title}</span>
                    {active && (
                      <span
                        aria-hidden="true"
                        className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_2px_hsl(280_90%_62%/0.8)]"
                      />
                    )}
                  </>
                );
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="text-[#9d8ec2] data-[active=true]:text-emerald-300"
                      data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {"external" in item && item.external ? (
                        <a href={item.url}>{inner}</a>
                      ) : (
                        <Link href={item.url}>{inner}</Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/70">
            Vat capacity
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-3 px-2 pt-1">
            <UsageRow label="Ooze compute" value={68} detail="6.8 / 10 vCPU" icon={Waves} />
            <UsageRow label="Bandwidth" value={41} detail="410 GB / 1 TB" icon={ActivityIcon} />
            <UsageRow label="Build minutes" value={86} detail="4.3k / 5k min" icon={Rocket} tone="warn" />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 px-2 pb-4">
        <UserCard />
      </SidebarFooter>
    </Sidebar>
  );
}

function UsageRow({
  label,
  value,
  detail,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Waves;
  tone?: "primary" | "warn" | "bad";
}) {
  return (
    <div data-testid={`usage-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px]">
        <Icon className="h-3 w-3 text-primary" />
        <span className="text-sidebar-foreground/85">{label}</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">{value}%</span>
      </div>
      <SlimeBar value={value} tone={tone} className="h-1.5" />
      <div className="mt-1 font-mono text-[10px] text-muted-foreground">{detail}</div>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function UserCard() {
  const { user, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const label = user?.name || user?.email || "Signed in";

  return (
    <div className="rounded-lg border border-sidebar-border/70 bg-sidebar-accent/40 p-2 backdrop-blur-sm group-data-[collapsible=icon]:hidden">
      <div className="flex items-center gap-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1 text-left hover-elevate"
              data-testid="button-user-menu"
              title="Account menu"
            >
              <Avatar className="h-8 w-8 border border-primary/40">
                <AvatarFallback className="bg-primary/20 font-mono text-[11px] text-primary">
                  {initials(label)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">{label}</div>
                <div className="truncate font-mono text-[10px] text-muted-foreground">
                  {user?.email && user?.name ? user.email : "blacksheep account"}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {user?.email ?? "account"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() =>
                (window.location.href = "https://dash.puff-base.com/")
              }
            >
              User dashboard
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onSelect={() => navigate("/")}>
                Admin dashboard
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => navigate("/settings")}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => (window.location.href = "/")}>
              Back to site
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => (window.location.href = logoutUrl)}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default AppSidebar;
