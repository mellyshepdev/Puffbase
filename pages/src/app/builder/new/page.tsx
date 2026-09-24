"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";

const SURVEY_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: "business", label: "What does it do?", placeholder: "Mobile phone repair, cloud backups, a bakery..." },
  { key: "audience", label: "Who is it for?", placeholder: "Local customers, startups, other devs..." },
  { key: "vibe", label: "Vibe / style", placeholder: "Minimal and dark, playful slime, corporate clean..." },
  { key: "colors", label: "Colors", placeholder: "Purple + slime green, or leave blank to let it choose" },
  { key: "sections", label: "Sections to include", placeholder: "Hero, pricing, testimonials, FAQ, contact..." },
  { key: "cta", label: "Primary call to action", placeholder: "Book a repair, Start free trial, Get a quote..." },
  { key: "contact", label: "Contact details to show", placeholder: "Email, phone, address, hours..." },
];

const PLANS = [
  { value: "monthly", label: "Monthly", price: "$5/mo", note: "per site + usage" },
  { value: "yearly", label: "Yearly", price: "$50/yr", note: "per site + usage" },
  { value: "business", label: "Business", price: "$25/mo", note: "flat, all your sites" },
] as const;

const inputCls =
  "w-full mt-1.5 px-3 py-2.5 rounded-lg bg-[#190f28] border border-[#7e22ce]/50 text-white text-sm outline-none focus:border-[#b6f34c] focus:shadow-[0_0_10px_rgba(182,243,76,.25)] transition-all placeholder:text-[#5a4d7a]";

export default function NewSitePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [subdomain, setSubdomain] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [plan, setPlan] = useState<"monthly" | "yearly" | "business">("monthly");
  const [stripe, setStripe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/builder/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStripe(!!d?.stripe))
      .catch(() => {});
  }, []);

  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/builder/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          survey: answers,
          subdomain: subdomain || undefined,
          inviteCode: inviteCode.trim() || undefined,
          plan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not create project");
      // Paid tier with Stripe configured -> hosted card collection first;
      // generation starts when confirm-card lands back on the project page.
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      router.push(`/builder/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create project");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/builder" className="p-2 rounded-lg text-[#9d8ec2] hover:text-white border border-[var(--color-dark-border)] hover:border-slime-600/30 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3 glow-text">
          <Sparkles className="w-6 h-6 text-slime-400" />
          New site
        </h1>
      </div>

      <div className="slime-card drip-natural p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-white">Site name</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Swoop's Repair Shop" />
        </div>
        <div>
          <label className="block text-sm font-medium text-white">Email for updates</label>
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <p className="mt-1 text-xs text-[#7a6b9d]">
            Generation runs on our own hardware and takes several minutes — we&apos;ll email you when the preview is ready.
          </p>
        </div>

        {SURVEY_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-white">{f.label}</label>
            <textarea
              className={inputCls}
              rows={f.key === "sections" ? 2 : 1}
              value={answers[f.key] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
            />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-white">Subdomain (optional)</label>
          <input className={inputCls} value={subdomain} onChange={(e) => setSubdomain(e.target.value.toLowerCase())} placeholder="my-shop" />
          <p className="mt-1 text-xs text-[#7a6b9d]">Where it publishes on the deploy domain. Blank = auto-generated.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-white">Invite code (optional)</label>
          <input className={inputCls} value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Have a free-tier code?" />
          <p className="mt-1 text-xs text-[#7a6b9d]">
            With a code: free tier, no card required, capped usage. Without: pick a plan below, card on file.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-white">Plan</label>
          <div className="grid gap-2 sm:grid-cols-3 mt-1.5">
            {PLANS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPlan(p.value)}
                className={`rounded-lg border p-3 text-left transition-all ${
                  plan === p.value
                    ? "border-[#b6f34c] bg-[#b6f34c]/10"
                    : "border-[#7e22ce]/40 hover:border-slime-600/40"
                }`}
              >
                <div className="text-sm font-medium text-white">{p.label}</div>
                <div className="text-lg font-semibold text-slime-400">{p.price}</div>
                <div className="text-xs text-[#7a6b9d]">{p.note}</div>
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-[#7a6b9d]">
            Business covers every site on your account with priority generation and a larger resource reservation.
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          className="slime-btn flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!name.trim() || !emailValid || submitting}
          onClick={submit}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {stripe ? "Add card & generate" : "Generate my site"}
        </button>
        {stripe && (
          <p className="text-xs text-[#7a6b9d]">
            You&apos;ll add a card on Stripe&apos;s secure page first — it isn&apos;t charged until you subscribe.
          </p>
        )}
      </div>
    </div>
  );
}
