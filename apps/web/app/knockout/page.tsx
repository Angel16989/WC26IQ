import type { KnockoutBracket, ScenariosResponse } from "@/lib/api/client";
import { apiClient } from "@/lib/api/client";
import { KnockoutClient } from "./knockout-client";
import { PageHero } from "@/components/page-hero";

export default async function KnockoutPage() {
  let bracket: KnockoutBracket | null = null;
  let scenarios: ScenariosResponse | null = null;
  let errorMessage: string | null = null;

  try {
    [bracket, scenarios] = await Promise.all([
      apiClient.knockout(),
      apiClient.scenarios(),
    ]);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Failed to load knockout data.";
  }

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="⚡ Knockout Stage"
        title="Tournament Bracket & Winner Predictions"
        description="Real scores for completed matches · Poisson DC formula for upcoming · 8 000 Monte Carlo simulations for 5 winner scenarios"
        aside={
          bracket ? (
            <div className="wc-panel-muted rounded-3xl p-5 space-y-3">
              <p className="wc-data-label text-xs font-semibold">Bracket Status</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="wc-panel-muted rounded-2xl px-3 py-2.5 text-center">
                  <p className="text-2xl font-bold" style={{ color: "#4ade80" }}>{bracket.totalCompleted}</p>
                  <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>Completed</p>
                </div>
                <div className="wc-panel-muted rounded-2xl px-3 py-2.5 text-center">
                  <p className="text-2xl font-bold" style={{ color: "var(--secondary)" }}>{bracket.totalScheduled}</p>
                  <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>Upcoming</p>
                </div>
              </div>
              <div className="rounded-2xl px-3 py-2.5 text-center" style={{ background: "rgba(211,243,64,0.08)", border: "1px solid rgba(211,243,64,0.2)" }}>
                <p className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                  🤖 Poisson DC · Dixon-Coles 1997
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--foreground-soft)" }}>
                  8 000 Monte Carlo iterations
                </p>
              </div>
            </div>
          ) : null
        }
      />

      {errorMessage ? (
        <div className="wc-error-panel rounded-2xl p-6 text-center space-y-2">
          <p className="font-semibold text-lg">Knockout data unavailable</p>
          <p className="wc-body text-sm">{errorMessage}</p>
          <p className="text-xs opacity-50">Make sure the backend API is running and try refreshing.</p>
        </div>
      ) : (
        <KnockoutClient bracket={bracket!} scenarios={scenarios!} />
      )}
    </div>
  );
}
