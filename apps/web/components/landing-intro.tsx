"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const GlobeWrapper = dynamic(
  () => import("@/components/globe-wrapper").then((m) => ({ default: m.GlobeWrapper })),
  { ssr: false }
);

/* ─── Audio (HTML5) ────────────────────────────────────────────────────── */
function useAudio() {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);

  const start = useCallback(() => {
    if (started) return;
    setStarted(true);
    const a = new Audio("/audio/wc_anthem.mp3");
    a.loop = true; a.volume = 0.6;
    ref.current = a;
    a.play().catch(() => {});
  }, [started]);

  const toggle = useCallback(() => {
    if (!started) { start(); setMuted(false); return; }
    if (ref.current) { ref.current.muted = !ref.current.muted; setMuted(ref.current.muted); }
  }, [started, start]);

  const stop = useCallback(() => { ref.current?.pause(); }, []);

  useEffect(() => () => { ref.current?.pause(); }, []);
  return { muted, started, start, toggle, stop };
}

/* ─── Phase machine ────────────────────────────────────────────────────── */
// 0 → black   1 → year-flash   2 → stadium-bg   3 → legend-bar
// 4 → big-text  5 → 2026   6 → globe   7 → brand   8 → cta   9 → exit
type Phase = 0|1|2|3|4|5|6|7|8|9;

const TIMING: Record<number,number> = {
  0:0, 1:300, 2:1100, 3:2200, 4:3400, 5:5000, 6:6400, 7:7800, 8:9200
};

/* ─── Cycling bg images ────────────────────────────────────────────────── */
const BKGS = ["/images/stadium1.jpg","/images/crowd1.jpg","/images/stadium_night.jpg","/images/stadium2.jpg"];

/* ─── Reusable char-by-char reveal ────────────────────────────────────── */
function Reveal({
  text, delay=0, className="", style={}
}: {
  text:string; delay?:number; className?:string; style?:React.CSSProperties
}) {
  return (
    <span className={className} style={{ display:"inline-block", ...style }}>
      {text.split("").map((ch,i) => (
        <span
          key={i}
          style={{
            display:"inline-block",
            animation:`charUp .4s cubic-bezier(.16,1,.3,1) ${delay + i*42}ms both`,
          }}
        >
          {ch===" " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

/* ─── Main ─────────────────────────────────────────────────────────────── */
export function LandingIntro({ onEnter }: { onEnter:()=>void }) {
  const [phase, setPhase] = useState<Phase>(0);
  const [bgIdx, setBgIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const audio = useAudio();

  /* advance phase */
  const advance = useCallback((next:Phase) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase(next);
    if (next < 8) {
      const nn = (next+1) as Phase;
      const delay = TIMING[nn] - TIMING[next];
      timerRef.current = setTimeout(() => advance(nn), delay);
    }
  }, []);

  useEffect(() => {
    timerRef.current = setTimeout(() => advance(1), TIMING[1]);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [advance]);

  /* cycle bg every 5 s from phase 2 */
  useEffect(() => {
    if (phase < 2) return;
    const id = setInterval(() => setBgIdx(i => (i+1) % BKGS.length), 5000);
    return () => clearInterval(id);
  }, [phase]);

  const handleEnter = useCallback(() => {
    sessionStorage.setItem("wciq_intro_seen","1");
    setPhase(9);
    audio.stop();
    setTimeout(onEnter, 800);
  }, [onEnter, audio]);

  const vis = (n:Phase) => phase >= n;

  return (
    <>
      <style>{`
        /* ── Global keyframes ── */
        @keyframes charUp {
          from { opacity:0; transform:translateY(28px) scale(.9); filter:blur(6px); }
          to   { opacity:1; transform:none; filter:none; }
        }
        @keyframes slamDown {
          0%   { opacity:0; transform:translateY(-80px) scale(1.4); filter:blur(20px); }
          60%  { transform:translateY(6px) scale(.97); }
          100% { opacity:1; transform:none; filter:none; }
        }
        @keyframes yearCrash {
          0%   { opacity:0; transform:scale(4) rotate(-3deg); filter:blur(30px); }
          55%  { transform:scale(.95) rotate(.5deg); }
          100% { opacity:1; transform:scale(1) rotate(0); filter:none; }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:none; }
        }
        @keyframes fadeIn {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes pulseCTA {
          0%,100% { box-shadow:0 0 0 0 rgba(211,243,64,0), 0 0 48px rgba(211,243,64,.4); }
          50%      { box-shadow:0 0 0 20px rgba(211,243,64,0), 0 0 90px rgba(211,243,64,.8); }
        }
        @keyframes bgFade {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes scanH {
          from { transform:translateX(-100%); }
          to   { transform:translateX(100vw); }
        }
        @keyframes chromaShift {
          0%   { text-shadow:4px 0 0 rgba(255,0,0,.7),-4px 0 0 rgba(0,255,255,.7); }
          50%  { text-shadow:-3px 0 0 rgba(255,0,0,.5), 3px 0 0 rgba(0,255,255,.5); }
          100% { text-shadow:2px 0 0 rgba(255,0,0,.6),-2px 0 0 rgba(0,255,255,.6); }
        }
        @keyframes introExit {
          from { opacity:1; transform:scale(1); }
          to   { opacity:0; transform:scale(1.06); }
        }
        @keyframes barSlide {
          from { transform:scaleX(0); transform-origin:left; }
          to   { transform:scaleX(1); transform-origin:left; }
        }
        @keyframes spotPulse {
          0%,100% { opacity:.5; height:55vh; }
          50%      { opacity:1; height:65vh; }
        }
      `}</style>

      {/* ── Root overlay ─────────────────────────────────────────────── */}
      <div
        onClick={vis(8) ? handleEnter : audio.start}
        style={{
          position:"fixed", inset:0, zIndex:9999,
          background:"#000",
          overflow:"hidden",
          cursor: vis(8) ? "pointer" : "default",
          animation: phase===9 ? "introExit .8s ease forwards" : undefined,
        }}
      >

        {/* ── Stadium background ─────────────────────────────────────── */}
        {vis(2) && (
          <div
            key={bgIdx}
            style={{
              position:"absolute", inset:0,
              backgroundImage:`url(${BKGS[bgIdx]})`,
              backgroundSize:"cover", backgroundPosition:"center",
              animation:"bgFade 1.8s ease both",
            }}
          />
        )}

        {/* ── Master dark overlay — always present, never transparent ── */}
        <div style={{
          position:"absolute", inset:0,
          background: vis(2)
            ? "linear-gradient(180deg,rgba(0,0,0,.88) 0%,rgba(0,0,0,.78) 50%,rgba(0,0,0,.95) 100%)"
            : "#000",
          transition:"background 1.2s ease",
        }} />

        {/* ── Scanline CRT texture ──────────────────────────────────── */}
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none",
          background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.12) 2px,rgba(0,0,0,.12) 4px)",
          opacity:.6,
        }} />

        {/* ── Spotlight beams (phase 1) ─────────────────────────────── */}
        {vis(1) && [0,1,2,3].map(i => (
          <div key={i} style={{
            position:"absolute", top:0,
            left:`${16 + i*23}%`,
            width:"2px", height:"60vh",
            transformOrigin:"top center",
            background:"linear-gradient(180deg,rgba(255,255,200,.95),transparent)",
            filter:"blur(8px)",
            animation:`spotPulse 2.5s ease infinite ${i*280}ms, fadeIn .8s ease ${i*200}ms both`,
            opacity:.5,
          }} />
        ))}

        {/* ── Horizontal scan flash (phase 2) ──────────────────────── */}
        {vis(2) && (
          <div style={{
            position:"absolute", top:"46%", left:0,
            width:"200px", height:"2px",
            background:"linear-gradient(90deg,transparent,rgba(0,229,255,.9),transparent)",
            animation:"scanH 1.2s cubic-bezier(.4,0,.2,1) .2s both",
            boxShadow:"0 0 20px rgba(0,229,255,.6)",
          }} />
        )}

        {/* ── Letterbox bars ────────────────────────────────────────── */}
        {vis(3) && (
          <>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:"8vh", background:"#000", animation:"fadeIn .5s ease both" }} />
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"8vh", background:"#000", animation:"fadeIn .5s ease both" }} />
          </>
        )}

        {/* ── LEGEND BAR (phase 3) — "THE FINAL CHAPTER" ───────────── */}
        {vis(3) && (
          <div style={{
            position:"absolute", top:"8vh", left:0, right:0,
            padding:"10px 32px",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            animation:"fadeUp .7s ease both",
          }}>
            <span style={{
              fontFamily:"var(--font-data)", fontSize:10, letterSpacing:"0.35em",
              textTransform:"uppercase", color:"#ff007f",
              textShadow:"0 0 20px rgba(255,0,127,.9), 0 0 40px rgba(255,0,127,.6)",
            }}>
              🐐 The Final Chapter
            </span>
            <span style={{
              fontFamily:"var(--font-data)", fontSize:10, letterSpacing:"0.25em",
              textTransform:"uppercase", color:"rgba(0,229,255,.8)",
              textShadow:"0 0 16px rgba(0,229,255,.8)",
            }}>
              Jun 11 – Jul 19, 2026 · USA 🇺🇸 Canada 🇨🇦 Mexico 🇲🇽
            </span>
          </div>
        )}

        {/* ── Main content stack ─────────────────────────────────────── */}
        <div style={{
          position:"absolute", inset:"8vh 0",
          display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          gap:"clamp(10px,2.2vh,24px)",
          padding:"0 24px",
        }}>

          {/* FIFA WORLD CUP — phase 4 ─────────────────────────────── */}
          {vis(4) && (
            <div style={{ textAlign:"center", lineHeight:1 }}>
              {/* Eyebrow */}
              <div style={{
                fontFamily:"var(--font-data)", fontSize:"clamp(10px,1.2vw,14px)",
                letterSpacing:"0.5em", textTransform:"uppercase", marginBottom:"0.6em",
                color:"#00e5ff",
                textShadow:"0 0 30px rgba(0,229,255,1), 0 0 60px rgba(0,229,255,.6)",
                animation:"fadeUp .6s ease both",
              }}>
                ⚽ Messi · Ronaldo · The Last Dance ⚽
              </div>

              {/* FIFA WORLD CUP — pure solid white + strong shadow */}
              <div style={{
                fontFamily:"var(--font-display)",
                fontSize:"clamp(32px,6.2vw,88px)",
                fontWeight:900,
                letterSpacing:"0.14em",
                textTransform:"uppercase",
                lineHeight:1,
                /* solid white — never invisible */
                color:"#ffffff",
                textShadow:[
                  /* chromatic aberration */
                  "4px 0 0 rgba(255,0,80,.75)",
                  "-4px 0 0 rgba(0,229,255,.75)",
                  /* depth glow */
                  "0 0 8px rgba(255,255,255,1)",
                  "0 0 30px rgba(180,220,255,.9)",
                  "0 0 80px rgba(100,180,255,.6)",
                  /* hard black outline for contrast */
                  "0 4px 0 rgba(0,0,0,1)",
                  "0 8px 20px rgba(0,0,0,1)",
                ].join(","),
                animation:"slamDown .7s cubic-bezier(.16,1,.3,1) both, chromaShift 3s ease infinite .8s",
              }}>
                FIFA WORLD CUP
              </div>
            </div>
          )}

          {/* 2026 — phase 5 ───────────────────────────────────────── */}
          {vis(5) && (
            <div style={{
              fontFamily:"var(--font-display)",
              fontSize:"clamp(80px,20vw,260px)",
              fontWeight:900, lineHeight:.85, letterSpacing:"0.1em",
              color:"#d3f340",
              textShadow:[
                "0 0 4px #fff9a0",
                "0 0 20px #d3f340",
                "0 0 60px rgba(211,243,64,.9)",
                "0 0 120px rgba(211,243,64,.7)",
                "0 0 200px rgba(180,220,0,.5)",
                "0 6px 0 rgba(0,0,0,1)",
                "0 12px 28px rgba(0,0,0,.9)",
              ].join(","),
              animation:"yearCrash .85s cubic-bezier(.22,1.36,.4,1) both",
            }}>
              2026
            </div>
          )}

          {/* 3D Globe — phase 6 ───────────────────────────────────── */}
          {vis(6) && (
            <div style={{
              width:"clamp(140px,20vw,240px)",
              height:"clamp(140px,20vw,240px)",
              animation:"slamDown .9s cubic-bezier(.22,1.36,.4,1) both",
            }}>
              <GlobeWrapper />
            </div>
          )}

          {/* WorldCupIQ brand — phase 7 ───────────────────────────── */}
          {vis(7) && (
            <div style={{ textAlign:"center" }}>
              <div style={{
                fontFamily:"var(--font-display)",
                fontSize:"clamp(34px,5.2vw,70px)",
                fontWeight:800, letterSpacing:"-0.01em", lineHeight:1,
              }}>
                {/* WorldCup — electric white-cyan */}
                <span style={{
                  color:"#ffffff",
                  textShadow:[
                    "0 0 4px rgba(255,255,255,1)",
                    "0 0 20px rgba(0,229,255,1)",
                    "0 0 55px rgba(0,200,255,.8)",
                    "0 4px 0 rgba(0,0,0,1)",
                    "0 8px 18px rgba(0,0,0,.9)",
                  ].join(","),
                }}>
                  <Reveal text="WorldCup" delay={0} />
                </span>
                {/* IQ — hot lime */}
                <span style={{
                  color:"#d3f340",
                  textShadow:[
                    "0 0 4px #fffb80",
                    "0 0 20px #d3f340",
                    "0 0 55px rgba(211,243,64,.9)",
                    "0 4px 0 rgba(0,0,0,1)",
                    "0 8px 18px rgba(0,0,0,.9)",
                  ].join(","),
                }}>
                  <Reveal text="IQ" delay={480} />
                </span>
              </div>

              {/* tagline */}
              <p style={{
                fontFamily:"var(--font-data)", fontSize:"clamp(10px,1.2vw,14px)",
                letterSpacing:"0.38em", textTransform:"uppercase", marginTop:"0.7em",
                color:"#00e5ff",
                textShadow:"0 0 18px rgba(0,229,255,1)",
                animation:"fadeUp .6s ease .4s both",
              }}>
                Intelligence · Analytics · Predictions
              </p>
            </div>
          )}

          {/* Tagline / subtitle — phase 7 ─────────────────────────── */}
          {vis(7) && (
            <p style={{
              fontFamily:"var(--font-body)",
              fontSize:"clamp(13px,1.4vw,17px)",
              fontWeight:500,
              color:"#f0f8ff",
              textAlign:"center", maxWidth:500, lineHeight:1.7,
              textShadow:"0 2px 12px rgba(0,0,0,1), 0 0 30px rgba(0,0,0,.9)",
              animation:"fadeUp .8s ease .2s both",
              padding:"0 16px",
            }}>
              48 nations.{" "}
              <strong style={{ color:"#d3f340", textShadow:"0 0 14px rgba(211,243,64,.9)" }}>
                104 matches.
              </strong>{" "}
              One prediction engine.
              <br />
              <span style={{ color:"rgba(180,230,255,.85)" }}>
                Live data from the tournament, minute by minute.
              </span>
            </p>
          )}

          {/* Enter CTA — phase 8 ──────────────────────────────────── */}
          {vis(8) && (
            <button
              onClick={(e) => { e.stopPropagation(); handleEnter(); }}
              style={{
                marginTop:12,
                padding:"18px 68px",
                fontSize:"clamp(14px,1.5vw,18px)",
                fontFamily:"var(--font-display)", fontWeight:800,
                letterSpacing:"0.22em", textTransform:"uppercase",
                color:"#000",
                background:"linear-gradient(135deg,#f0ff70,#d3f340 40%,#aacc1a)",
                border:"2px solid rgba(255,255,255,.35)",
                borderRadius:9999,
                cursor:"pointer",
                animation:"slamDown .6s cubic-bezier(.22,1.36,.4,1) both, pulseCTA 2s ease .6s infinite",
                transition:"transform .2s, filter .2s",
                boxShadow:"0 0 40px rgba(211,243,64,.55), 0 8px 28px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.4)",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform="scale(1.07)"; (e.currentTarget as HTMLElement).style.filter="brightness(1.2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform="scale(1)"; (e.currentTarget as HTMLElement).style.filter="brightness(1)"; }}
            >
              ⚡ Enter the IQ →
            </button>
          )}
        </div>

        {/* ── Image filmstrip — phase 7 ─────────────────────────────── */}
        {vis(7) && (
          <div style={{
            position:"absolute", bottom:"8vh", left:0, right:0,
            height:"clamp(55px,9vh,80px)",
            display:"flex", gap:3, overflow:"hidden",
            animation:"fadeUp .9s ease .3s both",
          }}>
            {["/images/players_action.jpg","/images/trophy1.jpg","/images/ball_field.jpg","/images/football1.jpg"].map((src,i) => (
              <div key={i} style={{
                flex:1,
                backgroundImage:`url(${src})`,
                backgroundSize:"cover", backgroundPosition:"center",
                opacity:.45, filter:"saturate(.55)",
              }} />
            ))}
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,#000 0%,transparent 12%,transparent 88%,#000 100%)" }} />
          </div>
        )}

        {/* ── Bottom accent line ─────────────────────────────────────── */}
        {vis(3) && (
          <div style={{
            position:"absolute", bottom:"8vh", left:0, right:0,
            height:"1px",
            background:"linear-gradient(90deg,transparent,#ff007f,#00e5ff,#d3f340,#00e5ff,#ff007f,transparent)",
            animation:"barSlide .8s ease .2s both",
            opacity:.6,
          }} />
        )}

        {/* ── Controls ──────────────────────────────────────────────── */}
        <div style={{
          position:"absolute",
          bottom:"calc(8vh + 14px)",
          right:20,
          display:"flex", gap:8, zIndex:10,
        }}>
          <button
            onClick={e => { e.stopPropagation(); audio.toggle(); }}
            style={{
              background:"rgba(0,0,0,.55)", border:"1px solid rgba(255,255,255,.2)",
              borderRadius:9999, color:"#fff", padding:"6px 14px",
              fontSize:11, cursor:"pointer",
              fontFamily:"var(--font-data)", letterSpacing:"0.1em",
              backdropFilter:"blur(12px)",
            }}
          >
            {!audio.started ? "▶ MUSIC" : audio.muted ? "🔇 MUTED" : "🔊 ON"}
          </button>

          {phase >= 2 && (
            <button
              onClick={e => { e.stopPropagation(); handleEnter(); }}
              style={{
                background:"rgba(0,0,0,.55)", border:"1px solid rgba(255,255,255,.15)",
                borderRadius:9999, color:"rgba(255,255,255,.5)",
                padding:"6px 14px", fontSize:11, cursor:"pointer",
                fontFamily:"var(--font-data)", letterSpacing:"0.1em",
                backdropFilter:"blur(12px)",
              }}
            >
              SKIP ▶
            </button>
          )}
        </div>

        {/* ── Progress dots ─────────────────────────────────────────── */}
        {vis(3) && (
          <div style={{
            position:"absolute",
            bottom:"calc(8vh + 18px)",
            left:"50%", transform:"translateX(-50%)",
            display:"flex", gap:5,
          }}>
            {[1,2,3,4,5,6,7,8].map(p => (
              <div key={p} style={{
                width: p <= phase ? 18 : 5,
                height:3, borderRadius:2,
                background: p <= phase ? "#d3f340" : "rgba(255,255,255,.2)",
                transition:"all .4s ease",
                boxShadow: p <= phase ? "0 0 8px rgba(211,243,64,.7)" : undefined,
              }} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
