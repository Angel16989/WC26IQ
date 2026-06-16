import { InfoCard } from "@/components/info-card";
import { PageHero } from "@/components/page-hero";
import { PlaceholderList } from "@/components/placeholder-list";

export default function SimulatorPage() {
  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Simulator route"
        title="Placeholder tournament simulation workspace"
        description="This route prepares space for group-table projections and bracket scenarios. The current API shape supports seeded placeholder simulations without claiming real tournament-model quality yet."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard title="Current API response shape">
          <PlaceholderList
            items={[
              "Projected group tables",
              "Winner probabilities",
              "Finalists and semi-finalists",
              "Notes explaining placeholder assumptions",
            ]}
          />
        </InfoCard>
        <InfoCard title="Not included yet">
          <PlaceholderList
            items={[
              "Knockout bracket UI design",
              "Real Monte Carlo simulation",
              "Database-backed historical calibration",
              "User-adjustable scenario controls",
            ]}
          />
        </InfoCard>
      </div>
    </div>
  );
}
