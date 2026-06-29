"use client";

import type { ReactNode } from "react";
import { SiteNav } from "./site-nav";
import { SiteFooter } from "./site-footer";

interface SiteShellProps {
  children: ReactNode;
}

const TICKER_ITEMS = [
  "⚽ FIFA WORLD CUP 2026",
  "🇺🇸 USA · 🇨🇦 CANADA · 🇲🇽 MEXICO",
  "48 NATIONS · 104 MATCHES · 16 VENUES",
  "JUN 11 – JUL 19, 2026",
  "FINAL @ METLIFE STADIUM",
  "LIVE ANALYTICS · POWERED BY WORLDCUPIQ",
];

export function SiteShell({ children }: SiteShellProps) {
  const tickerContent = [...TICKER_ITEMS, ...TICKER_ITEMS].join("   ·   ");

  return (
    <>
      {/* Ambient floating orbs */}
      <div className="wc-orb wc-orb-cyan" aria-hidden />
      <div className="wc-orb wc-orb-lime"  aria-hidden />
      <div className="wc-orb wc-orb-pink"  aria-hidden />

      {/* Stadium image ambient */}
      <div className="wc-stadium-bg" aria-hidden />

      <div className="wc-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 sm:py-8">

        {/* ── Scrolling ticker above header ──────────────────────────── */}
        <div
          className="wc-ticker-wrap mb-3 rounded-full py-1.5"
          style={{
            background: "rgba(0,229,255,0.04)",
            border: "1px solid rgba(0,229,255,0.1)",
          }}
        >
          <div className="wc-ticker-track">
            <span
              style={{
                fontFamily: "var(--font-data)",
                fontSize: 10,
                letterSpacing: "0.18em",
                color: "rgba(0,229,255,0.65)",
                padding: "0 24px",
              }}
            >
              {tickerContent}
            </span>
            <span
              aria-hidden
              style={{
                fontFamily: "var(--font-data)",
                fontSize: 10,
                letterSpacing: "0.18em",
                color: "rgba(0,229,255,0.65)",
                padding: "0 24px",
              }}
            >
              {tickerContent}
            </span>
          </div>
        </div>

        {/* ── Main header ─────────────────────────────────────────────── */}
        <header className="wc-panel relative mb-8 overflow-hidden rounded-[28px] px-6 py-5">
          <div className="pitch-lines" aria-hidden />
          <div className="stadium-glow" aria-hidden />
          <div className="wc-site-header-pitch" aria-hidden />

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
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
        <SiteFooter />
      </div>
    </>
  );
}
