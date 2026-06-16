import { InfoCard } from "@/components/info-card";
import { PageHero } from "@/components/page-hero";
import { PlaceholderList } from "@/components/placeholder-list";

export default function PredictionsPage() {
  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Predictions route"
        title="Placeholder prediction outputs and explanation space"
        description="The API client and shared contracts are ready for probability-based responses. The UI here intentionally stays plain until the final product design and real model work arrive."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard title="Prediction response fields">
          <PlaceholderList
            items={[
              "Home, draw, and away win probability",
              "Expected goals for both teams",
              "Likely scorer suggestions",
              "Confidence label and explanation text",
            ]}
          />
        </InfoCard>
        <InfoCard title="What the placeholder model does">
          <PlaceholderList
            items={[
              "Uses mock team strength and recent form",
              "Uses mock squad-strength indicators",
              "Ranks likely scorers from player goal-threat values",
              "Leaves advanced modelling for a later phase",
            ]}
          />
        </InfoCard>
      </div>
    </div>
  );
}
