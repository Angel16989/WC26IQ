import type { Match, Team } from "@worldcupiq/shared";

import { InfoCard } from "@/components/info-card";
import { PageHero } from "@/components/page-hero";
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

function labelForStatus(status: Match["status"]) {
  switch (status) {
    case "scheduled":
      return "Scheduled";
    case "live":
      return "Live";
    case "final":
      return "Final";
    case "postponed":
      return "Postponed";
    default:
      return status;
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
  const liveFixtures = fixtures.filter((fixture) => fixture.status === "live").length;
  const scheduledFixtures = fixtures.filter(
    (fixture) => fixture.status === "scheduled",
  ).length;
  const teamNameById = new Map(teams.map((team) => [team.id, team.name]));

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Fixtures route"
        title="Live fixture schedule from the backend API"
        description="This page now reads directly from `/fixtures` and shows the active provider-backed tournament schedule. Stage, venue, kickoff time, and match status stay aligned with the shared match contract."
        aside={
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
              Schedule Snapshot
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div>
                <p className="text-2xl font-semibold">{fixtures.length}</p>
                <p className="text-sm text-slate-600">Fixtures returned</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{scheduledFixtures}</p>
                <p className="text-sm text-slate-600">Scheduled fixtures</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{liveFixtures}</p>
                <p className="text-sm text-slate-600">Live fixtures</p>
              </div>
            </div>
          </div>
        }
      />

      {errorMessage ? (
        <InfoCard title="Live fixtures unavailable">
          <p className="text-sm leading-7 text-slate-700">
            {errorMessage} Check that the API is running at the configured base URL and
            try again.
          </p>
        </InfoCard>
      ) : null}

      {!errorMessage && fixtures.length === 0 ? (
        <InfoCard title="No fixtures returned">
          <p className="text-sm leading-7 text-slate-700">
            The API responded successfully but did not return any fixture data.
          </p>
        </InfoCard>
      ) : null}

      {!errorMessage && fixtures.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <InfoCard title="Stage breakdown">
            <div className="space-y-3">
              {stageSummary.map(([stage, count]) => (
                <div
                  key={stage}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3"
                >
                  <span>{labelForStage(stage)}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </InfoCard>

          <InfoCard title="Fixture list">
            <div className="space-y-3">
              {fixtures.map((fixture) => (
                <article
                  key={fixture.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {teamNameById.get(fixture.homeTeamId) ??
                          fixture.homeTeamId.toUpperCase()}{" "}
                        vs{" "}
                        {teamNameById.get(fixture.awayTeamId) ??
                          fixture.awayTeamId.toUpperCase()}
                      </h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {labelForStage(fixture.stage)}
                        {fixture.group ? ` • Group ${fixture.group}` : ""}
                      </p>
                    </div>

                    <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                      {labelForStatus(fixture.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                        Kickoff UTC
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {formatKickoff(fixture.kickoffUtc)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                        Venue
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{fixture.venue}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </InfoCard>
        </div>
      ) : null}
    </div>
  );
}
