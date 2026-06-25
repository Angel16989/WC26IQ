import type { MatchResultCode } from "@worldcupiq/shared";

interface FormStripProps {
  results: MatchResultCode[];
}

const resultClasses: Record<MatchResultCode, string> = {
  W: "border-[rgba(107,255,143,0.25)] bg-[rgba(34,197,94,0.18)] text-[var(--accent)]",
  D: "border-[rgba(76,215,246,0.25)] bg-[rgba(6,182,212,0.16)] text-[var(--secondary)]",
  L: "border-[rgba(255,180,171,0.25)] bg-[rgba(147,0,10,0.16)] text-[var(--error)]",
};

export function FormStrip({ results }: FormStripProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {results.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={`rounded-full border px-2.5 py-1 font-[var(--font-data)] text-[11px] tracking-[0.18em] ${resultClasses[result]}`}
        >
          {result}
        </span>
      ))}
    </div>
  );
}
