import { CreditCard, ExternalLink, KeyRound, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PageShell, Panel, SectionTitle } from "@/components/kit";
import { logoutUrl, useAuth } from "@/lib/auth";

export default function Settings() {
  const { user, isAdmin } = useAuth();
  const label = user?.name || user?.email || "Signed in";

  return (
    <PageShell>
      <div>
        <SectionTitle hint="account · billing · keys">Settings</SectionTitle>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Console settings — the account you're operating as, where API credentials live,
          and where billing is managed.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel testId="panel-identity" title="Signed in as" subtitle="Your account identity" bead>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-primary/40 bg-primary/15 text-primary">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{label}</div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">
                {user?.email ?? user?.sub}
              </div>
            </div>
            <span className="ml-auto rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {isAdmin ? "operator" : "member"}
            </span>
          </div>
          <div className="mt-4 space-y-2 border-t border-border/60 pt-4 font-mono text-[11px]">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">subject</span>
              <span className="truncate">{user?.sub ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">session</span>
              <span>single sign-on</span>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" asChild data-testid="button-sign-out">
              <a href={logoutUrl}>
                <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
              </a>
            </Button>
          </div>
        </Panel>

        <Panel
          testId="panel-security"
          title="Account security"
          subtitle="Password and sign-in methods"
          quiet
        >
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Password, email, and multi-factor settings are managed on your account
              console — the same sign-in that guards the customer dashboard.
            </p>
          </div>
          <Button variant="outline" size="sm" className="mt-4 w-full" asChild data-testid="link-account-security">
            <a
              href="https://auth.theofficialblacksheepco.com/realms/puffbase-customers/account/"
              target="_blank"
              rel="noreferrer"
            >
              Open account console <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
        </Panel>

        <Panel testId="panel-billing" title="Billing" subtitle="Plan, card and subscriptions" quiet>
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Card-on-file status, active subscriptions, and per-site plans live on the
              billing page; membership changes run through the hosted plan page.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" asChild data-testid="link-billing-page">
              <Link href="/payment">Open billing</Link>
            </Button>
            <Button variant="outline" size="sm" asChild data-testid="link-plan-page">
              <a href="https://puff-base.store/plan" target="_blank" rel="noreferrer">
                Manage membership <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </Panel>

        <Panel testId="panel-api-keys" title="API keys" subtitle="Programmatic access tokens" quiet>
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Tokens are scoped to your account and managed on the customer dashboard —
              create them for classic or fine-grained access, and revoke them there.
            </p>
          </div>
          <Button variant="outline" size="sm" className="mt-4 w-full" asChild data-testid="link-tokens-page">
            <a href="https://dash.puff-base.com/settings/tokens" target="_blank" rel="noreferrer">
              Manage API tokens <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
        </Panel>
      </div>
    </PageShell>
  );
}
