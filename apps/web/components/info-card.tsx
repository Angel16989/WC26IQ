import type { ReactNode } from "react";

interface InfoCardProps {
  title: string;
  children: ReactNode;
}

export function InfoCard({ title, children }: InfoCardProps) {
  return (
    <section className="wc-panel rounded-3xl p-6">
      <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
      <div className="wc-body mt-4 text-sm leading-7">{children}</div>
    </section>
  );
}
