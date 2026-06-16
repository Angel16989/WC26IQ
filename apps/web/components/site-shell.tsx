"use client";

import type { ReactNode } from "react";
import { SiteNav } from "./site-nav";

interface SiteShellProps {
  children: ReactNode;
}

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8">
      <header className="mb-8 flex flex-col gap-5 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] px-6 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            WorldCupIQ
          </p>
          <div>
            <h1 className="text-xl font-semibold">2026 World Cup analytics scaffold</h1>
            <p className="text-sm text-slate-600">
              Placeholder routes, typed contracts, and mock-backed API structure.
            </p>
          </div>
        </div>
        <SiteNav />
      </header>
      <main className="flex-1 space-y-6">{children}</main>
    </div>
  );
}
