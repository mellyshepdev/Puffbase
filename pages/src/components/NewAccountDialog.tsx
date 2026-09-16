"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { avatarSrc, readAvatarFile } from "@/lib/avatar";

/** "Add business account" dialog - name + optional avatar image. The image
 *  is downscaled client-side to a 128px data URL before it ever posts. */
export default function NewAccountDialog({
  kind,
  onClose,
  onCreated,
}: {
  kind: "business" | "personal";
  onClose: () => void;
  onCreated: (account: { id: string }) => void;
}) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      setAvatar(await readAvatarFile(f));
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't use that image");
    }
  };

  const create = async () => {
    setSaving(true);
    setErr(null);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        name: name.trim() || (kind === "business" ? "Business" : "Personal"),
        ...(avatar ? { avatar } : {}),
      }),
    });
    setSaving(false);
    if (!res.ok) return setErr((await res.json().catch(() => ({}))).error || "Couldn't create account");
    onCreated(await res.json());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="relative w-96 rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 p-1 rounded-md text-[#5a4d7a] hover:text-white hover:bg-[var(--color-dark-hover)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-bold text-white mb-4">
          {kind === "business" ? "New business account" : "New account"}
        </h3>
        <div className="flex items-center gap-3.5 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarSrc(avatar ?? "sheep-1")}
            alt=""
            className="w-14 h-14 rounded-full border border-[var(--color-dark-border)] bg-[var(--color-dark-card)]"
            style={{ objectFit: "cover" }}
          />
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-dark-border)] text-xs text-[#9d8ec2] hover:text-white hover:border-slime-600 transition-all"
            >
              Upload avatar image
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            <p className="text-[10px] text-[#5a4d7a] mt-1.5">
              Optional - defaults to a sheep avatar you can change later.
            </p>
          </div>
        </div>
        <label className="block text-[10px] uppercase tracking-wider text-[#5a4d7a] mb-1.5">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={kind === "business" ? "Business name" : "Account name"}
          maxLength={120}
          autoFocus
          className="w-full mb-3 px-3 py-2 rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-bg)] text-sm text-white placeholder-[#5a4d7a] outline-none"
        />
        {err && <p className="text-xs text-red-400 mb-3">{err}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs text-[#9d8ec2] hover:text-white">
            Cancel
          </button>
          <button onClick={create} disabled={saving} className="slime-btn text-xs py-1.5 px-4">
            {saving ? "Creating…" : "Create account"}
          </button>
        </div>
      </div>
    </div>
  );
}
