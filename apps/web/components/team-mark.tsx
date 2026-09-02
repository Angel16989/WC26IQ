import Image from "next/image";
import { getTeamFlagSvgPath, getTeamFlagEmoji } from "@/lib/team-visuals";

interface TeamMarkProps {
  fifaCode: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const wrapperSize = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-20 w-20",
  xl: "h-28 w-28",
};

const imgSize = { sm: 28, md: 40, lg: 56, xl: 72 };

const codeClasses = {
  sm: "text-[8px]",
  md: "text-[9px]",
  lg: "text-[10px]",
  xl: "text-xs",
};

export function TeamMark({ fifaCode, name, size = "md" }: TeamMarkProps) {
  const svgPath = getTeamFlagSvgPath(fifaCode);
  const emoji = getTeamFlagEmoji(fifaCode);
  const px = imgSize[size];

  return (
    <div
      className={`team-mark relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(35,41,60,0.96),rgba(12,19,36,0.96))] shadow-[0_8px_24px_rgba(2,8,22,0.4)] ${wrapperSize[size]}`}
      title={name}
      aria-label={`${name} flag`}
    >
      {svgPath ? (
        <Image
          src={svgPath}
          alt={`${name} flag`}
          width={px}
          height={px}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span className="text-2xl" aria-hidden="true">{emoji}</span>
      )}
      {/* FIFA code badge */}
      <span
        className={`absolute bottom-0 right-0 rounded-tl-lg bg-[rgba(7,13,31,0.88)] px-1.5 py-0.5 font-[var(--font-data)] uppercase tracking-[0.12em] text-[var(--foreground-muted)] backdrop-blur-sm ${codeClasses[size]}`}
      >
        {fifaCode}
      </span>
    </div>
  );
}
