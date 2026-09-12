import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Copy, Eye, EyeOff, KeyRound, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageShell, Panel, SectionTitle, SlimeBar } from "@/components/kit";
import { useToast } from "@/hooks/use-toast";

const PLANS = [
  { id: "puddle", name: "Puddle", price: "$0", detail: "1 service · 10k requests / mo" },
  { id: "drip", name: "Drip", price: "$29", detail: "5 services · 1M requests / mo" },
  { id: "ooze", name: "Ooze Pro", price: "$149", detail: "25 services · 50M requests / mo" },
  { id: "vat", name: "Vat Enterprise", price: "Custom", detail: "Unlimited · dedicated slime" },
] as const;

const settingsSchema = z.object({
  workspaceName: z.string().min(2, "At least 2 characters").max(48, "Too long"),
  slug: z
    .string()
    .min(2, "At least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  plan: z.enum(["puddle", "drip", "ooze", "vat"]),
  region: z.enum(["us-east-1", "us-west-2", "eu-west-1", "ap-south-1"]),
  description: z.string().max(240, "Keep it under 240 characters").optional(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

type ApiKey = { id: number; label: string; token: string; created: string; scope: string };

export default function Settings() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [prefs, setPrefs] = useState({
    deployAlerts: true,
    incidentPages: true,
    weeklyDigest: false,
    quotaWarnings: true,
    slimeReport: true,
  });

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      workspaceName: "Viscosity Labs",
      slug: "viscosity-labs",
      plan: "ooze",
      region: "us-east-1",
      description: "Primary workspace for the goo-gateway platform team.",
    },
  });

  const activePlan = PLANS.find((p) => p.id === form.watch("plan")) ?? PLANS[2];

  const onSubmit = (values: SettingsValues) => {
    toast({
      title: "Workspace saved",
      description: `${values.workspaceName} is now on ${
        PLANS.find((p) => p.id === values.plan)?.name
      }.`,
    });
  };

  const copyKey = async (key: ApiKey) => {
    try {
      await navigator.clipboard.writeText(key.token);
    } catch {
      /* clipboard may be unavailable in sandboxed frames — fall through to the toast */
    }
    setCopied(key.id);
    setTimeout(() => setCopied(null), 1600);
    toast({ title: "Token copied", description: key.label });
  };

  const createKey = () => {
    const id = Math.max(0, ...keys.map((k) => k.id)) + 1;
    const rand = Array.from({ length: 20 }, () =>
      "0123456789abcdef".charAt(Math.floor(Math.random() * 16)),
    ).join("");
    setKeys([
      ...keys,
      {
        id,
        label: `new-key-${id}`,
        token: `pb_live_${rand}`,
        created: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        scope: "read",
      },
    ]);
    toast({ title: "API key created", description: "Copy it now — it will not be shown again." });
  };

  return (
    <PageShell>
      <div>
        <SectionTitle hint="workspace · billing · keys">Settings</SectionTitle>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Tune the vat: workspace identity, plan, API credentials and what Puffbase pings you
          about.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel testId="panel-workspace" title="Workspace" subtitle="Identity and default region" bead>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="workspaceName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Workspace name</FormLabel>
                      <FormControl>
                        <Input data-testid="input-workspace-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">URL slug</FormLabel>
                      <FormControl>
                        <Input data-testid="input-workspace-slug" className="font-mono text-xs" {...field} />
                      </FormControl>
                      <FormDescription className="font-mono text-[10px]">
                        {field.value || "slug"}.puffbase.dev
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Plan</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-plan">
                            <SelectValue placeholder="Select a plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PLANS.map((p) => (
                            <SelectItem key={p.id} value={p.id} data-testid={`plan-option-${p.id}`}>
                              {p.name} — {p.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Default region</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-region">
                            <SelectValue placeholder="Select a region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["us-east-1", "us-west-2", "eu-west-1", "ap-south-1"].map((r) => (
                            <SelectItem key={r} value={r} data-testid={`region-option-${r}`}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        data-testid="input-workspace-description"
                        rows={3}
                        className="resize-none text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" data-testid="button-save-workspace">
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-testid="button-reset-workspace"
                  onClick={() => form.reset()}
                >
                  Reset
                </Button>
              </div>
            </form>
          </Form>
        </Panel>

        <div className="space-y-4">
          <Panel testId="panel-plan" title="Current plan" subtitle={activePlan.detail} quiet>
            <div className="flex items-baseline gap-2">
              <span className="goo-text text-2xl font-bold">{activePlan.price}</span>
              <span className="text-xs text-muted-foreground">
                {activePlan.price === "Custom" ? "annual contract" : "per month"}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <Quota label="Requests" used={41} detail="20.5M / 50M" />
              <Quota label="Services" used={32} detail="8 / 25" />
              <Quota label="Build minutes" used={86} detail="4.3k / 5k" tone="warn" />
            </div>
            <Separator className="my-4" />
            <Button variant="outline" size="sm" className="w-full" data-testid="button-manage-billing">
              Manage billing
            </Button>
          </Panel>

          <Panel
            testId="panel-notifications"
            title="Notifications"
            subtitle="What Puffbase pings you about"
            quiet
          >
            <div className="space-y-3.5">
              {(
                [
                  ["deployAlerts", "Deploy results", "Every production rollout"],
                  ["incidentPages", "Incident pages", "Page me when a service goes down"],
                  ["quotaWarnings", "Quota warnings", "At 80% of any plan limit"],
                  ["weeklyDigest", "Weekly digest", "Monday morning summary email"],
                  ["slimeReport", "Slime report", "Monthly ooze viscosity analysis"],
                ] as const
              ).map(([key, label, hint]) => (
                <div key={key} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Label htmlFor={`switch-${key}`} className="text-xs">
                      {label}
                    </Label>
                    <p className="text-[11px] text-muted-foreground">{hint}</p>
                  </div>
                  <Switch
                    id={`switch-${key}`}
                    data-testid={`switch-${key}`}
                    checked={prefs[key]}
                    onCheckedChange={(checked) => setPrefs((p) => ({ ...p, [key]: checked }))}
                  />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        testId="panel-api-keys"
        title="API keys"
        subtitle="Tokens are shown once at creation"
        action={
          <Button size="sm" variant="outline" onClick={createKey} data-testid="button-create-key">
            <Plus className="mr-1 h-3.5 w-3.5" />
            New key
          </Button>
        }
      >
        <ul className="divide-y divide-border/60">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex flex-wrap items-center gap-3 py-3"
              data-testid={`row-key-${key.id}`}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-primary/30 bg-primary/10 text-primary">
                <KeyRound className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold">{key.label}</div>
                <code className="font-mono text-[11px] text-muted-foreground">
                  {revealed === key.id ? key.token : `${key.token.slice(0, 8)}${"•".repeat(14)}`}
                </code>
              </div>
              <span className="rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {key.scope}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{key.created}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={revealed === key.id ? "Hide token" : "Reveal token"}
                  data-testid={`button-reveal-${key.id}`}
                  onClick={() => setRevealed(revealed === key.id ? null : key.id)}
                >
                  {revealed === key.id ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Copy token"
                  data-testid={`button-copy-${key.id}`}
                  onClick={() => copyKey(key)}
                >
                  {copied === key.id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive dark:text-red-400"
                  aria-label="Revoke key"
                  data-testid={`button-revoke-${key.id}`}
                  onClick={() => {
                    setKeys(keys.filter((k) => k.id !== key.id));
                    toast({ title: "Key revoked", description: key.label });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </PageShell>
  );
}

function Quota({
  label,
  used,
  detail,
  tone = "primary",
}: {
  label: string;
  used: number;
  detail: string;
  tone?: "primary" | "warn" | "bad";
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-[11px]">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">{detail}</span>
      </div>
      <SlimeBar value={used} tone={tone} className="h-1.5" />
    </div>
  );
}
