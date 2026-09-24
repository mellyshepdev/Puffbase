"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileEdit,
  Eye,
  Globe,
  Rocket,
  Send,
  Trash2,
  Clock,
} from "lucide-react";

interface ProjectDetail {
  id: number;
  name: string;
  email: string | null;
  status: string;
  url: string | null;
  html: string | null;
  lagoSubscriptionId: string | null;
  updatedAt: string;
  revisions: { id: number; instruction: string; createdAt: string }[];
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  survey: { icon: <FileEdit className="w-3.5 h-3.5" />, color: "text-yellow-400", label: "Needs card" },
  generating: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, color: "text-slime-400", label: "Generating" },
  preview: { icon: <Eye className="w-3.5 h-3.5" />, color: "text-blue-400", label: "Preview" },
  deploying: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, color: "text-slime-400", label: "Publishing" },
  live: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-green-400", label: "Live" },
  failed: { icon: <AlertCircle className="w-3.5 h-3.5" />, color: "text-red-400", label: "Failed" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function BuilderDetailInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState<"revise" | "publish" | "card" | "delete" | null>(null);
  const [error, setError] = useState("");
  const [cardCancelled, setCardCancelled] = useState(false);
  const cardHandled = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/builder/projects/${id}`);
    if (res.status === 404) { setNotFound(true); return; }
    const d = await res.json();
    if (res.ok) setProject(d);
  }, [id]);

  // Poll while a long-running stage is active (crew generation takes minutes).
  const generating = project?.status === "generating" || project?.status === "deploying";
  useEffect(() => {
    load();
    if (!generating) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load, generating]);

  // Return from Stripe Checkout: verify the setup session server-side, then
  // generation kicks off there. ?card=cancelled just notes the bail-out.
  useEffect(() => {
    if (cardHandled.current) return;
    const card = searchParams.get("card");
    const sessionId = searchParams.get("session_id");
    if (card === "ok" && sessionId) {
      cardHandled.current = true;
      setBusy("card");
      fetch(`/api/builder/projects/${id}/confirm-card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then(async (r) => {
          const d = await r.json().catch(() => null);
          if (!r.ok) setError(d?.error ?? "Card setup could not be confirmed");
        })
        .finally(() => {
          setBusy(null);
          router.replace(`/builder/${id}`);
          load();
        });
    } else if (card === "cancelled") {
      cardHandled.current = true;
      setCardCancelled(true);
      router.replace(`/builder/${id}`);
    }
  }, [id, searchParams, router, load]);

  const post = async (path: string, body?: unknown, which: typeof busy = null) => {
    setBusy(which);
    setError("");
    try {
      const res = await fetch(`/api/builder/projects/${id}${path}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        setError(d?.error ?? "Request failed");
        return null;
      }
      return d;
    } finally {
      setBusy(null);
    }
  };

  const revise = async () => {
    const d = await post("/revise", { instruction }, "revise");
    if (d) { setInstruction(""); load(); }
  };

  const publish = async () => {
    if (await post("/publish", undefined, "publish")) load();
  };

  const cardSetup = async () => {
    const d = await post("/card-setup", undefined, "card");
    if (d?.checkoutUrl) window.location.href = d.checkoutUrl;
  };

  const remove = async () => {
    if (!confirm(`Delete "${project?.name}"? This withdraws its public route.`)) return;
    setBusy("delete");
    const res = await fetch(`/api/builder/projects/${id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok || res.status === 404) router.push("/builder");
    else setError("Delete failed");
  };

  if (notFound) {
    return (
      <div className="slime-card drip-natural p-10 text-center">
        <p className="text-white font-medium">Project not found</p>
        <Link href="/builder" className="text-slime-400 text-sm hover:underline">Back to Site Builder</Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center gap-2 text-[#7a6b9d] text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading project…
      </div>
    );
  }

  const st = statusConfig[project.status] ?? statusConfig.preview;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/builder" className="p-2 rounded-lg text-[#9d8ec2] hover:text-white border border-[var(--color-dark-border)] hover:border-slime-600/30 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white glow-text">{project.name}</h1>
            <div className="mt-0.5 flex items-center gap-2">
              <span className={`flex items-center gap-1.5 text-xs ${st.color}`}>
                {st.icon} {st.label}
              </span>
              <span className="font-mono text-[10px] uppercase text-[#7a6b9d]">{project.status}</span>
              {project.url && (
                <a href={project.url} target="_blank" rel="noopener" className="font-mono text-xs text-slime-400 hover:underline flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {project.url.replace("https://", "")}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="slime-btn flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!project.html || generating || busy !== null}
            onClick={publish}
          >
            {busy === "publish" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
            {project.status === "live" ? "Republish" : "Publish"}
          </button>
          <button
            aria-label="Delete project"
            className="p-2 rounded-lg text-red-400/70 hover:text-red-400 border border-[var(--color-dark-border)] hover:border-red-500/40 transition-all disabled:opacity-50"
            disabled={busy !== null}
            onClick={remove}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && <div className="slime-card drip-sm p-4 text-sm text-red-400">{error}</div>}
      {cardCancelled && (
        <div className="slime-card drip-sm p-4 text-sm text-yellow-300">
          Card setup was cancelled — generation starts once a card is on file.
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="slime-card drip-natural overflow-hidden">
          {project.status === "survey" ? (
            <div className="flex h-[560px] flex-col items-center justify-center gap-4 text-center p-6">
              <Sparkles className="w-8 h-8 text-slime-400" />
              <div>
                <p className="text-white font-medium">Add a card to start</p>
                <p className="text-sm text-[#7a6b9d] mt-1 max-w-sm">
                  Generation begins once a card is on file — it&apos;s collected on Stripe&apos;s secure page and isn&apos;t charged until you subscribe.
                </p>
              </div>
              <button
                className="slime-btn flex items-center gap-2 disabled:opacity-50"
                disabled={busy === "card"}
                onClick={cardSetup}
              >
                {busy === "card" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Add card on Stripe
              </button>
            </div>
          ) : generating ? (
            <div className="flex h-[560px] flex-col items-center justify-center gap-3 text-[#7a6b9d] p-6">
              <Loader2 className="w-8 h-8 animate-spin text-slime-400" />
              <p className="text-sm">
                {project.status === "deploying"
                  ? "Publishing to the edge…"
                  : "The vat is generating your site — local models take a few minutes."}
              </p>
              {project.email && (
                <p className="text-xs text-[#5a4d7a]">We&apos;ll email {project.email} when it&apos;s ready.</p>
              )}
            </div>
          ) : project.html ? (
            <iframe
              title="site preview"
              src={`/api/builder/projects/${id}/preview`}
              className="h-[560px] w-full bg-white"
              sandbox="allow-scripts"
            />
          ) : (
            <div className="flex h-[560px] items-center justify-center p-6 text-center">
              <div>
                <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                <p className="text-white font-medium">
                  {project.status === "failed" ? "Generation failed" : "Nothing yet"}
                </p>
                <p className="text-sm text-[#7a6b9d] mt-1">
                  {project.status === "failed"
                    ? "The model didn't return a usable page. Try a revision or regenerate."
                    : "Waiting on the first generation."}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="slime-card drip-sm p-4">
            <div className="mb-2 text-sm font-medium text-white">Request a change</div>
            <textarea
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg bg-[#190f28] border border-[#7e22ce]/50 text-white text-sm outline-none focus:border-[#b6f34c] transition-all placeholder:text-[#5a4d7a]"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Make the hero punchier, add a pricing table, darker background…"
            />
            <button
              className="slime-btn mt-2 w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!instruction.trim() || generating || busy !== null || !project.html}
              onClick={revise}
            >
              {busy === "revise" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Apply change
            </button>
          </div>

          {project.revisions.length > 0 && (
            <div className="slime-card drip-sm p-4">
              <div className="mb-2 text-sm font-medium text-white">History</div>
              <ul className="space-y-2">
                {[...project.revisions].reverse().map((r) => (
                  <li key={r.id} className="text-xs">
                    <div className="truncate text-[#9d8ec2]">{r.instruction}</div>
                    <div className="font-mono text-[10px] text-[#5a4d7a] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(r.createdAt)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {project.lagoSubscriptionId && (
            <div className="slime-card drip-sm p-4 text-xs text-[#7a6b9d]">
              Billed via Lago subscription{" "}
              <span className="font-mono">{project.lagoSubscriptionId.slice(0, 12)}…</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BuilderDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-[#7a6b9d] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading project…
        </div>
      }
    >
      <BuilderDetailInner />
    </Suspense>
  );
}
