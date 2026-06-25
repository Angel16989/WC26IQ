import Link from "next/link";
import type { Match, Player, Team } from "@worldcupiq/shared";
import { TeamMark } from "@/components/team-mark";
import { InfoCard } from "@/components/info-card";
import { CountUp } from "@/components/count-up";
import { StaggerList } from "@/components/stagger-list";
import { apiClient } from "@/lib/api/client";
import { confederationAccent } from "@/lib/team-visuals";
import { getTeamFlagSvgPath } from "@/lib/team-visuals";

const positionOrder: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
const positionColour: Record<string, string> = {
  GK:  "var(--accent)",
  DEF: "var(--secondary)",
  MID: "#a78bfa",
  FWD: "var(--tertiary)",
};

function formDotColour(r: string) {
  if (r === "W") return "#4ade80";
  if (r === "L") return "#f87171";
  return "rgba(148,163,184,0.6)";
}

function stageLabel(stage: string) {
  return stage.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function kickoffDate(utc: string) {
  return new Date(utc).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "UTC", hour12: false,
  });
}

interface PageProps { params: Promise<{ id: string }> }

export default async function TeamDetailPage({ params }: PageProps) {
  const { id } = await params;

  let team: Team | null = null;
  let allTeams: Team[] = [];
  let allFixtures: Match[] = [];
  let players: Player[] = [];
  let errorMessage: string | null = null;

  try {
    [team, allTeams, allFixtures, players] = await Promise.all([
      apiClient.team(id),
      apiClient.teams(),
      apiClient.fixtures(),
      apiClient.teamPlayers(id),
    ]);
  } catch (err) {
    if (err instanceof Error && err.message.includes("404")) {
      errorMessage = `Team '${id.toUpperCase()}' not found.`;
    } else {
      errorMessage = err instanceof Error ? err.message : "Could not load team data.";
    }
  }

  if (errorMessage || !team) {
    return (
      <div className="space-y-6">
        <Link href="/teams" className="wc-eyebrow text-xs">← All Teams</Link>
        <InfoCard title="Team not found">
          <p className="text-sm">{errorMessage ?? "Unknown error."}</p>
        </InfoCard>
      </div>
    );
  }

  const accent = confederationAccent[team.confederation] ?? "var(--secondary)";
  const flagSvg = getTeamFlagSvgPath(team.fifaCode);

  // Fixtures involving this team
  const teamId = team.id;
  const teamFixtures = allFixtures
    .filter((f) => f.homeTeamId === teamId || f.awayTeamId === teamId)
    .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime());

  const teamsById = Object.fromEntries(allTeams.map((t) => [t.id, t]));

  // Group standings (teams in same group)
  const groupTeams = team.group
    ? allTeams
        .filter((t) => t.group === team.group)
        .sort((a, b) => {
          const stA = JSON.parse(JSON.stringify(a));
          const stB = JSON.parse(JSON.stringify(b));
          return (stB.strengthRating ?? 0) - (stA.strengthRating ?? 0);
        })
    : [];

  // Players grouped by position
  const byPosition: Record<string, Player[]> = {};
  for (const p of players) {
    (byPosition[p.position] ??= []).push(p);
  }
  const positionGroups = Object.entries(byPosition).sort(
    ([a], [b]) => (positionOrder[a] ?? 9) - (positionOrder[b] ?? 9)
  );

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/teams"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest transition-opacity hover:opacity-70"
        style={{ color: accent, fontFamily: "var(--font-data)" }}
      >
        ← All Teams
      </Link>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section
        className="team-hero wc-panel relative overflow-hidden rounded-[28px] p-0"
        style={{ "--team-accent": accent } as React.CSSProperties}
      >
        {/* Flag blurred background */}
        {flagSvg && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url(${flagSvg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.07,
              filter: "blur(8px) saturate(1.4)",
            }}
          />
        )}
        {/* Gradient overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 20% 50%, ${accent}22 0%, transparent 55%)`,
          }}
        />

        <div className="relative z-10 flex flex-col gap-6 p-8 md:flex-row md:items-center">
          {/* Flag + name */}
          <div className="flex items-center gap-5">
            <TeamMark fifaCode={team.fifaCode} name={team.name} size="xl" />
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: accent, fontFamily: "var(--font-data)" }}
              >
                {team.confederation}
                {team.group ? ` · Group ${team.group}` : ""}
              </p>
              <h1 className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">
                {team.name}
              </h1>
              <p className="wc-body mt-1 text-sm">{team.fifaCode}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="ml-auto flex flex-wrap gap-6">
            {[
              { label: "Strength", value: team.strengthRating, dec: 1 },
              { label: "Form", value: team.formIndex, dec: 1 },
              { label: "Squad", value: team.squadStrength, dec: 1 },
            ].map(({ label, value, dec }) => (
              <div key={label} className="text-center">
                <p
                  className="text-3xl font-semibold"
                  style={{ color: accent, fontFamily: "var(--font-display)" }}
                >
                  <CountUp end={value} decimals={dec} />
                </p>
                <p className="wc-data-label mt-1 text-[10px]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Form dots */}
        {team.lastFiveResults.length > 0 && (
          <div className="relative z-10 flex items-center gap-3 border-t border-[var(--border)] px-8 py-4">
            <span className="wc-data-label text-[10px]">Last {team.lastFiveResults.length}</span>
            <div className="flex gap-2">
              {team.lastFiveResults.map((r, i) => (
                <span
                  key={i}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{
                    background: formDotColour(r) + "22",
                    color: formDotColour(r),
                    border: `1px solid ${formDotColour(r)}66`,
                  }}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* LEFT: Squad / Players */}
        <div className="space-y-6">
          {players.length > 0 ? (
            <InfoCard title={`Squad · ${players.length} players`}>
              <div className="space-y-6">
                {positionGroups.map(([position, group]) => (
                  <div key={position}>
                    <h3
                      className="mb-3 text-xs font-semibold uppercase tracking-widest"
                      style={{ color: positionColour[position] ?? accent, fontFamily: "var(--font-data)" }}
                    >
                      {position} · {group.length}
                    </h3>
                    <StaggerList className="grid gap-2 sm:grid-cols-2">
                      {group.map((player) => (
                        <div
                          key={player.id}
                          className="player-card wc-panel-muted flex items-center gap-3 rounded-2xl px-4 py-3"
                        >
                          {/* Position badge */}
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold"
                            style={{
                              background: (positionColour[player.position] ?? accent) + "18",
                              color: positionColour[player.position] ?? accent,
                              border: `1px solid ${positionColour[player.position] ?? accent}44`,
                            }}
                          >
                            {player.position}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                              {player.name}
                            </p>
                            <p className="wc-body truncate text-xs">{player.club}</p>
                          </div>
                          {/* Goal threat bar */}
                          <div className="flex flex-col items-end gap-1">
                            <p className="text-xs font-semibold" style={{ color: accent }}>
                              {player.goalThreat.toFixed(1)}
                            </p>
                            <div className="h-1 w-12 overflow-hidden rounded-full bg-[rgba(35,41,60,0.9)]">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, player.goalThreat * 100)}%`,
                                  background: `linear-gradient(90deg, transparent, ${accent})`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </StaggerList>
                  </div>
                ))}
              </div>
            </InfoCard>
          ) : (
            <InfoCard title="Squad">
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-3xl text-3xl"
                  style={{ background: accent + "15", border: `1px solid ${accent}30` }}
                >
                  ⏳
                </div>
                <div>
                  <p className="font-semibold text-[var(--foreground)]">Squad data loading</p>
                  <p className="wc-body mt-1 text-sm">
                    VOID is researching player data for all 48 teams. Check back in ~1 hour.
                  </p>
                </div>
              </div>
            </InfoCard>
          )}
        </div>

        {/* RIGHT: Fixtures + Group Table */}
        <div className="space-y-6">
          {/* Fixtures */}
          <InfoCard title={`Fixtures · ${teamFixtures.length}`}>
            <div className="space-y-2">
              {teamFixtures.length === 0 && (
                <p className="wc-body text-sm">No fixtures found for this team.</p>
              )}
              {teamFixtures.map((fixture) => {
                const isHome = fixture.homeTeamId === teamId;
                const opponent = teamsById[isHome ? fixture.awayTeamId : fixture.homeTeamId];
                const raw = fixture as unknown as Record<string, unknown>;
                const homeScore = (raw.homeScore ?? raw.home_score) as number | null | undefined;
                const awayScore = (raw.awayScore ?? raw.away_score) as number | null | undefined;
                const hasScore = homeScore != null && awayScore != null;
                const myScore  = isHome ? homeScore : awayScore;
                const oppScore = isHome ? awayScore : homeScore;
                const isWin    = hasScore && myScore != null && oppScore != null && myScore > oppScore;
                const isLoss   = hasScore && myScore != null && oppScore != null && myScore < oppScore;

                return (
                  <div
                    key={fixture.id}
                    className="wc-panel-muted flex items-center gap-3 rounded-2xl px-3 py-3"
                  >
                    {/* Stage pill */}
                    <span
                      className="hidden shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest sm:inline-block"
                      style={{ background: accent + "18", color: accent }}
                    >
                      {fixture.group ? `G${fixture.group}` : stageLabel(fixture.stage).slice(0, 3)}
                    </span>

                    {/* Opponent flag */}
                    {opponent ? (
                      <TeamMark fifaCode={opponent.fifaCode} name={opponent.name} size="sm" />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-2xl bg-[rgba(35,41,60,0.6)]" />
                    )}

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {isHome ? "vs" : "@"} {opponent?.name ?? fixture.awayTeamId}
                      </p>
                      <p className="wc-body text-xs">{kickoffDate(fixture.kickoffUtc)}</p>
                    </div>

                    {/* Score / status */}
                    {hasScore ? (
                      <span
                        className="shrink-0 rounded-xl px-2.5 py-1 text-sm font-bold tabular-nums"
                        style={{
                          background: isWin ? "#4ade8022" : isLoss ? "#f8717122" : "rgba(35,41,60,0.6)",
                          color: isWin ? "#4ade80" : isLoss ? "#f87171" : "var(--foreground-muted)",
                        }}
                      >
                        {myScore}–{oppScore}
                      </span>
                    ) : (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                        style={{ background: "rgba(35,41,60,0.6)", color: "var(--foreground-soft)" }}
                      >
                        {fixture.status === "live" ? "🔴 LIVE" : fixture.status}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </InfoCard>

          {/* Group table */}
          {groupTeams.length > 0 && (
            <InfoCard title={`Group ${team.group}`}>
              <div className="space-y-1">
                {groupTeams.map((t, i) => (
                  <Link
                    key={t.id}
                    href={`/teams/${t.id}`}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[rgba(255,255,255,0.04)] ${t.id === teamId ? "bg-[rgba(255,255,255,0.05)]" : ""}`}
                  >
                    <span
                      className="w-5 text-center text-xs font-semibold"
                      style={{ color: i === 0 ? "#4ade80" : i === 1 ? "var(--secondary)" : "var(--foreground-soft)" }}
                    >
                      {i + 1}
                    </span>
                    <TeamMark fifaCode={t.fifaCode} name={t.name} size="sm" />
                    <span className={`flex-1 text-sm font-semibold ${t.id === teamId ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}`}>
                      {t.name}
                    </span>
                    <span className="text-xs tabular-nums text-[var(--foreground-muted)]">
                      {t.strengthRating.toFixed(1)}
                    </span>
                  </Link>
                ))}
              </div>
            </InfoCard>
          )}
        </div>
      </div>
    </div>
  );
}
