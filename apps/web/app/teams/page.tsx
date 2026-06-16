import type { Team } from "@worldcupiq/shared";

import { InfoCard } from "@/components/info-card";
import { PageHero } from "@/components/page-hero";
import { apiClient } from "@/lib/api/client";

function buildConfederationSummary(teams: Team[]) {
  const counts = new Map<string, number>();

  for (const team of teams) {
    counts.set(team.confederation, (counts.get(team.confederation) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function averageRating(teams: Team[], selector: (team: Team) => number) {
  if (teams.length === 0) {
    return "0.0";
  }

  const total = teams.reduce((sum, team) => sum + selector(team), 0);
  return (total / teams.length).toFixed(1);
}

export default async function TeamsPage() {
  let teams: Team[] = [];
  let errorMessage: string | null = null;

  try {
    teams = await apiClient.teams();
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Teams data is temporarily unavailable.";
  }

  const groups = new Set(teams.map((team) => team.group).filter(Boolean));
  const confederations = buildConfederationSummary(teams);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Teams route"
        title="Live team profiles and strength inputs"
        description="This page now reads directly from the backend `/teams` contract and reflects the active provider behind the API. Team strength, recent form, squad depth, and tournament grouping stay in the same analytics-first shape."
        aside={
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
              Live Snapshot
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div>
                <p className="text-2xl font-semibold">{teams.length}</p>
                <p className="text-sm text-slate-600">Teams returned</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{groups.size}</p>
                <p className="text-sm text-slate-600">Groups represented</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {averageRating(teams, (team) => team.strengthRating)}
                </p>
                <p className="text-sm text-slate-600">Average strength rating</p>
              </div>
            </div>
          </div>
        }
      />

      {errorMessage ? (
        <InfoCard title="Live teams unavailable">
          <p className="text-sm leading-7 text-slate-700">
            {errorMessage} Check that the API is running at the configured base URL and
            try again.
          </p>
        </InfoCard>
      ) : null}

      {!errorMessage && teams.length === 0 ? (
        <InfoCard title="No teams returned">
          <p className="text-sm leading-7 text-slate-700">
            The API responded successfully but did not return any team data.
          </p>
        </InfoCard>
      ) : null}

      {!errorMessage && teams.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <InfoCard title="Coverage summary">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                    Form Index
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {averageRating(teams, (team) => team.formIndex)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                    Squad Strength
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {averageRating(teams, (team) => team.squadStrength)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Confederation split
                </h3>
                <div className="space-y-2">
                  {confederations.map(([confederation, count]) => (
                    <div
                      key={confederation}
                      className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3"
                    >
                      <span>{confederation}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Team signals">
            <div className="space-y-3">
              {teams.map((team) => (
                <article
                  key={team.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">
                          {team.name}
                        </h3>
                        <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                          {team.fifaCode}
                        </span>
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {team.confederation}
                        {team.group ? ` • Group ${team.group}` : ""}
                      </p>
                    </div>

                    <p className="text-sm text-slate-600">
                      Last five:{" "}
                      <span className="font-medium text-slate-900">
                        {team.lastFiveResults.join(" ")}
                      </span>
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                        Strength
                      </p>
                      <p className="mt-1 text-xl font-semibold">
                        {team.strengthRating.toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                        Form
                      </p>
                      <p className="mt-1 text-xl font-semibold">
                        {team.formIndex.toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                        Squad Depth
                      </p>
                      <p className="mt-1 text-xl font-semibold">
                        {team.squadStrength.toFixed(1)}
                      </p>
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
