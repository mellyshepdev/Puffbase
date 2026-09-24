"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Save, Loader2, Upload, RefreshCw, ArrowLeft } from "lucide-react";
import { avatarSrc, isCustomAvatar, readAvatarFile } from "@/lib/avatar";

interface Account {
  id: string;
  kind: "personal" | "business";
  name: string;
  avatar: string;
  businessUrl?: string | null;
}

const SHEEP = ["sheep-9", "sheep-10", "sheep-11", "sheep-12"];

export default function ProfileSettings() {
  const [active, setActive] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("sheep-9");
  const [businessUrl, setBusinessUrl] = useState("");
  const [bsPicture, setBsPicture] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((r) => { if (r.user?.picture) setBsPicture(r.user.picture); })
      .catch(() => {});
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((r) => {
        const act: Account | null = r.active ?? null;
        setActive(act);
        if (act) {
          setName(act.name);
          setAvatar(act.avatar);
          setBusinessUrl(act.businessUrl ?? "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!active) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: active.id,
        name,
        avatar,
        businessUrl: active.kind === "business" ? businessUrl : undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError("Save failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#7a6b9d] text-sm p-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!active) return <p className="text-sm text-[#7a6b9d]">No active account.</p>;

  return (
    <section className="slime-card drip-sm p-5">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-xs text-[#7a6b9d] hover:text-white transition-colors mb-3"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All accounts
      </Link>
      <h1 className="text-lg font-bold text-white mb-1">
        Profile — <span className="capitalize">{active.kind}</span>
      </h1>
      <p className="text-xs text-[#7a6b9d] mb-5">
        Settings here apply to the active workspace only.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="field">Display name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        {active.kind === "business" && (
          <label className="field">Business URL
            <input
              type="url"
              value={businessUrl}
              onChange={(e) => setBusinessUrl(e.target.value)}
              placeholder="https://your-business.com"
            />
          </label>
        )}
      </div>

      <h3 className="text-sm font-semibold text-white mt-6 mb-1">Avatar</h3>
      <p className="text-xs text-[#7a6b9d] mb-3">Upload a picture, sync your BlackSheep account photo, or pick a sheep.</p>
      <div className="flex items-center gap-4 mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarSrc(avatar)}
          alt=""
          className="w-16 h-16 rounded-full border border-[var(--color-dark-border)] bg-[var(--color-dark-card)]"
          style={{ objectFit: "cover" }}
        />
        <div className="flex flex-col gap-2">
          <button className="button secondary" type="button" onClick={() => fileRef.current?.click()}>
            <Upload className="w-3.5 h-3.5" /> Upload a picture
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try { setAvatar(await readAvatarFile(f)); }
              catch { setError("Couldn't read that image"); }
            }}
          />
          {bsPicture ? (
            <button className="button secondary" type="button" onClick={() => setAvatar(bsPicture)}>
              <RefreshCw className="w-3.5 h-3.5" /> Sync with BlackSheep account
            </button>
          ) : (
            <span className="text-[11px] text-[#5a4d7a]">No photo on your BlackSheep account to sync.</span>
          )}
        </div>
      </div>
      {isCustomAvatar(avatar) && (
        <p className="text-[11px] text-[#7a6b9d] mb-3">
          Custom image set — pick a sheep below to switch back.
        </p>
      )}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-6">
        {SHEEP.map((s) => (
          <button
            key={s}
            onClick={() => setAvatar(s)}
            className={`relative aspect-square rounded-xl border flex items-center justify-center transition-all ${
              avatar === s
                ? "border-slime-500 bg-slime-900/30 shadow-[0_0_16px_rgba(139,61,255,0.25)]"
                : "border-[var(--color-dark-border)] bg-[var(--color-dark-card)] hover:border-slime-700"
            }`}
          >
            <span className="w-10 h-10 rounded-full bg-gradient-to-br from-slime-400 to-goo-700 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarSrc(s)} alt={s} className="w-8 h-8" />
            </span>
            {avatar === s && (
              <Check className="absolute top-1 right-1 w-3.5 h-3.5 text-[#b6f34c]" />
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button className="button primary" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved" : "Save changes"}
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </section>
  );
}
