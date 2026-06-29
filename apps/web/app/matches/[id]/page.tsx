import Link from "next/link";
import Image from "next/image";
import type { KeyEvent, LineupPlayer, MatchDetail, StatRow } from "@/lib/api/client";
import { apiClient } from "@/lib/api/client";
import { getTeamFlagSvgPath } from "@/lib/team-visuals";
import { StaggerList } from "@/components/stagger-list";

/* ── helpers ─────────────────────────────────────────────────────────── */

const EVENT_ICON: Record<string, string> = {
  "goal":           "⚽",
  "goal - header":  "🤛",
  "goal - penalty": "🥅",
  "yellow card":    "🟨",
  "red card":       "🟥",
  "substitution":   "🔄",
  "kickoff":        "🏁",
  "halftime":       "⏸",
};

function eventIcon(type: string | null) {
  const t = (type || "").toLowerCase();
  for (const [k, v] of Object.entries(EVENT_ICON)) if (t.includes(k)) return v;
  return "•";
}

function eventColour(type: string | null) {
  const t = (type || "").toLowerCase();
  if (t.includes("goal"))        return "#4ade80";
  if (t.includes("red"))        return "#f87171";
  if (t.includes("yellow"))     return "#facc15";
  if (t.includes("sub"))        return "var(--secondary)";
  return "rgba(148,163,184,0.5)";
}

function isGoal(type: string | null) {
  return (type || "").toLowerCase().includes("goal");
}

function stageLabel(stage: string) {
  const m: Record<string,string> = {
    group:"Group Stage", round_of_16:"Round of 32",
    quarterfinal:"Quarterfinal", semifinal:"Semi-final",
    third_place:"3rd Place", final:"Final",
  };
  return m[stage] ?? stage;
}

/* ── Pitch SVG ───────────────────────────────────────────────────────── */
function PitchSVG() {
  return (
    <svg viewBox="0 0 340 520" style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}>
      <rect width="340" height="520" fill="rgba(20,60,20,0.85)" rx="8" />
      {/* Grass stripes */}
      {Array.from({length:13},(_,i)=>(
        <rect key={i} x="0" y={i*40} width="340" height="20" fill="rgba(255,255,255,0.025)" />
      ))}
      {/* Pitch markings */}
      <rect x="15" y="15" width="310" height="490" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" rx="4"/>
      {/* Centre line */}
      <line x1="15" y1="260" x2="325" y2="260" stroke="rgba(255,255,255,.35)" strokeWidth="1.5"/>
      {/* Centre circle */}
      <circle cx="170" cy="260" r="50" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5"/>
      <circle cx="170" cy="260" r="3" fill="rgba(255,255,255,.5)"/>
      {/* Penalty areas */}
      <rect x="85" y="15" width="170" height="90" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5"/>
      <rect x="115" y="15" width="110" height="45" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1"/>
      <rect x="85" y="415" width="170" height="90" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5"/>
      <rect x="115" y="460" width="110" height="45" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1"/>
      {/* Goals */}
      <rect x="135" y="9" width="70" height="12" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"/>
      <rect x="135" y="499" width="70" height="12" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"/>
      {/* Penalty spots */}
      <circle cx="170" cy="80" r="2.5" fill="rgba(255,255,255,.5)"/>
      <circle cx="170" cy="440" r="2.5" fill="rgba(255,255,255,.5)"/>
    </svg>
  );
}

/* ── Formation-aware pitch positioning ───────────────────────────────── */

// Known formations — same dict as team detail page
const FORMATIONS: Record<string, string> = {
  arg:"4-3-3", bra:"4-2-3-1", fra:"4-3-3", ger:"4-2-3-1", esp:"4-3-3",
  eng:"4-2-3-1", por:"4-3-3", ned:"4-3-3", bel:"4-3-3", uru:"4-4-2",
  cro:"4-2-3-1", den:"4-3-3", usa:"4-3-3", mex:"4-3-3", mar:"4-3-3",
  jpn:"4-2-3-1", kor:"4-4-2", ksa:"4-3-3", sui:"3-4-3", pol:"4-3-3",
  sen:"4-3-3", civ:"4-3-3", nor:"4-3-3", can:"4-3-3", swe:"4-4-2",
  tur:"4-2-3-1", col:"4-2-3-1", ecu:"4-3-3", par:"4-3-3",
};

interface PitchPlayer {
  name: string; shortName: string; position: string;
  x: number; y: number; colour: string; photo?: string;
}

const LEGEND_PHOTOS_MATCH: Record<string, string> = {
  "lionel messi": "/legends/messi.png",
  "cristiano ronaldo": "/legends/ronaldo.jpg",
  "kylian mbappé": "/legends/mbappe.jpg", "kylian mbappe": "/legends/mbappe.jpg",
  "neymar": "/legends/neymar.jpg",
  "harry kane": "/legends/kane.jpg",
  "vinícius júnior": "/legends/vinicius.jpg", "vinicius junior": "/legends/vinicius.jpg",
  "jude bellingham": "/legends/bellingham.jpg",
  "mohamed salah": "/legends/salah.jpg",
  "luka modrić": "/legends/modric.jpg", "luka modric": "/legends/modric.jpg",
  "robert lewandowski": "/legends/lewandowski.jpg",
  "pedri": "/legends/pedri.jpg",
};

/** Even horizontal spread for N players: 12%–88% */
function xPositions(n: number): number[] {
  if (n === 1) return [50];
  return Array.from({ length: n }, (_, i) => 12 + (i / (n - 1)) * 76);
}

function buildPitchPositions(
  players: LineupPlayer[],
  isHome: boolean,
  colour: string,
  teamId: string,
): PitchPlayer[] {
  const formStr   = FORMATIONS[teamId] ?? "4-3-3";
  const lineCounts = formStr.split("-").map(Number); // e.g. [4,3,3] or [4,2,3,1]

  // Pull the first 11 likely starters, sorted by position priority
  const posOrder: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
  const starters = [...players]
    .filter(p => p.likelyStarter)
    .sort((a, b) => (posOrder[a.position] ?? 9) - (posOrder[b.position] ?? 9))
    .slice(0, 11);

  // Bucket players by position
  const gks  = starters.filter(p => p.position === "GK");
  const defs = starters.filter(p => p.position === "DEF");
  const mids = starters.filter(p => p.position === "MID");
  const fwds = starters.filter(p => p.position === "FWD");

  // Build ordered lines: [GK line, DEF line, ...MID sub-lines..., FWD line]
  const lines: LineupPlayer[][] = [];

  // GK
  lines.push(gks.slice(0, 1));

  // DEF line — lineCounts[0] players
  lines.push(defs.slice(0, lineCounts[0]));

  // Middle lines (everything between DEF and FWD counts)
  const midLineCounts = lineCounts.slice(1, -1); // e.g. [2,3] from 4-2-3-1
  let midUsed = 0;
  for (const count of midLineCounts) {
    lines.push(mids.slice(midUsed, midUsed + count));
    midUsed += count;
  }
  // Any remaining mids if formation only has one mid line (e.g. 4-3-3)
  if (midLineCounts.length === 0 && lineCounts.length > 2) {
    const midCount = lineCounts[1];
    lines.push(mids.slice(0, midCount));
  }

  // FWD line — last lineCounts entry
  lines.push(fwds.slice(0, lineCounts[lineCounts.length - 1]));

  // Remove empty lines
  const nonEmptyLines = lines.filter(l => l.length > 0);
  const totalLines = nonEmptyLines.length;

  const result: PitchPlayer[] = [];

  nonEmptyLines.forEach((line, lineIdx) => {
    // y: home team fills bottom half (GK near bottom edge), away fills top half
    const frac = lineIdx / Math.max(totalLines - 1, 1); // 0 = GK end, 1 = attacking end
    const y = isHome
      ? 91 - frac * 58   // 91% (GK) → 33% (forwards)
      :  9 + frac * 58;  //  9% (GK) → 67% (forwards)

    const xs = xPositions(line.length);

    line.forEach((p, i) => {
      const lastName = p.name.split(" ").slice(-1)[0] ?? p.name;
      const shortName = lastName.length > 8 ? lastName.slice(0, 7) + "." : lastName;
      result.push({
        name: p.name,
        shortName,
        position: p.position,
        x: xs[i],
        y,
        colour,
        photo: LEGEND_PHOTOS_MATCH[p.name.toLowerCase()],
      });
    });
  });

  return result;
}

/* ── Stat bar ────────────────────────────────────────────────────────── */
function StatBar({ stat }: { stat: StatRow }) {
  const hv = parseFloat(stat.home ?? "0") || 0;
  const av = parseFloat(stat.away ?? "0") || 0;
  const total = hv + av || 1;
  const homePct = (hv / total) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold" style={{ color:"var(--secondary)" }}>{stat.home ?? "—"}</span>
        <span className="opacity-50 text-[10px] uppercase tracking-widest" style={{ fontFamily:"var(--font-data)" }}>{stat.label}</span>
        <span className="font-bold" style={{ color:"rgba(148,163,184,0.9)" }}>{stat.away ?? "—"}</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-[rgba(35,41,60,0.8)]">
        <div className="h-full rounded-l-full transition-all" style={{ width:`${homePct}%`, background:"linear-gradient(90deg,#00e5ff,#0090c8)" }} />
        <div className="h-full flex-1 rounded-r-full" style={{ background:"rgba(148,163,184,0.3)" }} />
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */
interface PageProps { params: Promise<{ id: string }> }

export default async function MatchPage({ params }: PageProps) {
  const { id } = await params;
  const matchId = decodeURIComponent(id);

  let match: MatchDetail | null = null;
  let error: string | null = null;

  try {
    match = await apiClient.matchDetail(matchId);
  } catch (err) {
    error = err instanceof Error ? err.message : "Match not found";
  }

  if (error || !match) {
    return (
      <div className="space-y-4">
        <Link href="/fixtures" className="wc-eyebrow text-xs">← All Fixtures</Link>
        <div className="wc-error-panel rounded-2xl p-6">
          <p className="font-semibold">Match data unavailable</p>
          <p className="wc-body text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const isCompleted = match.status.toLowerCase().includes("full") || match.status === "final";
  const isLive      = match.status.toLowerCase().includes("live") || match.status.toLowerCase().includes("progress");
  const homeFlagSrc = match.home ? getTeamFlagSvgPath(match.home.fifaCode) : null;
  const awayFlagSrc = match.away ? getTeamFlagSvgPath(match.away.fifaCode) : null;

  // Build pitch players using real formations
  const homePitchPlayers = buildPitchPositions(match.homeLineup, true,  "#4cd7f6", match.home?.id ?? "");
  const awayPitchPlayers = buildPitchPositions(match.awayLineup, false, "#f87171", match.away?.id ?? "");
  const allPitchPlayers  = [...homePitchPlayers, ...awayPitchPlayers];

  // Separate key events: only meaningful ones
  const timelineEvents = match.keyEvents.filter(e => {
    const t = (e.eventType || "").toLowerCase();
    return t.includes("goal") || t.includes("card") || t.includes("sub") || t.includes("half");
  });

  const homeGoals = match.goals.filter(g => match.home && g.teamName?.toLowerCase().includes(match.home!.name.toLowerCase().split(" ")[0]));
  const awayGoals = match.goals.filter(g => match.away && g.teamName?.toLowerCase().includes(match.away!.name.toLowerCase().split(" ")[0]));

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/fixtures" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest transition-opacity hover:opacity-70" style={{ color:"var(--secondary)", fontFamily:"var(--font-data)" }}>
        ← All Fixtures
      </Link>

      {/* ── Match hero ─────────────────────────────────────────────── */}
      <section className="wc-panel relative overflow-hidden rounded-[28px] p-6 sm:p-8">
        <div className="pitch-lines" aria-hidden />
        <div className="stadium-glow" aria-hidden />

        <div className="relative z-10">
          {/* Stage + status */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="wc-pill rounded-full px-3 py-1 text-xs font-semibold">{stageLabel(match.stage)}</span>
            {isLive && (
              <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color:"#f87171" }}>
                <span className="live-dot" />LIVE
              </span>
            )}
            {isCompleted && <span className="text-xs font-semibold" style={{ color:"#4ade80" }}>✓ Full Time</span>}
          </div>

          {/* Score row */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            {/* Home */}
            <div className="flex items-center gap-4">
              {homeFlagSrc && (
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl" style={{ border:"1px solid rgba(255,255,255,0.1)" }}>
                  <Image src={homeFlagSrc} alt={match.home?.name ?? ""} width={96} height={64} className="h-full w-full object-cover" unoptimized />
                </div>
              )}
              <div>
                <p className="text-xl font-bold sm:text-2xl">{match.home?.name ?? "Home"}</p>
                {homeGoals.length > 0 && (
                  <p className="text-xs mt-1" style={{ color:"#4ade80" }}>
                    ⚽ {homeGoals.map(g => `${g.playerName} ${g.clock}`).join(", ")}
                  </p>
                )}
              </div>
            </div>

            {/* Score */}
            <div className="text-center">
              {isCompleted || isLive ? (
                <div className="score-board text-5xl sm:text-6xl" style={{ color:"#ffffff" }}>
                  {match.home?.score ?? "–"} <span style={{ color:"var(--foreground-muted)" }}>–</span> {match.away?.score ?? "–"}
                </div>
              ) : (
                <div>
                  <p className="wc-data-label text-xs">Kickoff</p>
                  <p className="text-xl font-bold mt-1">
                    {match.kickoffUtc ? new Date(match.kickoffUtc).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit", timeZone:"UTC", hour12:false }) : "TBD"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color:"var(--foreground-soft)" }}>
                    {match.kickoffUtc ? new Date(match.kickoffUtc).toLocaleDateString("en-US", { month:"short", day:"numeric", timeZone:"UTC" }) : ""}
                  </p>
                </div>
              )}
              {match.venue && <p className="text-xs mt-2" style={{ color:"var(--foreground-soft)" }}>📍 {match.venue}</p>}
            </div>

            {/* Away */}
            <div className="flex items-center justify-end gap-4">
              <div className="text-right">
                <p className="text-xl font-bold sm:text-2xl">{match.away?.name ?? "Away"}</p>
                {awayGoals.length > 0 && (
                  <p className="text-xs mt-1" style={{ color:"#f87171" }}>
                    ⚽ {awayGoals.map(g => `${g.playerName} ${g.clock}`).join(", ")}
                  </p>
                )}
              </div>
              {awayFlagSrc && (
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl" style={{ border:"1px solid rgba(255,255,255,0.1)" }}>
                  <Image src={awayFlagSrc} alt={match.away?.name ?? ""} width={96} height={64} className="h-full w-full object-cover" unoptimized />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Main content grid ───────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

        {/* LEFT: Pitch + Lineups ─────────────────────────────────── */}
        <div className="space-y-4">
          {/* Pitch */}
          <div className="wc-panel rounded-2xl p-4">
            {/* Formation badges */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color:"#4cd7f6" }}>{match.home?.name}</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background:"rgba(76,215,246,0.12)", color:"#4cd7f6", border:"1px solid rgba(76,215,246,0.3)" }}>
                  {FORMATIONS[match.home?.id ?? ""] ?? "4-3-3"}
                </span>
              </div>
              <span className="wc-data-label text-[10px]">Predicted XI</span>
              <div className="flex items-center gap-2">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background:"rgba(248,113,113,0.12)", color:"#f87171", border:"1px solid rgba(248,113,113,0.3)" }}>
                  {FORMATIONS[match.away?.id ?? ""] ?? "4-3-3"}
                </span>
                <span className="text-xs font-bold" style={{ color:"#f87171" }}>{match.away?.name}</span>
              </div>
            </div>

            <div className="relative mx-auto overflow-hidden rounded-xl" style={{ maxWidth:360, height:540 }}>
              <PitchSVG />

              {/* Player tokens */}
              {allPitchPlayers.map((p, i) => (
                <div key={i} style={{
                  position:"absolute",
                  left:`${p.x}%`, top:`${p.y}%`,
                  transform:"translate(-50%,-50%)",
                  textAlign:"center",
                  zIndex:5,
                  width:46,
                }}>
                  {/* Circle / photo */}
                  <div style={{
                    width:34, height:34, borderRadius:"50%",
                    background: p.photo ? "transparent" : p.colour + "30",
                    border:`2px solid ${p.colour}`,
                    margin:"0 auto 2px",
                    overflow:"hidden",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    boxShadow:`0 0 10px ${p.colour}60, 0 2px 8px rgba(0,0,0,0.7)`,
                    position:"relative",
                  }}>
                    {p.photo ? (
                      <Image src={p.photo} alt={p.name} fill className="object-cover object-top" unoptimized />
                    ) : (
                      <span style={{ fontSize:9, color:p.colour, fontWeight:800, fontFamily:"var(--font-data)" }}>
                        {p.position}
                      </span>
                    )}
                  </div>
                  {/* Name */}
                  <p style={{
                    fontSize:7.5,
                    color:"#fff",
                    textShadow:"0 1px 6px rgba(0,0,0,0.95), 0 0 4px rgba(0,0,0,1)",
                    lineHeight:1.2,
                    fontWeight:700,
                    letterSpacing:"0.01em",
                    maxWidth:46,
                    margin:"0 auto",
                  }}>
                    {p.shortName}
                  </p>
                </div>
              ))}

              {/* Home label top */}
              <div style={{ position:"absolute", top:6, left:0, right:0, textAlign:"center", zIndex:6 }}>
                <span style={{ fontSize:8, color:"rgba(76,215,246,.75)", fontFamily:"var(--font-data)", letterSpacing:"0.14em", textTransform:"uppercase", background:"rgba(0,0,0,.4)", padding:"1px 6px", borderRadius:4 }}>
                  {match.home?.name}
                </span>
              </div>
              {/* Away label bottom */}
              <div style={{ position:"absolute", bottom:6, left:0, right:0, textAlign:"center", zIndex:6 }}>
                <span style={{ fontSize:8, color:"rgba(248,113,113,.75)", fontFamily:"var(--font-data)", letterSpacing:"0.14em", textTransform:"uppercase", background:"rgba(0,0,0,.4)", padding:"1px 6px", borderRadius:4 }}>
                  {match.away?.name}
                </span>
              </div>
            </div>

            {/* Squad lists below pitch */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
              <div>
                <p className="wc-data-label text-[10px] mb-2" style={{ color:"var(--secondary)" }}>{match.home?.name} Squad</p>
                <div className="space-y-1">
                  {match.homeLineup.filter(p => p.likelyStarter).slice(0,11).map((p,i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-6 text-center rounded text-[9px] font-bold" style={{ background:"rgba(0,229,255,.12)", color:"var(--secondary)" }}>{p.position}</span>
                      <span className="truncate">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="wc-data-label text-[10px] mb-2" style={{ color:"#f87171" }}>{match.away?.name} Squad</p>
                <div className="space-y-1">
                  {match.awayLineup.filter(p => p.likelyStarter).slice(0,11).map((p,i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-6 text-center rounded text-[9px] font-bold" style={{ background:"rgba(248,113,113,.12)", color:"#f87171" }}>{p.position}</span>
                      <span className="truncate">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Events + Stats ─────────────────────────────────── */}
        <div className="space-y-4">

          {/* Match stats */}
          {match.stats.length > 0 && (
            <div className="wc-panel rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="wc-data-label text-[10px]" style={{ color:"var(--secondary)" }}>{match.home?.name}</span>
                <span className="wc-data-label text-[10px]">Match Stats</span>
                <span className="wc-data-label text-[10px]" style={{ color:"rgba(148,163,184,0.8)" }}>{match.away?.name}</span>
              </div>
              {match.stats.map((s, i) => <StatBar key={i} stat={s} />)}
            </div>
          )}

          {/* Event timeline */}
          {timelineEvents.length > 0 && (
            <div className="wc-panel rounded-2xl p-4">
              <p className="wc-data-label text-[10px] mb-4" style={{ color:"var(--secondary)" }}>
                Match Timeline
              </p>
              <StaggerList className="space-y-2">
                {timelineEvents.map((ev, i) => {
                  const goal = isGoal(ev.eventType);
                  const col  = eventColour(ev.eventType);
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl px-3 py-2.5"
                      style={{
                        background: goal ? "rgba(74,222,128,0.06)" : "rgba(35,41,60,0.5)",
                        border: goal ? "1px solid rgba(74,222,128,0.2)" : "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      {/* Clock */}
                      <span className="shrink-0 w-9 text-right text-xs font-bold tabular-nums" style={{ color: col, fontFamily:"var(--font-data)" }}>
                        {ev.clock ?? ""}
                      </span>
                      {/* Icon */}
                      <span className="shrink-0 text-sm">{eventIcon(ev.eventType)}</span>
                      {/* Text */}
                      <div className="min-w-0 flex-1">
                        {ev.playerName && (
                          <p className="text-xs font-semibold truncate">{ev.playerName}</p>
                        )}
                        <p className="text-xs leading-relaxed" style={{ color:"var(--foreground-muted)" }}>
                          {ev.text ?? ev.eventType}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </StaggerList>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
