import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  // The workspace-settings menu lives in the main left sidebar (Sidebar.tsx),
  // stacked above the regular nav — no second aside here.
  return <div className="max-w-4xl">{children}</div>;
}
