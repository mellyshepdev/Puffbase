import type { ReactNode } from "react";
import { useAuth, loginUrl, logoutUrl } from "@/lib/auth";
import loginDrips from "@/assets/login-drips.png";
import { PuffbaseEmblem } from "@/components/PuffbaseLogo";

/** Every /api route is session-gated now (see server/index.ts) - this is the
 *  matching client-side gate: nothing behind it renders (and no data
 *  fetching for the dashboard pages starts) until /api/auth/me confirms a
 *  session. Login itself is a full-page redirect to Keycloak, not an SPA
 *  route - there is no local login form, the puffbase Keycloak theme IS the
 *  login screen. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary/40" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-background px-4">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background:
              "radial-gradient(70% 55% at 18% -8%, hsl(278 85% 40% / 0.35), transparent 62%), radial-gradient(55% 45% at 92% 4%, hsl(292 80% 45% / 0.22), transparent 60%), radial-gradient(80% 60% at 50% 115%, hsl(272 80% 38% / 0.3), transparent 65%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[38svh] bg-top bg-repeat-x"
          style={{ backgroundImage: `url(${loginDrips})`, backgroundSize: "auto 100%" }}
        />
        <div className="w-full max-w-sm rounded-2xl border border-card-border/80 bg-card/70 p-8 text-center backdrop-blur-sm">
          <PuffbaseEmblem className="mx-auto mb-2 h-36 w-auto" />
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with your Puffbase account to open the console.
          </p>
          <a
            href={loginUrl}
            data-testid="link-login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

  // Signed in but not on the admin allowlist: the console itself is an
  // admin surface, so nothing renders - no nav, no pages, nothing to click.
  // The data behind it was already 403'd by requireAdmin; this keeps the UI
  // invisible rather than showing an all-errors shell.
  if (!isAdmin) {
    return (
      <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-background px-4">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background:
              "radial-gradient(70% 55% at 18% -8%, hsl(278 85% 40% / 0.35), transparent 62%), radial-gradient(55% 45% at 92% 4%, hsl(292 80% 45% / 0.22), transparent 60%), radial-gradient(80% 60% at 50% 115%, hsl(272 80% 38% / 0.3), transparent 65%)",
          }}
        />
        <div className="w-full max-w-sm rounded-2xl border border-card-border/80 bg-card/70 p-8 text-center backdrop-blur-sm">
          <PuffbaseEmblem className="mx-auto mb-2 h-36 w-auto" />
          <p className="text-sm font-medium">This console is for the instance administrator.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your account can use the customer dashboard instead.
          </p>
          <a
            href="https://dash.puff-base.com"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to your dashboard
          </a>
          <a
            href={logoutUrl}
            className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary"
          >
            Sign out
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
