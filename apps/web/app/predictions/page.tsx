import type { Match, Team } from "@worldcupiq/shared";

import { InfoCard } from "@/components/info-card";
import { PageHero } from "@/components/page-hero";
import { PredictionWorkbench } from "@/components/prediction-workbench";
import { apiClient } from "@/lib/api/client";

export default async function PredictionsPage() {
  let teams: Team[] = [];
  let fixtures: Match[] = [];
  let errorMessage: string | null = null;

  try {
    [teams, fixtures] = await Promise.all([apiClient.teams(), apiClient.fixtures()]);
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Prediction data is temporarily unavailable.";
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Predictions"
        title="Run live match forecasts inside the real app shell"
        description="The prediction page now uses the shared frontend navigation and the backend prediction endpoint directly. That means the UI can stay consistent while still showing model output, scorer projections, and explanation notes."
        aside={
          <div className="wc-panel-muted rounded-3xl p-5">
            <p className="wc-data-label text-xs font-semibold">Coverage Snapshot</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <p className="wc-data-value text-2xl font-semibold">{fixtures.length}</p>
                <p className="wc-body text-sm">Fixtures available</p>
              </div>
              <div>
                <p className="wc-data-value text-2xl font-semibold">{teams.length}</p>
                <p className="wc-body text-sm">Teams available</p>
              </div>
            </div>
          </div>
        }
      />

      {errorMessage ? (
        <InfoCard title="Predictions unavailable">
          <p>{errorMessage} Start the backend API and refresh this page.</p>
        </InfoCard>
      ) : (
        <PredictionWorkbench fixtures={fixtures} teams={teams} />
      )}
    </div>
  );
}
