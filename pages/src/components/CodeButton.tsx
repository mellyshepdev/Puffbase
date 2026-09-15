"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Copy, Terminal } from "lucide-react";

const GIT_HOST = "git.prime-quality.online";
const GIT_USER = "puffadmin";

export function CodeButton({ repo }: { repo: string }) {
  const [open, setOpen] = useState(false);
  const [proto, setProto] = useState<"https" | "ssh">("https");
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const url =
    proto === "https"
      ? `https://${GIT_HOST}/${GIT_USER}/${repo}.git`
      : `git@${GIT_HOST}:${GIT_USER}/${repo}.git`;

  const copy = async () => {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        className="code-btn"
      >
        Code <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="code-dropdown" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <div className="code-tabs">
            <button className={proto === "https" ? "active" : ""} onClick={() => setProto("https")}>HTTPS</button>
            <button className={proto === "ssh" ? "active" : ""} onClick={() => setProto("ssh")}>SSH</button>
          </div>
          <div className="code-url-row">
            <code>{url}</code>
            <button onClick={copy} aria-label="Copy clone URL">
              {copied ? <Check className="w-4 h-4 text-[#b6f34c]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="code-cli">
            <Terminal className="w-3.5 h-3.5" />
            <span>git clone {url}</span>
          </div>
        </div>
      )}
    </div>
  );
}
