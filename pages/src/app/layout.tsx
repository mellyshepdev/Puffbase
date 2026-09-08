import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "SlimeGit — Purple Slime Repository Dashboard",
  description: "A gooey, drippy Git dashboard for managing repos, issues, pipelines & deployments.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen overflow-x-hidden">
        {/* Decorative drip strips */}
        <div className="drip-strip-left" />
        <div className="drip-strip-right" />

        {/* Floating slime blobs */}
        <div className="slime-blob" style={{ width: 600, height: 600, top: -200, left: -200, background: 'radial-gradient(circle, #7c22ff, transparent)' }} />
        <div className="slime-blob" style={{ width: 400, height: 400, bottom: -100, right: -100, background: 'radial-gradient(circle, #5d06d9, transparent)', animationDelay: '2s' }} />
        <div className="slime-blob" style={{ width: 300, height: 300, top: '40%', left: '30%', background: 'radial-gradient(circle, #8b3dff, transparent)', animationDelay: '4s' }} />

        <div className="flex min-h-screen relative z-10">
          <Sidebar />
          <div className="flex-1 flex flex-col ml-64">
            <TopBar />
            <main className="flex-1 p-6 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
