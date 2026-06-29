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

/* ── Position layout ─────────────────────────────────────────────────── */
const POSITION_ROWS: Record<string, number[]> = {
  // y positions (0–100% of half) for each position tier
  GK:  [50],
  DEF: [18, 33, 50, 67, 82],
  MID: [20, 40, 60, 80],
  FWD: [25, 50, 75],
};

interface PitchPlayer {
  name: string; position: string; jersey?: number;
  x: number; y: number; colour: string;
}

function buildPitchPositions(players: LineupPlayer[], isHome: boolean, colour: string): PitchPlayer[] {
  const starters = players.filter(p => p.likelyStarter).slice(0, 11);
  // Group by position
  const byPos: Record<string, LineupPlayer[]> = { GK:[], DEF:[], MID:[], FWD:[] };
  for (const p of starters) {
    const pos = p.position.toUpperCase().slice(0, 3);
    const key = ["GK","DEF","MID","FWD"].includes(pos) ? pos : "MID";
    byPos[key].push(p);
  }

  const result: PitchPlayer[] = [];
  const tiers = isHome ? ["FWD","MID","DEF","GK"] : ["GK","DEF","MID","FWD"];
  const yTier = isHome
    ? { GK: 92, DEF: 76, MID: 60, FWD: 44 }
    : { GK:  8, DEF: 24, MID: 40, FWD: 56 };

  for (const tier of tiers) {
    const group = byPos[tier];
    if (!group.length) continue;
    const n = group.length;
    group.forEach((p, i) => {
      const x = n === 1 ? 50 : 10 + ((i / (n - 1)) * 80);
      result.push({ name: p.name.split(" ").pop()!, position: tier, x, y: yTier[tier as keyof typeof yTier], colour });
    });
  }
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

  // Build pitch players
  const homePitchPlayers = buildPitchPositions(match.homeLineup, true, "#00e5ff");
  const awayPitchPlayers = buildPitchPositions(match.awayLineup, false, "#f87171");
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
            <p className="wc-data-label text-xs font-semibold mb-4">
              Predicted Lineups · Pitch View
            </p>
            <div className="relative mx-auto" style={{ maxWidth:340, height:520 }}>
              <PitchSVG />
              {/* Players */}
              {allPitchPlayers.map((p, i) => (
                <div key={i} style={{
                  position:"absolute",
                  left:`${p.x}%`, top:`${p.y}%`,
                  transform:"translate(-50%,-50%)",
                  textAlign:"center",
                  zIndex:5,
                }}>
                  <div style={{
                    width:28, height:28, borderRadius:"50%",
                    background:p.colour + "25",
                    border:`2px solid ${p.colour}`,
                    margin:"0 auto 2px",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:8, color:"#fff", fontWeight:700,
                    boxShadow:`0 0 8px ${p.colour}60`,
                  }}>
                    {p.position[0]}
                  </div>
                  <p style={{ fontSize:8, color:"#fff", textShadow:"0 1px 4px rgba(0,0,0,0.9)", maxWidth:48, lineHeight:1.2, margin:"0 auto", fontWeight:600 }}>
                    {p.name.length > 9 ? p.name.slice(0,9) + "." : p.name}
                  </p>
                </div>
              ))}
              {/* Labels */}
              <div style={{ position:"absolute", top:4, left:0, right:0, textAlign:"center" }}>
                <span style={{ fontSize:9, color:"rgba(0,229,255,.7)", fontFamily:"var(--font-data)", letterSpacing:"0.1em" }}>{match.home?.name ?? "HOME"}</span>
              </div>
              <div style={{ position:"absolute", bottom:4, left:0, right:0, textAlign:"center" }}>
                <span style={{ fontSize:9, color:"rgba(248,113,113,.7)", fontFamily:"var(--font-data)", letterSpacing:"0.1em" }}>{match.away?.name ?? "AWAY"}</span>
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
