import Link from "next/link";
import Image from "next/image";
import type { Match, Team } from "@worldcupiq/shared";

import { PageHero } from "@/components/page-hero";
import { TeamMark } from "@/components/team-mark";
import { StaggerList } from "@/components/stagger-list";
import { apiClient } from "@/lib/api/client";
import { getTeamFlagSvgPath } from "@/lib/team-visuals";

/* ── Helpers ─────────────────────────────────────────────────────────── */

const TODAY_UTC = new Date().toISOString().slice(0, 10);

function kickoffDay(utc: string) {
  return utc.slice(0, 10);
}

function formatTime(utc: string) {
  return new Date(utc).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", timeZone: "UTC", hour12: false,
  });
}

function formatDate(utc: string) {
  return new Date(utc).toLocaleDateString("en-US", {
    month: "short", day: "numeric", timeZone: "UTC",
  });
}

function stageLabel(stage: Match["stage"]) {
  const map: Record<string, string> = {
    group: "Group Stage",
    round_of_16: "Round of 32",
    quarterfinal: "Quarterfinal",
    semifinal: "Semi-final",
    third_place: "3rd Place",
    final: "Final",
  };
  return map[stage] ?? stage;
}

type FixtureWithRaw = Match & { homeScore?: number | null; awayScore?: number | null };

function categorise(fixtures: Match[]) {
  const live: FixtureWithRaw[] = [];
  const today: FixtureWithRaw[] = [];
  const upcoming: FixtureWithRaw[] = [];
  const completed: FixtureWithRaw[] = [];

  for (const f of fixtures) {
    const raw = f as FixtureWithRaw;
    if (f.status === "live") { live.push(raw); continue; }
    if (f.status === "final") { completed.push(raw); continue; }
    if (kickoffDay(f.kickoffUtc) === TODAY_UTC) { today.push(raw); continue; }
    upcoming.push(raw);
  }

  completed.sort((a, b) => new Date(b.kickoffUtc).getTime() - new Date(a.kickoffUtc).getTime());
  return { live, today, upcoming, completed };
}

/* ── Fixture row ─────────────────────────────────────────────────────── */

function FixtureRow({
  fixture,
  teamById,
  showScore = true,
}: {
  fixture: FixtureWithRaw;
  teamById: Map<string, Team>;
  showScore?: boolean;
}) {
  const home = teamById.get(fixture.homeTeamId);
  const away = teamById.get(fixture.awayTeamId);
  const hasScore = fixture.homeScore != null && fixture.awayScore != null;
  const isKnockout = fixture.stage !== "group";

  const homeFlagSrc = home ? getTeamFlagSvgPath(home.fifaCode) : null;
  const awayFlagSrc = away ? getTeamFlagSvgPath(away.fifaCode) : null;

  return (
    <Link
      href={`/matches/${encodeURIComponent(fixture.id)}`}
      className="fixture-card wc-panel-muted flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3.5 transition-all hover:border-[var(--secondary)] hover:bg-[rgba(0,229,255,0.03)]"
      style={isKnockout ? { borderColor: "rgba(211,243,64,0.2)", borderTopColor: "rgba(211,243,64,0.4)" } : undefined}
    >
      {/* Stage badge */}
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
        style={{
          background: isKnockout ? "rgba(211,243,64,0.12)" : "rgba(0,229,255,0.06)",
          color: isKnockout ? "var(--accent)" : "var(--secondary)",
          border: `1px solid ${isKnockout ? "rgba(211,243,64,0.3)" : "rgba(0,229,255,0.2)"}`,
        }}
      >
        {fixture.group ? `Grp ${fixture.group}` : stageLabel(fixture.stage)}
      </span>

      {/* Home team */}
      <div className="flex min-w-0 flex-1 items-center gap-2 justify-end">
        <span className="truncate text-sm font-semibold text-right">
          {home?.name?.replace(/^(\w+).*/, "$1") ?? fixture.homeTeamId.toUpperCase()}
        </span>
        {homeFlagSrc ? (
          <span className="h-6 w-9 shrink-0 overflow-hidden rounded">
            <Image src={homeFlagSrc} alt={home?.name ?? ""} width={36} height={24} className="h-full w-full object-cover" unoptimized />
          </span>
        ) : home ? (
          <TeamMark fifaCode={home.fifaCode} name={home.name} size="sm" />
        ) : null}
      </div>

      {/* Score or time */}
      <div className="shrink-0 w-16 text-center">
        {showScore && hasScore ? (
          <span className="text-lg font-black tabular-nums" style={{ fontFamily: "var(--font-data)", color: "var(--foreground)" }}>
            {fixture.homeScore}&nbsp;–&nbsp;{fixture.awayScore}
          </span>
        ) : fixture.status === "live" ? (
          <span className="flex items-center justify-center gap-1 text-xs font-bold" style={{ color: "#f87171" }}>
            <span className="live-dot" />LIVE
          </span>
        ) : (
          <span className="text-xs font-semibold" style={{ color: "var(--foreground-muted)", fontFamily: "var(--font-data)" }}>
            {formatTime(fixture.kickoffUtc)}
          </span>
        )}
      </div>

      {/* Away team */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {awayFlagSrc ? (
          <span className="h-6 w-9 shrink-0 overflow-hidden rounded">
            <Image src={awayFlagSrc} alt={away?.name ?? ""} width={36} height={24} className="h-full w-full object-cover" unoptimized />
          </span>
        ) : away ? (
          <TeamMark fifaCode={away.fifaCode} name={away.name} size="sm" />
        ) : null}
        <span className="truncate text-sm font-semibold">
          {away?.name?.replace(/^(\w+).*/, "$1") ?? fixture.awayTeamId.toUpperCase()}
        </span>
      </div>

      {/* Date (only for upcoming) */}
      {fixture.status === "scheduled" && kickoffDay(fixture.kickoffUtc) !== TODAY_UTC && (
        <span className="shrink-0 text-xs" style={{ color: "var(--foreground-soft)" }}>
          {formatDate(fixture.kickoffUtc)}
        </span>
      )}
      {/* View detail arrow */}
      <span className="shrink-0 text-xs opacity-30 group-hover:opacity-80 transition-opacity" style={{ color: "var(--secondary)" }}>›</span>
    </Link>
  );
}

/* ── Section wrapper ─────────────────────────────────────────────────── */

function Section({
  title, accent, children, count, defaultOpen = true,
}: {
  title: string; accent: string; children: React.ReactNode;
  count?: number; defaultOpen?: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: accent, fontFamily: "var(--font-data)" }}>
          {title}
        </h2>
        {count !== undefined && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: accent + "15", color: accent }}>
            {count}
          </span>
        )}
        <div className="h-px flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${accent}50, transparent)` }} />
      </div>
      {children}
    </section>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default async function FixturesPage() {
  let fixtures: Match[] = [];
  let teams: Team[] = [];
  let errorMessage: string | null = null;

  try {
    [fixtures, teams] = await Promise.all([apiClient.fixtures(), apiClient.teams()]);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Fixtures data unavailable.";
  }

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const { live, today, upcoming, completed } = categorise(fixtures);

  const totalCompleted = completed.length;
  const totalUpcoming = upcoming.length + today.length;
  const totalKnockout = fixtures.filter((f) => f.stage !== "group").length;

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="All 104 Matches · Live Scores"
        title="WC 2026 Fixtures — Click Any Match for Full Detail"
        description="Real scores, goal scorers, match stats, pitch lineups. Synced from ESPN every 10 minutes. Click any row to see who scored, when, and full match stats."
        aside={
          <div className="wc-panel-muted rounded-3xl p-5 space-y-3">
            <p className="wc-data-label text-xs font-semibold">Quick Stats</p>
            {[
              { label: "Total matches", val: fixtures.length, col: "var(--foreground)" },
              { label: "Completed", val: totalCompleted, col: "#4ade80" },
              { label: "Upcoming / today", val: totalUpcoming, col: "var(--secondary)" },
              { label: "Knockout matches", val: totalKnockout, col: "var(--accent)" },
            ].map(({ label, val, col }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "var(--foreground-muted)" }}>{label}</span>
                <span className="text-lg font-bold" style={{ color: col }}>{val}</span>
              </div>
            ))}
            <Link
              href="/knockout"
              className="mt-2 flex items-center justify-center gap-2 rounded-2xl py-2.5 text-xs font-semibold uppercase tracking-widest transition-all hover:opacity-80"
              style={{ background: "rgba(211,243,64,0.12)", color: "var(--accent)", border: "1px solid rgba(211,243,64,0.3)" }}
            >
              ⚡ View Knockout Bracket →
            </Link>
          </div>
        }
      />

      {errorMessage && (
        <div className="wc-error-panel rounded-2xl p-4 text-sm">{errorMessage}</div>
      )}

      {/* ── LIVE ──────────────────────────────────────────────────── */}
      {live.length > 0 && (
        <Section title="🔴 Live Now" accent="#f87171" count={live.length}>
          <StaggerList className="space-y-2">
            {live.map((f) => <FixtureRow key={f.id} fixture={f} teamById={teamById} />)}
          </StaggerList>
        </Section>
      )}

      {/* ── TODAY ─────────────────────────────────────────────────── */}
      {today.length > 0 && (
        <Section title="Today" accent="var(--secondary)" count={today.length}>
          <StaggerList className="space-y-2">
            {today.map((f) => <FixtureRow key={f.id} fixture={f} teamById={teamById} />)}
          </StaggerList>
        </Section>
      )}

      {/* ── UPCOMING ──────────────────────────────────────────────── */}
      {upcoming.length > 0 && (
        <Section title="Upcoming" accent="var(--secondary)" count={upcoming.length}>
          <StaggerList className="space-y-2">
            {upcoming.slice(0, 20).map((f) => <FixtureRow key={f.id} fixture={f} teamById={teamById} />)}
            {upcoming.length > 20 && (
              <p className="text-center text-xs py-2" style={{ color: "var(--foreground-soft)" }}>
                +{upcoming.length - 20} more scheduled
              </p>
            )}
          </StaggerList>
        </Section>
      )}

      {/* ── COMPLETED — real scores ────────────────────────────────── */}
      {completed.length > 0 && (
        <Section title="Completed — Full Results" accent="rgba(148,163,184,0.7)" count={completed.length}>
          <p className="text-xs mb-3" style={{ color: "var(--foreground-soft)" }}>
            Real scores from ESPN · most recent first
          </p>
          <StaggerList className="space-y-2">
            {completed.map((f) => (
              <FixtureRow key={f.id} fixture={f} teamById={teamById} showScore />
            ))}
          </StaggerList>
        </Section>
      )}
    </div>
  );
}
