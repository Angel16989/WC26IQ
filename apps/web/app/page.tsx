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
import { apiClient } from "@/lib/api/client";

function probabilityWidth(probability: number) {
  return `${Math.round(probability * 100)}%`;
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

    const featuredFixture = fixtures[0];
    if (featuredFixture) {
      featuredPrediction = await apiClient.predictMatch({
        homeTeamId: featuredFixture.homeTeamId,
        awayTeamId: featuredFixture.awayTeamId,
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
  const featuredFixture = fixtures[0];
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
    <div className="space-y-6">
      {/* ── Hero with 3D Globe ───────────────────────────────────────── */}
      <PageHero
        eyebrow="World Cup Portal"
        title="A sharper World Cup home for teams, fixtures, forecasts, and tournament paths"
        description="Live analytics, match predictions, and tournament simulation — all connected to the backend in one command-center view."
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
                {featuredFixture.stage.replaceAll("_", " ")}
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
        <InfoCard title="World Cup Theme Direction">
          <p>
            The site is moving toward one unified tournament command-center style:
            dark stadium lighting, clearer team identity, and consistent analytics surfaces
            across home, teams, fixtures, predictions, and simulator.
          </p>
        </InfoCard>
        <InfoCard title="Backend Integration Status">
          <p>
            The backend already serves health, teams, fixtures, match prediction, and
            tournament simulation endpoints. The next frontend pass is about making every
            page use those endpoints cleanly instead of feeling like separate demos.
          </p>
        </InfoCard>
      </div>
    </div>
  );
}
