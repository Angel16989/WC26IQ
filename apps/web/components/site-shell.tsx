"use client";

import type { ReactNode } from "react";
import { SiteNav } from "./site-nav";

interface SiteShellProps {
  children: ReactNode;
}

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="wc-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-8">
      <header className="wc-panel mb-8 flex flex-col gap-5 rounded-[28px] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="wc-eyebrow text-xs font-semibold">
            WorldCupIQ
          </p>
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">
              2026 World Cup intelligence dashboard
            </h1>
            <p className="wc-body text-sm">
              Teams, fixtures, predictions, and tournament projections in one analytics-first control room.
            </p>
          </div>
        </div>
        <SiteNav />
      </header>
      <main className="flex-1 space-y-6">{children}</main>
    </div>
  );
}
