import type { ReactNode } from "react";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}

export function PageHero({ eyebrow, title, description, aside }: PageHeroProps) {
  return (
    <section className="grid gap-6 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm lg:grid-cols-[1.4fr_0.8fr]">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
          {eyebrow}
        </p>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-700 sm:text-base">
            {description}
          </p>
        </div>
      </div>
      {aside ? <div>{aside}</div> : null}
    </section>
  );
}
