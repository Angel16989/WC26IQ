import type { Team } from "@worldcupiq/shared";

import { InfoCard } from "@/components/info-card";
import { PageHero } from "@/components/page-hero";
import { CountUp } from "@/components/count-up";
import { StaggerList } from "@/components/stagger-list";
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
          <div className="wc-panel-muted rounded-3xl p-5">
            <p className="wc-data-label text-xs font-semibold">
              Live Snapshot
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div>
                <p className="wc-data-value text-2xl font-semibold wc-shimmer-text">
                  <CountUp end={teams.length} />
                </p>
                <p className="wc-body text-sm">Teams returned</p>
              </div>
              <div>
                <p className="wc-data-value text-2xl font-semibold wc-shimmer-text">
                  <CountUp end={groups.size} />
                </p>
                <p className="wc-body text-sm">Groups represented</p>
              </div>
              <div>
                <p className="wc-data-value text-2xl font-semibold wc-shimmer-text">
                  <CountUp
                    end={parseFloat(averageRating(teams, (team) => team.strengthRating))}
                    decimals={1}
                  />
                </p>
                <p className="wc-body text-sm">Average strength rating</p>
              </div>
            </div>
          </div>
        }
      />

      {errorMessage ? (
        <InfoCard title="Live teams unavailable">
          <p className="text-sm leading-7">
            {errorMessage} Check that the API is running at the configured base URL and
            try again.
          </p>
        </InfoCard>
      ) : null}

      {!errorMessage && teams.length === 0 ? (
        <InfoCard title="No teams returned">
          <p className="text-sm leading-7">
            The API responded successfully but did not return any team data.
          </p>
        </InfoCard>
      ) : null}

      {!errorMessage && teams.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <InfoCard title="Coverage summary">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="wc-panel-muted rounded-2xl px-4 py-3">
                  <p className="wc-data-label text-xs font-semibold">
                    Form Index
                  </p>
                  <p className="wc-data-value mt-2 text-2xl font-semibold wc-shimmer-text">
                    <CountUp
                      end={parseFloat(averageRating(teams, (team) => team.formIndex))}
                      decimals={1}
                    />
                  </p>
                </div>
                <div className="wc-panel-muted rounded-2xl px-4 py-3">
                  <p className="wc-data-label text-xs font-semibold">
                    Squad Strength
                  </p>
                  <p className="wc-data-value mt-2 text-2xl font-semibold wc-shimmer-text">
                    <CountUp
                      end={parseFloat(averageRating(teams, (team) => team.squadStrength))}
                      decimals={1}
                    />
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Confederation split</h3>
                <div className="space-y-2">
                  {confederations.map(([confederation, count]) => (
                    <div
                      key={confederation}
                      className="wc-panel-muted flex items-center justify-between rounded-2xl px-4 py-3"
                    >
                      <span>{confederation}</span>
                      <span className="wc-data-value font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Team signals">
            <StaggerList className="space-y-3">
              {teams.map((team) => (
                <article
                  key={team.id}
                  className="wc-panel-muted rounded-2xl px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-[var(--foreground)]">
                          {team.name}
                        </h3>
                        <span className="wc-pill rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
                          {team.fifaCode}
                        </span>
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
                        {team.confederation}
                        {team.group ? ` • Group ${team.group}` : ""}
                      </p>
                    </div>

                    <p className="wc-body text-sm">
                      Last five:{" "}
                      <span className="font-medium text-[var(--foreground)]">
                        {team.lastFiveResults.join(" ")}
                      </span>
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="wc-data-label text-xs font-semibold">
                        Strength
                      </p>
                      <p className="wc-data-value mt-1 text-xl font-semibold">
                        {team.strengthRating.toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="wc-data-label text-xs font-semibold">
                        Form
                      </p>
                      <p className="wc-data-value mt-1 text-xl font-semibold">
                        {team.formIndex.toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="wc-data-label text-xs font-semibold">
                        Squad Depth
                      </p>
                      <p className="wc-data-value mt-1 text-xl font-semibold">
                        {team.squadStrength.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </StaggerList>
          </InfoCard>
        </div>
      ) : null}
    </div>
  );
}
