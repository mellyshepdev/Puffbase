import type { CSSProperties } from "react";
import { Route, Router, Switch, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppSidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { OozeOverlay } from "@/components/OozeOverlay";
import { AuthGate } from "@/components/AuthGate";
import Overview from "@/pages/Overview";
import Deployments from "@/pages/Deployments";
import Services from "@/pages/Services";
import Builder from "@/pages/Builder";
import Repositories from "@/pages/Repositories";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Overview", subtitle: "puffbase · production vat" },
  "/deployments": { title: "Deployments", subtitle: "rollouts across all environments" },
  "/services": { title: "Services", subtitle: "runtime fleet health" },
  "/builder": { title: "Site Builder", subtitle: "survey · generate · publish" },
  "/repositories": { title: "Repositories", subtitle: "live from Gitea" },
  "/analytics": { title: "Analytics", subtitle: "traffic · latency · errors" },
  "/settings": { title: "Settings", subtitle: "workspace configuration" },
};

function Shell() {
  const [location] = useLocation();
  const meta = PAGE_META[location] ?? { title: "Not found", subtitle: "unknown route" };

  return (
    <div className="relative flex min-h-svh w-full">
      {/* ambient purple atmosphere behind everything */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 55% at 18% -8%, hsl(278 85% 40% / 0.35), transparent 62%), radial-gradient(55% 45% at 92% 4%, hsl(292 80% 45% / 0.22), transparent 60%), radial-gradient(80% 60% at 50% 115%, hsl(272 80% 38% / 0.3), transparent 65%)",
        }}
      />
      <AppSidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header title={meta.title} subtitle={meta.subtitle} />
        <main className="slime-scroll relative flex-1">
          <Switch>
            <Route path="/" component={Overview} />
            <Route path="/deployments" component={Deployments} />
            <Route path="/services" component={Services} />
            <Route path="/builder/:id" component={Builder} />
            <Route path="/builder" component={Builder} />
            <Route path="/repositories" component={Repositories} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
      {/* THE OOZE — fixed, above content, never blocks clicks */}
      <OozeOverlay />
    </div>
  );
}

export default function App() {
  const sidebarStyle = {
    "--sidebar-width": "16.5rem",
    "--sidebar-width-icon": "3.25rem",
  } as CSSProperties;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AuthGate>
            <Router hook={useHashLocation}>
              <SidebarProvider style={sidebarStyle}>
                <Shell />
              </SidebarProvider>
            </Router>
          </AuthGate>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
