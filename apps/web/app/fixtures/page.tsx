import type { Match, Team } from "@worldcupiq/shared";

import { InfoCard } from "@/components/info-card";
import { PageHero } from "@/components/page-hero";
import { TeamMark } from "@/components/team-mark";
import { apiClient } from "@/lib/api/client";

function formatKickoff(value: string) {
  const kickoff = new Date(value);

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(kickoff);
}

function labelForStage(stage: Match["stage"]) {
  switch (stage) {
    case "group":
      return "Group Stage";
    case "round_of_16":
      return "Round of 16";
    case "quarterfinal":
      return "Quarterfinal";
    case "semifinal":
      return "Semifinal";
    case "third_place":
      return "Third Place";
    case "final":
      return "Final";
    default:
      return stage;
  }
}

function buildStageSummary(fixtures: Match[]) {
  const counts = new Map<Match["stage"], number>();

  for (const fixture of fixtures) {
    counts.set(fixture.stage, (counts.get(fixture.stage) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

export default async function FixturesPage() {
  let fixtures: Match[] = [];
  let teams: Team[] = [];
  let errorMessage: string | null = null;

  try {
    [fixtures, teams] = await Promise.all([apiClient.fixtures(), apiClient.teams()]);
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Fixtures data is temporarily unavailable.";
  }

  const stageSummary = buildStageSummary(fixtures);
  const teamById = new Map(teams.map((team) => [team.id, team]));

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Fixtures"
        title="Match schedule with clearer teams, stages, and venues"
        description="The fixtures view now stays inside the same product shell and gives every matchup proper team identity, tournament context, and backend-backed scheduling data."
        aside={
          <div className="wc-panel-muted rounded-3xl p-5">
            <p className="wc-data-label text-xs font-semibold">Schedule Snapshot</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div>
                <p className="wc-data-value text-2xl font-semibold">{fixtures.length}</p>
                <p className="wc-body text-sm">Fixtures returned</p>
              </div>
              <div>
                <p className="wc-data-value text-2xl font-semibold">{stageSummary.length}</p>
                <p className="wc-body text-sm">Stages represented</p>
              </div>
              <div>
                <p className="wc-data-value text-2xl font-semibold">
                  {fixtures.filter((fixture) => fixture.stage === "group").length}
                </p>
                <p className="wc-body text-sm">Group-stage matches</p>
              </div>
            </div>
          </div>
        }
      />

      {errorMessage ? (
        <InfoCard title="Live fixtures unavailable">
          <p>{errorMessage} Check that the API is running at the configured base URL and try again.</p>
        </InfoCard>
      ) : null}

      {!errorMessage && fixtures.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[0.74fr_1.26fr]">
          <InfoCard title="Stage breakdown">
            <div className="space-y-3">
              {stageSummary.map(([stage, count]) => (
                <div
                  key={stage}
                  className="wc-panel-muted flex items-center justify-between rounded-2xl px-4 py-3"
                >
                  <span>{labelForStage(stage)}</span>
                  <span className="wc-data-value font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </InfoCard>

          <InfoCard title="Fixture board">
            <div className="space-y-4">
              {fixtures.map((fixture) => {
                const homeTeam = teamById.get(fixture.homeTeamId);
                const awayTeam = teamById.get(fixture.awayTeamId);

                return (
                  <article
                    key={fixture.id}
                    className="wc-panel-muted rounded-[26px] px-5 py-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <TeamMark
                          fifaCode={homeTeam?.fifaCode ?? fixture.homeTeamId.toUpperCase()}
                          name={homeTeam?.name ?? fixture.homeTeamId}
                          size="md"
                        />
                        <div className="text-center">
                          <p className="wc-data-label text-xs font-semibold">Matchup</p>
                          <p className="mt-2 text-2xl font-semibold text-[var(--secondary)]">VS</p>
                        </div>
                        <TeamMark
                          fifaCode={awayTeam?.fifaCode ?? fixture.awayTeamId.toUpperCase()}
                          name={awayTeam?.name ?? fixture.awayTeamId}
                          size="md"
                        />
                      </div>

                      <div className="rounded-full border border-[var(--border)] bg-[rgba(7,13,31,0.72)] px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
                        {fixture.status}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--foreground)]">
                          {homeTeam?.name ?? fixture.homeTeamId} vs {awayTeam?.name ?? fixture.awayTeamId}
                        </h3>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
                          {labelForStage(fixture.stage)}
                          {fixture.group ? ` • Group ${fixture.group}` : ""}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(12,19,36,0.52)] px-4 py-3">
                          <p className="wc-data-label text-xs font-semibold">Kickoff UTC</p>
                          <p className="wc-body mt-2 text-sm">{formatKickoff(fixture.kickoffUtc)}</p>
                        </div>
                        <div className="rounded-2xl border border-[var(--border)] bg-[rgba(12,19,36,0.52)] px-4 py-3">
                          <p className="wc-data-label text-xs font-semibold">Venue</p>
                          <p className="wc-body mt-2 text-sm">{fixture.venue}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </InfoCard>
        </div>
      ) : null}
    </div>
  );
}
