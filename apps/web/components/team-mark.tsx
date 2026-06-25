import { getTeamFlagEmoji } from "@/lib/team-visuals";

interface TeamMarkProps {
  fifaCode: string;
  name: string;
  size?: "sm" | "md" | "lg";
}

const wrapperClasses = {
  sm: "h-12 w-12 text-lg",
  md: "h-16 w-16 text-2xl",
  lg: "h-24 w-24 text-4xl",
};

const codeClasses = {
  sm: "text-[9px]",
  md: "text-[10px]",
  lg: "text-xs",
};

export function TeamMark({ fifaCode, name, size = "md" }: TeamMarkProps) {
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-[22px] border border-[var(--border-strong)] bg-[radial-gradient(circle_at_top,rgba(76,215,246,0.12),transparent_52%),linear-gradient(180deg,rgba(35,41,60,0.96),rgba(12,19,36,0.96))] shadow-[0_14px_30px_rgba(2,8,22,0.35)] ${wrapperClasses[size]}`}
      title={name}
      aria-label={`${name} badge`}
    >
      <span aria-hidden="true">{getTeamFlagEmoji(fifaCode)}</span>
      <span
        className={`absolute bottom-1 right-1 rounded-full border border-[var(--border)] bg-[rgba(7,13,31,0.86)] px-1.5 py-0.5 font-[var(--font-data)] uppercase tracking-[0.14em] text-[var(--foreground-muted)] ${codeClasses[size]}`}
      >
        {fifaCode}
      </span>
    </div>
  );
}
