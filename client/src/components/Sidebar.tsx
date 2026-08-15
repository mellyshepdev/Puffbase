import { Link, useLocation } from "wouter";
import {
  Activity as ActivityIcon,
  BarChart3,
  Boxes,
  ChevronsUpDown,
  LayoutDashboard,
  Rocket,
  Settings as SettingsIcon,
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
import { PuffbaseLogo } from "@/components/PuffbaseLogo";
import { SlimeBar } from "@/components/kit";
import oozeSidebar from "@/assets/ooze-sidebar.webp";
import oozeRail from "@/assets/ooze-drip-rail.webp";

export const NAV_ITEMS = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Deployments", url: "/deployments", icon: Rocket },
  { title: "Services", url: "/services", icon: Boxes },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: SettingsIcon },
] as const;

export function AppSidebar() {
  const [location] = useLocation();

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
        <a
          href="https://bsco-hub-frontend.fly.dev/puffbase.html"
          data-testid="link-home-logo"
          className="block rounded-md p-1 hover-elevate"
        >
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
              {NAV_ITEMS.map((item) => {
                const active = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      data-testid={`link-nav-${item.title.toLowerCase()}`}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                        {active && (
                          <span
                            aria-hidden="true"
                            className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_2px_hsl(280_90%_62%/0.8)]"
                          />
                        )}
                      </Link>
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
        <div className="rounded-lg border border-sidebar-border/70 bg-sidebar-accent/40 p-2 backdrop-blur-sm group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 border border-primary/40">
              <AvatarFallback className="bg-primary/20 font-mono text-[11px] text-primary">
                MV
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">Mira Vex</div>
              <div className="truncate font-mono text-[10px] text-muted-foreground">
                Slime Ops · Pro
              </div>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </div>
        </div>
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

export default AppSidebar;
