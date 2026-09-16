import type { ReactNode } from "react";
import { SettingsNav } from "@/components/SettingsNav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-8 max-w-6xl">
      <aside className="w-52 flex-shrink-0">
        <p className="px-3 mb-3 text-[10px] font-semibold text-slime-400/60 uppercase tracking-widest">
          Workspace settings
        </p>
        <SettingsNav />
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
