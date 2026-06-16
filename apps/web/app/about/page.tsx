import { InfoCard } from "@/components/info-card";
import { PageHero } from "@/components/page-hero";

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="About route"
        title="Why this scaffold exists"
        description="WorldCupIQ needs a clean starting point before real data, polished product design, and advanced models land. This scaffold keeps the base decisions small, typed, and easy to review."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard title="Current philosophy">
          <p>
            Keep the app approachable, typed, and mock-backed. The goal is to support
            future prediction, simulator, and research features without overbuilding on
            day one.
          </p>
        </InfoCard>
        <InfoCard title="Product guardrails">
          <p>
            The language and structure in this repo are built for analytics, not
            gambling. We describe probability, form, expected goals, and explanations
            rather than odds promotion or wagering flows.
          </p>
        </InfoCard>
      </div>
    </div>
  );
}
