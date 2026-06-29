"use client";

import { useState } from "react";
import Image from "next/image";
import type { BracketMatch, KnockoutBracket, WinnerScenario, ScenariosResponse } from "@/lib/api/client";
import { getTeamFlagSvgPath } from "@/lib/team-visuals";

/* ── helpers ─────────────────────────────────────────────────────────── */

const STAGE_ORDER = ["round_of_16", "quarterfinal", "semifinal", "final"];
const STAGE_LABELS: Record<string, string> = {
  round_of_16: "Round of 32",
  quarterfinal: "Quarterfinals",
  semifinal: "Semi-finals",
  third_place: "3rd Place",
  final: "⭐ Final",
};

function stageAccent(stage: string) {
  if (stage === "final")         return "#ffd700";
  if (stage === "semifinal")     return "#d3f340";
  if (stage === "quarterfinal")  return "#00e5ff";
  if (stage === "round_of_16")   return "#a78bfa";   // purple — was transparent, now visible
  return "#94a3b8";
}

function statusBadge(status: string, homeScore: number | null, awayScore: number | null) {
  if (status === "final" && homeScore !== null && awayScore !== null) {
    return { text: `${homeScore} – ${awayScore}`, colour: "#4ade80", bg: "rgba(74,222,128,0.12)" };
  }
  if (status === "live") return { text: "🔴 LIVE", colour: "#f87171", bg: "rgba(248,113,113,0.15)" };
  return null;
}

/* ── Flag pill ──────────────────────────────────────────────────────── */

function FlagPill({ fifaCode, name, size = 24 }: { fifaCode: string; name: string; size?: number }) {
  const src = getTeamFlagSvgPath(fifaCode);
  return (
    <span className="inline-flex items-center gap-1.5">
      {src && (
        <span
          className="inline-block overflow-hidden rounded"
          style={{ width: size, height: size * 0.67, flexShrink: 0 }}
        >
          <Image src={src} alt={name} width={size} height={Math.round(size * 0.67)} className="h-full w-full object-cover" unoptimized />
        </span>
      )}
      <span>{name}</span>
    </span>
  );
}

/* ── Bracket match card ─────────────────────────────────────────────── */

function MatchCard({ m, accent, showPrediction }: { m: BracketMatch; accent: string; showPrediction: boolean }) {
  const badge = statusBadge(m.status, m.homeScore, m.awayScore);
  const dateStr = m.kickoffUtc
    ? new Date(m.kickoffUtc).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    : null;

  return (
    <div
      className="wc-panel-muted rounded-2xl p-4 transition-all hover:scale-[1.01]"
      style={{
        border: `1px solid ${accent}30`,
        borderTopColor: `${accent}60`,
        minWidth: 220,
      }}
    >
      {/* Date */}
      {dateStr && (
        <p
          className="mb-2 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: accent, fontFamily: "var(--font-data)" }}
        >
          {dateStr}
        </p>
      )}

      {/* Home team */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate" style={{ maxWidth: 130 }}>
          {m.home ? <FlagPill fifaCode={m.home.fifaCode} name={m.home.name} size={18} /> : <span className="opacity-40">TBD</span>}
        </span>
        {badge ? (
          <span
            className="shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold tabular-nums"
            style={{ color: badge.colour, background: badge.bg }}
          >
            {badge.text}
          </span>
        ) : (
          <span className="shrink-0 text-xs opacity-30">vs</span>
        )}
      </div>

      {/* Away team */}
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-sm font-semibold truncate" style={{ maxWidth: 130 }}>
          {m.away ? <FlagPill fifaCode={m.away.fifaCode} name={m.away.name} size={18} /> : <span className="opacity-40">TBD</span>}
        </span>
      </div>

      {/* Prediction bars — knockout has no draws, show win% only */}
      {showPrediction && m.status === "scheduled" && m.homeWinPct !== null && (
        <div className="mt-3 space-y-1.5">
          {/* Home win % */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className="w-8 text-left font-bold" style={{ color: "#ffffff" }}>{m.homeWinPct}%</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[rgba(35,41,60,0.8)]">
              <div
                className="h-full rounded-l-full transition-all"
                style={{ width: `${m.homeWinPct}%`, background: `linear-gradient(90deg, ${accent}60, ${accent})` }}
              />
            </div>
          </div>
          {/* Away win % */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className="w-8 text-left font-bold" style={{ color: "#ffffff" }}>{m.awayWinPct}%</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[rgba(35,41,60,0.8)]">
              <div
                className="h-full rounded-l-full"
                style={{ width: `${m.awayWinPct ?? 0}%`, background: "linear-gradient(90deg, rgba(148,163,184,0.35), rgba(148,163,184,0.65))" }}
              />
            </div>
          </div>
          {/* No draw in knockout — extra time / penalties instead */}
          <p className="text-center text-[9px] opacity-35">
            Win% to advance · ET/pens if level · Poisson DC
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Scenario tile ──────────────────────────────────────────────────── */

const SCENARIO_COLOURS = [
  "#d3f340", "#00e5ff", "#ff007f", "#a78bfa", "#fb923c",
];

function ScenarioTile({
  s, colour, selected, onClick,
}: {
  s: WinnerScenario; colour: string; selected: boolean; onClick: () => void;
}) {
  const flagSrc = getTeamFlagSvgPath(s.championFifa);
  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-3xl p-5 transition-all"
      style={{
        background: selected
          ? `linear-gradient(135deg, ${colour}22, ${colour}0a)`
          : "rgba(18,16,36,0.6)",
        border: `1px solid ${selected ? colour : colour + "30"}`,
        borderTopColor: selected ? colour : colour + "50",
        boxShadow: selected ? `0 0 32px ${colour}25, 0 8px 32px rgba(0,0,0,0.5)` : undefined,
        outline: "none",
        transform: selected ? "scale(1.02)" : undefined,
      }}
    >
      <div className="flex items-start gap-4">
        {/* Flag */}
        <div
          className="shrink-0 overflow-hidden rounded-xl"
          style={{ width: 48, height: 32, border: `1px solid ${colour}40` }}
        >
          {flagSrc && (
            <Image src={flagSrc} alt={s.championName} width={48} height={32} className="h-full w-full object-cover" unoptimized />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: colour, fontFamily: "var(--font-data)" }}>
            {s.title}
          </p>
          <p className="mt-0.5 text-base font-bold truncate">{s.championName}</p>
          <p className="text-xs opacity-60 truncate">{s.subtitle}</p>
        </div>

        {/* Probability ring */}
        <div className="shrink-0 flex flex-col items-center">
          <span className="text-2xl font-black" style={{ color: colour, fontFamily: "var(--font-display)" }}>
            {s.probability}%
          </span>
          <span className="text-[9px] opacity-50 uppercase tracking-wider">chance</span>
        </div>
      </div>

      {/* Narrative (visible when selected) */}
      {selected && (
        <div className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: colour + "30" }}>
          <p className="text-sm leading-relaxed" style={{ color: "var(--foreground-muted)" }}>
            {s.narrative}
          </p>
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: colour, fontFamily: "var(--font-data)" }}>
              Predicted path
            </p>
            {s.keyMatches.map((km, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
                  style={{ background: colour + "20", color: colour }}
                >
                  {km.stage.replace("_", " ")}
                </span>
                <span className="opacity-70">vs {km.opponentName}</span>
                <span className="ml-auto font-bold" style={{ color: colour }}>{km.winPct}% win</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </button>
  );
}

/* ── Main component — data arrives as props from the server page ──────── */

interface KnockoutClientProps {
  bracket: KnockoutBracket;
  scenarios: ScenariosResponse;
}

export function KnockoutClient({ bracket, scenarios: scenariosData }: KnockoutClientProps) {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [showPredictions, setShowPredictions] = useState(true);

  // Group by stage
  const byStage: Record<string, BracketMatch[]> = {};
  for (const m of bracket.bracket) {
    (byStage[m.stage] ??= []).push(m);
  }

  return (
    <div className="space-y-10">

      {/* Toggle row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="wc-pill rounded-full px-3 py-1.5 text-xs font-semibold">
          ✅ {bracket.totalCompleted} completed
        </div>
        <div className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: "rgba(0,229,255,0.08)", color: "var(--secondary)", border: "1px solid rgba(0,229,255,0.2)" }}>
          📅 {bracket.totalScheduled} upcoming
        </div>
        <button
          onClick={() => setShowPredictions((p) => !p)}
          className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{ background: showPredictions ? "rgba(211,243,64,0.15)" : "rgba(35,41,60,0.6)", color: showPredictions ? "var(--accent)" : "var(--foreground-muted)", border: `1px solid ${showPredictions ? "rgba(211,243,64,0.4)" : "rgba(255,255,255,0.1)"}` }}
        >
          {showPredictions ? "Hide" : "Show"} match predictions
        </button>
      </div>

      {/* ── Bracket stages ──────────────────────────────────────────── */}
      {STAGE_ORDER.map((stage) => {
        const matches = byStage[stage];
        if (!matches?.length) return null;
        const accent = stageAccent(stage);
        return (
          <section key={stage} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2
                className="text-lg font-semibold"
                style={{ color: accent, fontFamily: "var(--font-display)" }}
              >
                {STAGE_LABELS[stage] ?? stage}
              </h2>
              <div className="h-px flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${accent}60, transparent)` }} />
              <span className="text-xs opacity-50">{matches.length} match{matches.length > 1 ? "es" : ""}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {matches.map((m) => (
                <MatchCard key={m.matchId} m={m} accent={accent} showPrediction={showPredictions} />
              ))}
            </div>
          </section>
        );
      })}

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <div className="wc-divider" />

      {/* ── 5 Winner Scenarios ──────────────────────────────────────── */}
      {scenariosData && (
        <section className="space-y-6">
          <div className="space-y-2">
            <p className="wc-eyebrow text-xs font-semibold">🤖 WorldCupIQ Prediction Engine</p>
            <h2 className="text-2xl font-semibold">
              5 Ways the World Cup Could End
            </h2>
            <p className="wc-body text-sm max-w-2xl">
              {scenariosData.note}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {scenariosData.scenarios.map((s, i) => (
              <ScenarioTile
                key={s.scenarioId}
                s={s}
                colour={SCENARIO_COLOURS[i % SCENARIO_COLOURS.length]}
                selected={selectedScenario === s.scenarioId}
                onClick={() => setSelectedScenario(selectedScenario === s.scenarioId ? null : s.scenarioId)}
              />
            ))}
          </div>

          <p className="text-center text-xs opacity-30">
            Probabilities are model estimates, not financial advice.
            Powered by DC-corrected Poisson formula · WorldCupIQ {scenariosData.modelVersion}
          </p>
        </section>
      )}
    </div>
  );
}
