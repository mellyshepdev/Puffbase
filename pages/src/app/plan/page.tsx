"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles, Check, Loader2, CreditCard } from "lucide-react";

interface PlanCard {
  id: string;
  label: string;
  price: string;
  period: string;
  blurb: string;
}

const FEATURES: Record<string, string[]> = {
  "free": ["Personal + business accounts", "Community repositories", "Document editor"],
  "pro-monthly": ["Unlimited private repos", "Priority builds", "All integrations"],
  "pro-yearly": ["Everything in Pro", "Two months free", "Priority builds"],
  "business": ["Groups & team workspaces", "Priority generation", "256MB site reservations", "Flat per account"],
};

function PlanPage() {
  const params = useSearchParams();
  const [plan, setPlan] = useState("free");
  const [plans, setPlans] = useState<PlanCard[]>([]);
  const [stripeOn, setStripeOn] = useState(false);
  const [cardOnFile, setCardOnFile] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    // Returned from Stripe Checkout: verify + apply the plan.
    const sid = params.get("session_id");
    const chosen = sessionStorage.getItem("plan-pending");
    if (sid && chosen) {
      sessionStorage.removeItem("plan-pending");
      fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", plan: chosen, sessionId: sid }),
      }).then(async (r) => {
        const d = await r.json();
        setNotice(r.ok ? `You're on ${chosen} now - card on file.` : (d.error ?? "Could not confirm checkout"));
        load();
      });
    } else if (params.get("checkout") === "cancelled") {
      setNotice("Checkout cancelled - no changes made.");
    }
  }, [params]);

  const load = () => {
    fetch("/api/plan").then((r) => r.json()).then((d) => {
      setPlan(d.plan ?? "free");
      setPlans(d.plans ?? []);
      setStripeOn(Boolean(d.stripe));
      setCardOnFile(Boolean(d.cardOnFile));
    });
  };

  useEffect(load, []);

  const pick = async (id: string) => {
    setBusy(id);
    setNotice("");
    if (id === "free") {
      const r = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select", plan: "free" }),
      });
      setBusy(null);
      if (r.ok) { setNotice("Back on Free."); load(); }
      return;
    }
    sessionStorage.setItem("plan-pending", id);
    const r = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "checkout", plan: id }),
    });
    const d = await r.json();
    setBusy(null);
    if (r.ok && d.checkoutUrl) window.location.href = d.checkoutUrl;
    else { sessionStorage.removeItem("plan-pending"); setNotice(d.error ?? "Checkout unavailable"); }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[#b6f34c] flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-[#241132]" />
        </div>
        <h1 className="text-2xl font-bold text-white">Membership</h1>
      </div>
      <p className="text-sm text-[#9d8ec2] mb-8">
        Upgrade this workspace. Cards are collected by Stripe - Puffbase never sees card numbers.
      </p>

      {notice && (
        <div className="mb-6 rounded-xl border border-slime-600/40 bg-slime-500/5 px-4 py-3 text-sm text-slime-300">{notice}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => {
          const active = plan === p.id || (plan.startsWith("pro") && p.id.startsWith("pro"));
          return (
            <div
              key={p.id}
              className={`slime-card p-5 flex flex-col ${active ? "border-slime-500/60 ring-1 ring-slime-500/30" : ""}`}
            >
              <p className="text-sm font-bold text-white">{p.label}</p>
              <p className="mt-1">
                <span className="text-2xl font-bold text-[#b6f34c]">{p.price}</span>
                <span className="text-xs text-[#7a6b9d]">{p.period}</span>
              </p>
              <p className="text-[11px] text-[#9d8ec2] mt-1 mb-3">{p.blurb}</p>
              <ul className="space-y-1.5 mb-4 flex-1">
                {(FEATURES[p.id] ?? []).map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[11px] text-[#9d8ec2]">
                    <Check className="w-3 h-3 text-slime-400 mt-0.5 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {active ? (
                <span className="text-xs font-bold text-slime-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Current plan
                </span>
              ) : (
                <button
                  onClick={() => pick(p.id)}
                  disabled={busy !== null || (p.id !== "free" && !stripeOn)}
                  className="slime-btn text-xs justify-center disabled:opacity-50"
                >
                  {busy === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : p.id === "free" ? "Switch to Free" : "Upgrade"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!stripeOn && (
        <p className="mt-6 text-xs text-[#7a6b9d] flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5" /> Checkout isn't configured yet - upgrades are disabled.
        </p>
      )}
      {cardOnFile && (
        <p className="mt-6 text-xs text-[#7a6b9d] flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5" /> A payment method is on file for this workspace.
        </p>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-10 text-[#7a6b9d]">Loading…</div>}>
      <PlanPage />
    </Suspense>
  );
}
