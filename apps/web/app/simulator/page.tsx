import type { Team } from "@worldcupiq/shared";

import { InfoCard } from "@/components/info-card";
import { PageHero } from "@/components/page-hero";
import { SimulatorWorkbench } from "@/components/simulator-workbench";
import { apiClient } from "@/lib/api/client";

export default async function SimulatorPage() {
  let teams: Team[] = [];
  let errorMessage: string | null = null;

  try {
    teams = await apiClient.teams();
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Simulator data is temporarily unavailable.";
  }

  const groups = new Set(teams.map((team) => team.group).filter(Boolean));

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Simulator"
        title="Generate tournament outcome projections without leaving the main app"
        description="This page now uses the current simulation endpoint instead of a disconnected mock screen. It stays inside the same visual system as the rest of the site and surfaces winner, finalist, and group-table projections."
        aside={
          <div className="wc-panel-muted rounded-3xl p-5">
            <p className="wc-data-label text-xs font-semibold">Simulation Scope</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <p className="wc-data-value text-2xl font-semibold">{teams.length}</p>
                <p className="wc-body text-sm">Teams in pool</p>
              </div>
              <div>
                <p className="wc-data-value text-2xl font-semibold">{groups.size}</p>
                <p className="wc-body text-sm">Groups visible</p>
              </div>
            </div>
          </div>
        }
      />

      {errorMessage ? (
        <InfoCard title="Simulation unavailable">
          <p>{errorMessage} Start the backend API and refresh this page.</p>
        </InfoCard>
      ) : (
        <SimulatorWorkbench teamCount={teams.length} />
      )}
    </div>
  );
}
