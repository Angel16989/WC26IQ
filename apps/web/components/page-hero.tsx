import type { ReactNode } from "react";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}

export function PageHero({ eyebrow, title, description, aside }: PageHeroProps) {
  return (
    <section className="wc-panel grid gap-6 rounded-[28px] p-8 lg:grid-cols-[1.4fr_0.8fr]">
      <div className="space-y-4">
        <p
          className="wc-eyebrow text-xs font-semibold wc-fade-up"
          style={{ animationDuration: "0.5s" }}
        >
          {eyebrow}
        </p>
        <div className="space-y-3">
          <h1
            className="text-3xl font-semibold tracking-tight sm:text-4xl wc-fade-up"
            style={{ animationDelay: "60ms" }}
          >
            {title}
          </h1>
          <p
            className="wc-body max-w-2xl text-sm leading-7 sm:text-base wc-fade-up"
            style={{ animationDelay: "140ms" }}
          >
            {description}
          </p>
        </div>
      </div>
      {aside ? (
        <div className="wc-fade-up" style={{ animationDelay: "80ms" }}>
          {aside}
        </div>
      ) : null}
    </section>
  );
}
