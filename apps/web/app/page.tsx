import Link from "next/link";
import type {
  HealthResponse,
  Match,
  MatchPredictionResponse,
  Team,
} from "@worldcupiq/shared";

import { InfoCard } from "@/components/info-card";
import { PageHero } from "@/components/page-hero";
import { TeamMark } from "@/components/team-mark";
import { TiltCard } from "@/components/tilt-card";
import { CountUp } from "@/components/count-up";
import { StaggerList } from "@/components/stagger-list";
import { GlobeWrapper } from "@/components/globe-wrapper";
import { LandingGate } from "@/components/landing-gate";
import { apiClient } from "@/lib/api/client";

function probabilityWidth(probability: number) {
  return `${Math.round(probability * 100)}%`;
}

function matchTime(utc: string) {
  return new Date(utc).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  });
}

function matchDate(utc: string) {
  return new Date(utc).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function stageLabel(stage: Match["stage"]) {
  return stage.replaceAll("_", " ");
}

function scoreText(match: Match) {
  if (match.homeScore != null && match.awayScore != null) {
    return `${match.homeScore} – ${match.awayScore}`;
  }
  if (match.status === "live") {
    return "LIVE";
  }
  if (match.status === "final") {
    return "FT";
  }
  return matchTime(match.kickoffUtc);
}

function matchStatusLabel(match: Match) {
  if (match.status === "live") {
    return "Live now";
  }
  if (match.status === "final") {
    return "Recently finished";
  }
  return `${matchDate(match.kickoffUtc)} · ${matchTime(match.kickoffUtc)} UTC`;
}

function pickHomeMatches(fixtures: Match[]) {
  // ONLY show live + upcoming — never show stale completed matches on homepage
  const live = fixtures
    .filter((f) => f.status === "live")
    .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime());
  const upcoming = fixtures
    .filter((f) => f.status === "scheduled")
    .sort((a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime());

  return [...live, ...upcoming].slice(0, 8);
}

const routeCards = [
  {
    href: "/teams",
    title: "Team Profiles",
    description: "Strength, form, squad depth, and recent results in one scouting surface.",
    accent: "var(--secondary)",
  },
  {
    href: "/fixtures",
    title: "Fixtures Board",
    description: "Upcoming kickoff times, stages, and venues with one consistent tournament view.",
    accent: "var(--accent)",
  },
  {
    href: "/predictions",
    title: "Prediction Studio",
    description: "Run live match forecasts from the current backend model and inspect likely scorers.",
    accent: "var(--tertiary)",
  },
  {
    href: "/simulator",
    title: "Simulation Lab",
    description: "Generate tournament outcome projections from the current seeded simulation engine.",
    accent: "var(--secondary)",
  },
];

export default async function HomePage() {
  let errorMessage: string | null = null;
  let teams: Team[] = [];
  let fixtures: Match[] = [];
  let health: HealthResponse | null = null;
  let featuredPrediction: MatchPredictionResponse | null = null;

  try {
    [health, teams, fixtures] = await Promise.all([
      apiClient.health(),
      apiClient.teams(),
      apiClient.fixtures(),
    ]);

    const predictionFixture =
      fixtures.find((fixture) => fixture.status === "live") ??
      fixtures.find((fixture) => fixture.status === "scheduled");
    // Never predict for a completed match on the homepage
    if (predictionFixture && predictionFixture.status !== "final") {
      featuredPrediction = await apiClient.predictMatch({
        homeTeamId: predictionFixture.homeTeamId,
        awayTeamId: predictionFixture.awayTeamId,
        includeLikelyScorers: true,
        includeModelNotes: false,
      });
    }
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Home page data is temporarily unavailable.";
  }

  const groups = new Set(teams.map((team) => team.group).filter(Boolean));
  const homeMatches = pickHomeMatches(fixtures);
  // Only feature live or upcoming matches — never show a completed old match
  const featuredFixture =
    fixtures.find((f) => f.status === "live") ??
    fixtures.find((f) => f.status === "scheduled");
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const homeTeam = featuredFixture
    ? teams.find((team) => team.id === featuredFixture.homeTeamId)
    : undefined;
  const awayTeam = featuredFixture
    ? teams.find((team) => team.id === featuredFixture.awayTeamId)
    : undefined;

  const avgStrength =
    teams.length > 0
      ? teams.reduce((s, t) => s + t.strengthRating, 0) / teams.length
      : 0;

  return (
    <LandingGate>
    <div className="space-y-6">
      {/* ── Hero with 3D Globe ───────────────────────────────────────── */}
      <PageHero
        eyebrow="FIFA World Cup 2026 · Live Intelligence"
        title="Real scores, real squads, real predictions — all 48 teams, 104 matches"
        description="ESPN live sync every 10 min · 1,246 real players · DC-corrected Poisson predictions · Match detail with goals, stats & lineups."
        aside={
          <div className="space-y-4">
            {/* 3D Globe scene */}
            <div className="wc-globe-container" style={{ height: 260 }}>
              <GlobeWrapper />
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  zIndex: 2,
                  pointerEvents: "none",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "var(--font-data)",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(0,229,255,0.55)",
                  }}
                >
                  FIFA World Cup 2026
                </span>
              </div>
            </div>

            {/* Live stats panel */}
            <div className="wc-panel-muted rounded-3xl p-5">
              <p className="wc-data-label text-xs font-semibold">Live Tournament Snapshot</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div>
                  <p className="wc-data-value text-3xl font-semibold wc-shimmer-text">
                    <CountUp end={teams.length} />
                  </p>
                  <p className="wc-body text-sm">Teams tracked</p>
                </div>
                <div>
                  <p className="wc-data-value text-3xl font-semibold wc-shimmer-text">
                    <CountUp end={fixtures.length} />
                  </p>
                  <p className="wc-body text-sm">Fixtures loaded</p>
                </div>
                <div>
                  <p className="wc-data-value text-3xl font-semibold wc-shimmer-text">
                    <CountUp end={groups.size} />
                  </p>
                  <p className="wc-body text-sm">Groups represented</p>
                </div>
                <div>
                  <p className="wc-data-value text-3xl font-semibold wc-shimmer-text">
                    <CountUp end={avgStrength} decimals={1} />
                  </p>
                  <p className="wc-body text-sm">Average strength rating</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[rgba(7,13,31,0.72)] px-4 py-3">
                  <p className="wc-data-label text-xs font-semibold">API Status</p>
                  <p className="mt-2 text-sm text-[var(--foreground)]">
                    {health?.status === "ok" ? (
                      <span style={{ color: "var(--accent)" }}>● Backend connected</span>
                    ) : (
                      "Waiting on backend"
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        }
      />

      {errorMessage ? (
        <InfoCard title="Live home data unavailable">
          <p>{errorMessage} Start the API and refresh to repopulate the home page.</p>
        </InfoCard>
      ) : null}

      <section className="wc-panel rounded-[28px] p-5 wc-fade-up">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="wc-eyebrow text-xs font-semibold">Live & Recent Matches</p>
            <h2 className="mt-2 text-2xl font-semibold">Scores on the board</h2>
          </div>
          <Link
            href="/fixtures"
            className="rounded-full border border-[var(--border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--secondary)] transition-opacity hover:opacity-75"
          >
            All fixtures
          </Link>
        </div>

        <div className="mt-5 grid gap-3">
          {homeMatches.length > 0 ? (
            homeMatches.map((match) => {
              const home = teamById.get(match.homeTeamId);
              const away = teamById.get(match.awayTeamId);
              const isLive = match.status === "live";
              const isFinal = match.status === "final";

              return (
                <Link
                  key={match.id}
                  href={`/matches/${encodeURIComponent(match.id)}`}
                  className="fixture-card wc-panel-muted grid gap-3 rounded-2xl px-4 py-3.5 transition-all hover:border-[var(--secondary)] hover:bg-[rgba(0,229,255,0.03)] sm:grid-cols-[1fr_auto_1fr] sm:items-center"
                  style={isLive ? { borderColor: "rgba(248,113,113,0.36)" } : undefined}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {home ? <TeamMark fifaCode={home.fifaCode} name={home.name} size="sm" /> : null}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{home?.name ?? match.homeTeamId.toUpperCase()}</p>
                      <p className="wc-body text-[11px]">Home</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[rgba(7,13,31,0.72)] px-4 py-3 sm:block sm:min-w-[132px] sm:text-center">
                    <p
                      className="text-2xl font-black tabular-nums"
                      style={{
                        color: isLive ? "#f87171" : isFinal ? "var(--accent)" : "var(--secondary)",
                        fontFamily: "var(--font-data)",
                      }}
                    >
                      {scoreText(match)}
                    </p>
                    <p className="mt-1 flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--foreground-soft)]">
                      {isLive ? <span className="live-dot" /> : null}
                      {matchStatusLabel(match)}
                    </p>
                  </div>

                  <div className="flex min-w-0 items-center gap-3 sm:justify-end">
                    <div className="min-w-0 sm:text-right">
                      <p className="truncate text-sm font-semibold">{away?.name ?? match.awayTeamId.toUpperCase()}</p>
                      <p className="wc-body text-[11px]">
                        {stageLabel(match.stage)}
                        {match.group ? ` · Group ${match.group}` : ""}
                      </p>
                    </div>
                    {away ? <TeamMark fifaCode={away.fifaCode} name={away.name} size="sm" /> : null}
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="wc-panel-muted rounded-2xl p-4 text-sm text-[var(--foreground-soft)]">
              No live or recently finished matches are loaded yet.
            </div>
          )}
        </div>
      </section>

      {/* ── Image divider after hero ─────────────────────────────────── */}
      <div
        className="wc-img-banner wc-glass rounded-2xl"
        style={{ height: 80, overflow: "hidden" }}
      >
        <div
          className="wc-img-banner-bg"
          style={{ backgroundImage: "url('/images/hero_action.jpg')", opacity: 0.12 }}
        />
        <div className="relative z-10 flex h-full items-center justify-center gap-8 px-6">
          {["🏆 48 Teams", "📅 104 Matches", "🌍 16 Venues", "⚡ Live Data", "🤖 AI Predictions"].map((item) => (
            <span
              key={item}
              className="hidden text-xs font-semibold sm:block"
              style={{
                fontFamily: "var(--font-data)",
                letterSpacing: "0.15em",
                color: "rgba(0,229,255,0.7)",
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── Route cards with 3D tilt ─────────────────────────────────── */}
      <StaggerList className="grid gap-4 md:grid-cols-2">
        {routeCards.map((card) => (
          <TiltCard
            key={card.href}
            className="wc-panel wc-panel-link rounded-3xl"
            style={{ position: "relative", overflow: "hidden" }}
          >
            <Link href={card.href} className="block p-6">
              <p
                className="text-xs font-semibold"
                style={{
                  fontFamily: "var(--font-data)",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: card.accent,
                }}
              >
                Route
              </p>
              <h2 className="mt-3 text-xl font-semibold">{card.title}</h2>
              <p className="wc-body mt-2 text-sm leading-7">{card.description}</p>
              {/* Bottom accent line */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "15%",
                  right: "15%",
                  height: 1,
                  background: `linear-gradient(90deg, transparent, ${card.accent}, transparent)`,
                  opacity: 0.45,
                }}
              />
            </Link>
          </TiltCard>
        ))}
      </StaggerList>

      {/* ── Featured matchup ─────────────────────────────────────────── */}
      {featuredFixture && homeTeam && awayTeam && featuredPrediction ? (
        <section className="wc-panel rounded-[28px] p-8 wc-fade-up" style={{ animationDelay: "200ms" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="wc-eyebrow text-xs font-semibold">Featured Matchup</p>
              <h2 className="mt-3 text-2xl font-semibold">
                {homeTeam.name} vs {awayTeam.name}
              </h2>
              <p className="wc-body mt-2 text-sm">
                {stageLabel(featuredFixture.stage)}
                {featuredFixture.group ? ` • Group ${featuredFixture.group}` : ""}
                {` • ${featuredFixture.venue}`}
              </p>
            </div>
            <div className="rounded-full border border-[var(--border)] bg-[rgba(7,13,31,0.72)] px-3 py-1 font-[var(--font-data)] text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
              {featuredPrediction.modelVersion}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.58)] p-6">
              <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="flex items-center gap-4">
                  <TeamMark fifaCode={homeTeam.fifaCode} name={homeTeam.name} size="lg" />
                  <div>
                    <p className="text-xl font-semibold">{homeTeam.name}</p>
                    <p className="wc-body text-sm">Home side</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="wc-data-label text-xs font-semibold">Forecast</p>
                  <p className="mt-2 text-4xl font-semibold text-[var(--secondary)]">VS</p>
                </div>
                <div className="flex items-center gap-4 md:justify-end">
                  <div className="text-right">
                    <p className="text-xl font-semibold">{awayTeam.name}</p>
                    <p className="wc-body text-sm">Away side</p>
                  </div>
                  <TeamMark fifaCode={awayTeam.fifaCode} name={awayTeam.name} size="lg" />
                </div>
              </div>

              {/* Animated probability bars */}
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="wc-data-label text-xs font-semibold">Home Win</p>
                  <p className="wc-data-value mt-2 text-2xl font-semibold">
                    <CountUp end={Math.round(featuredPrediction.homeWinProbability * 100)} />%
                  </p>
                  <div className="wc-prob-track mt-3">
                    <div
                      className="wc-prob-bar"
                      style={{
                        width: probabilityWidth(featuredPrediction.homeWinProbability),
                        background: "linear-gradient(90deg,#0b1321,#4be277)",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <p className="wc-data-label text-xs font-semibold">Draw</p>
                  <p className="wc-data-value mt-2 text-2xl font-semibold">
                    <CountUp end={Math.round(featuredPrediction.drawProbability * 100)} />%
                  </p>
                  <div className="wc-prob-track mt-3">
                    <div
                      className="wc-prob-bar"
                      style={{
                        width: probabilityWidth(featuredPrediction.drawProbability),
                        background: "linear-gradient(90deg,#0b1321,#4cd7f6)",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <p className="wc-data-label text-xs font-semibold">Away Win</p>
                  <p className="wc-data-value mt-2 text-2xl font-semibold">
                    <CountUp end={Math.round(featuredPrediction.awayWinProbability * 100)} />%
                  </p>
                  <div className="wc-prob-track mt-3">
                    <div
                      className="wc-prob-bar"
                      style={{
                        width: probabilityWidth(featuredPrediction.awayWinProbability),
                        background: "linear-gradient(90deg,#0b1321,#fabe22)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.58)] p-5">
                <p className="wc-data-label text-xs font-semibold">Expected Goals</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="wc-body text-sm">{homeTeam.name}</p>
                    <p className="wc-data-value mt-1 text-3xl font-semibold wc-shimmer-text">
                      <CountUp end={featuredPrediction.expectedGoals.home} decimals={2} />
                    </p>
                  </div>
                  <div>
                    <p className="wc-body text-sm">{awayTeam.name}</p>
                    <p className="wc-data-value mt-1 text-3xl font-semibold wc-shimmer-text">
                      <CountUp end={featuredPrediction.expectedGoals.away} decimals={2} />
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.58)] p-5">
                <p className="wc-data-label text-xs font-semibold">Model Read</p>
                <p className="wc-body mt-4 text-sm leading-7">
                  {featuredPrediction.explanation}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard title="⚡ Knockout Stage — Live Now">
          <p>
            The Round of 32 has started. South Africa 0–1 Canada is the first
            completed knockout result. Click <strong>Knockout</strong> in the nav
            to see the full bracket, real scores, and our 5 winner scenarios
            powered by the Dixon-Coles Poisson formula.
          </p>
        </InfoCard>
        <InfoCard title="🤖 Prediction Engine">
          <p>
            Probabilities use a DC-corrected Poisson model: team strength (52%),
            form index (22%), squad depth (16%), recent results (10%). 8,000
            Monte Carlo simulations determine the 5 championship scenarios shown
            on the Knockout page.
          </p>
        </InfoCard>
      </div>
    </div>
    </LandingGate>
  );
}
