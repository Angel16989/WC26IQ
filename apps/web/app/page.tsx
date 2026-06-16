import Link from "next/link";
import { InfoCard } from "@/components/info-card";
import { PageHero } from "@/components/page-hero";
import { PlaceholderList } from "@/components/placeholder-list";

const routeCards = [
  {
    href: "/teams",
    title: "Teams",
    description: "Placeholder views for squad strength, form, and team profiles.",
  },
  {
    href: "/fixtures",
    title: "Fixtures",
    description: "Mock group-stage schedule routes and future match lookup flows.",
  },
  {
    href: "/predictions",
    title: "Predictions",
    description: "Typed response shapes for probabilities, xG, scorers, and confidence.",
  },
  {
    href: "/simulator",
    title: "Simulator",
    description: "Future home for group-table and tournament path projections.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Project foundation"
        title="A clean starting point for a World Cup analytics product"
        description="This placeholder frontend exists to prove route structure, contracts, and API boundaries. Final visual design, richer interaction, and real datasets are intentionally deferred."
        aside={
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
            <p className="text-sm font-medium text-slate-900">Current scope</p>
            <div className="mt-3">
              <PlaceholderList
                items={[
                  "Next.js App Router scaffold",
                  "Shared TypeScript contracts",
                  "Typed API client helpers",
                  "Mock-backed FastAPI endpoints",
                ]}
              />
            </div>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2">
        {routeCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm transition hover:border-[var(--accent)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              Route
            </p>
            <h2 className="mt-3 text-xl font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">{card.description}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard title="Product positioning">
          <p>
            WorldCupIQ is being prepared as a sports analytics product. Probability,
            expected goals, model explanation, and accuracy tracking belong here.
            Betting language, stake suggestions, and guaranteed-return framing do not.
          </p>
        </InfoCard>
        <InfoCard title="Void status">
          <p>
            Void is not part of the running frontend or backend yet. This repository
            only reserves a documented place for it so later integration can happen
            intentionally instead of leaking into the base app too early.
          </p>
        </InfoCard>
      </div>
    </div>
  );
}
