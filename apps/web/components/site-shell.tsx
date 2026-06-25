"use client";

import type { ReactNode } from "react";
import { SiteNav } from "./site-nav";

interface SiteShellProps {
  children: ReactNode;
}

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="wc-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-8">
      <header className="wc-panel relative mb-8 overflow-hidden rounded-[28px] px-6 py-5">
        {/* Pitch lines background */}
        <div className="pitch-lines" aria-hidden />
        {/* Stadium glow */}
        <div className="stadium-glow" aria-hidden />
        {/* Bottom rainbow stripe */}
        <div className="wc-site-header-pitch" aria-hidden />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Trophy icon */}
            <div
              className="trophy-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl"
              style={{
                background: "linear-gradient(135deg, rgba(211,243,64,0.18), rgba(211,243,64,0.06))",
                border: "1px solid rgba(211,243,64,0.3)",
              }}
            >
              🏆
            </div>
            <div className="space-y-0.5">
              <p className="wc-eyebrow text-xs font-semibold">WorldCupIQ</p>
              <h1 className="text-xl font-semibold sm:text-2xl">
                2026 World Cup Intelligence
              </h1>
              <p className="wc-body text-xs">
                48 teams · live fixtures · predictions · tournament simulations
              </p>
            </div>
          </div>
          <SiteNav />
        </div>
      </header>
      <main className="flex-1 space-y-6">{children}</main>
    </div>
  );
}
