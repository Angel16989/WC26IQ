"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const GlobeWrapper = dynamic(
  () => import("@/components/globe-wrapper").then((m) => ({ default: m.GlobeWrapper })),
  { ssr: false }
);

/* ══════════════════════════════════════════════════════════════════════
   WEB AUDIO — cinematic sound engine
   heartbeat in early phases, bass boom + crowd rise on 2026 reveal
   ══════════════════════════════════════════════════════════════════════ */
function buildAudioEngine() {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0.75;
  master.connect(ctx.destination);

  function sineBurst(freq: number, when: number, dur: number, vol = 1) {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, when);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.35, when + dur);
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(g); g.connect(master);
    osc.start(when); osc.stop(when + dur + 0.05);
  }

  function noiseBurst(when: number, dur: number, vol = 0.4) {
    const buf  = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass"; lpf.frequency.value = 160;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    src.connect(lpf); lpf.connect(g); g.connect(master);
    src.start(when); src.stop(when + dur + 0.05);
  }

  function brass(freq: number, when: number, dur: number, vol = 0.4) {
    [1, 2, 3, 5].forEach((h) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.value = freq * h;
      o.detune.value = (Math.random() - 0.5) * 12;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(vol / h, when + 0.06);
      g.gain.setValueAtTime(vol / h, when + dur - 0.08);
      g.gain.linearRampToValueAtTime(0, when + dur);
      o.connect(g); g.connect(master);
      o.start(when); o.stop(when + dur + 0.05);
    });
  }

  function crowdRise(when: number, dur: number) {
    for (let i = 0; i < 12; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 180 + Math.random() * 700;
      o.frequency.linearRampToValueAtTime(600 + Math.random() * 900, when + dur);
      g.gain.setValueAtTime(0, when + i * 0.04);
      g.gain.linearRampToValueAtTime(0.05, when + dur * 0.6);
      g.gain.linearRampToValueAtTime(0.1, when + dur);
      o.connect(g); g.connect(master);
      o.start(when + i * 0.04); o.stop(when + dur + 0.1);
    }
  }

  function playCinemaScore() {
    const t = ctx.currentTime + 0.05;

    // Phase 0-1: heartbeat × 4 (every ~1.2 s)
    for (let i = 0; i < 4; i++) {
      sineBurst(58,  t + i * 1.2,        0.30, 0.9);
      sineBurst(52,  t + i * 1.2 + 0.32, 0.22, 0.7);
    }

    // Phase 2-3: single low drone
    sineBurst(36, t + 4.8, 2.5, 0.35);

    // Phase 3: year-montage impacts (rapid noise bursts)
    [5.8, 6.1, 6.4, 6.7, 7.0, 7.3].forEach((d) => noiseBurst(t + d, 0.08, 0.55));

    // Phase 4: tension riser
    sineBurst(90, t + 7.6, 1.8, 0.25);
    sineBurst(130, t + 8.4, 1.5, 0.2);

    // Phase 5: FIFA WORLD CUP slam
    noiseBurst(t + 9.5, 0.15, 0.8);
    sineBurst(70, t + 9.5, 0.8, 1.1);
    brass(146.83, t + 9.8, 0.9);
    brass(174.61, t + 10.4, 0.9);

    // Phase 6: 2026 MEGA BOOM
    noiseBurst(t + 11.2, 0.18, 1.0);
    sineBurst(42, t + 11.2, 1.6, 1.5);   // sub-bass earthquake
    sineBurst(28, t + 11.25, 2.0, 1.2);  // deep rumble
    brass(261.63, t + 11.4, 1.2, 0.7);
    brass(329.63, t + 11.9, 1.0, 0.6);
    crowdRise(t + 12.0, 4.0);

    // Phase 7-8: triumphant brass resolve
    [261.63, 329.63, 392.00, 523.25].forEach((f, i) => {
      brass(f, t + 14.5, 2.5, 0.4 - i * 0.06);
    });
    sineBurst(50, t + 14.5, 2.8, 0.5);
  }

  return { playCinemaScore, ctx };
}

/* ══════════════════════════════════════════════════════════════════════
   HTML5 MUSIC — starts on first click
   ══════════════════════════════════════════════════════════════════════ */
function useMusic() {
  const ref      = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<ReturnType<typeof buildAudioEngine> | null>(null);
  const [muted,   setMuted]   = useState(false);
  const [started, setStarted] = useState(false);

  const start = useCallback(() => {
    if (started) return;
    setStarted(true);
    // Synth score
    try {
      synthRef.current = buildAudioEngine();
      synthRef.current.playCinemaScore();
    } catch {}
    // MP3 anthem (delayed to let synth intro breathe)
    setTimeout(() => {
      const a = new Audio("/audio/wc_anthem.mp3");
      a.loop = true; a.volume = 0.45;
      ref.current = a;
      a.play().catch(() => {});
    }, 7000);
  }, [started]);

  const toggle = useCallback(() => {
    if (!started) { start(); return; }
    const next = !muted;
    setMuted(next);
    if (ref.current)                  ref.current.muted            = next;
    if (synthRef.current)             synthRef.current.ctx.suspend().catch(() => {});
    if (!next && synthRef.current)    synthRef.current.ctx.resume().catch(() => {});
  }, [started, muted, start]);

  const stop = useCallback(() => {
    ref.current?.pause();
    try { synthRef.current?.ctx.close(); } catch {}
  }, []);

  useEffect(() => () => { stop(); }, [stop]);
  return { muted, started, start, toggle, stop };
}

/* ══════════════════════════════════════════════════════════════════════
   PHASE MACHINE
   0 black | 1 heartbeat-text | 2 legends-card | 3 year-montage
   4 tension | 5 fifa-text | 6 2026 | 7 globe | 8 brand | 9 cta | 10 exit
   ══════════════════════════════════════════════════════════════════════ */
type Phase = 0|1|2|3|4|5|6|7|8|9|10;
const TIMING: Record<number, number> = {
  0: 0, 1: 600, 2: 2200, 3: 4000, 4: 6400, 5: 8000,
  6: 9800, 7: 11400, 8: 12800, 9: 14200,
};

/* ── Cycling backgrounds ─────────────────────────────────────────────── */
const BKGS = [
  "/images/stadium1.jpg", "/images/crowd1.jpg",
  "/images/stadium_night.jpg", "/images/stadium2.jpg",
  "/images/pitch1.jpg",
];

/* ── WC years for montage ────────────────────────────────────────────── */
const YEARS = ["1986","1990","1994","1998","2002","2006","2010","2014","2018","2022"];

/* ── Char-by-char reveal ─────────────────────────────────────────────── */
function Reveal({ text, delay = 0, style = {} }: {
  text: string; delay?: number; style?: React.CSSProperties;
}) {
  return (
    <span style={{ display: "inline-block", ...style }}>
      {text.split("").map((ch, i) => (
        <span key={i} style={{
          display: "inline-block",
          animation: `charUp .45s cubic-bezier(.16,1,.3,1) ${delay + i * 48}ms both`,
        }}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

/* ── Spark particles ─────────────────────────────────────────────────── */
function Sparks() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }} aria-hidden>
      {Array.from({ length: 28 }, (_, i) => {
        const left   = 5 + Math.random() * 90;
        const delay  = Math.random() * 4;
        const dur    = 3 + Math.random() * 4;
        const size   = 1 + Math.random() * 2.5;
        const colours = ["#d3f340","#00e5ff","#ffffff","#ff007f","#ffd700"];
        const col    = colours[Math.floor(Math.random() * colours.length)];
        return (
          <div key={i} style={{
            position: "absolute",
            bottom: "-10px",
            left: `${left}%`,
            width: size, height: size * 4,
            borderRadius: "50%",
            background: col,
            boxShadow: `0 0 ${size * 3}px ${col}`,
            animation: `sparkRise ${dur}s ease-in ${delay}s infinite`,
            opacity: 0,
          }} />
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */
export function LandingIntro({ onEnter }: { onEnter: () => void }) {
  const [phase,     setPhase]     = useState<Phase>(0);
  const [bgIdx,     setBgIdx]     = useState(0);
  const [yearIdx,   setYearIdx]   = useState(0);
  const [impactOn,  setImpactOn]  = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const music    = useMusic();

  /* Advance phases */
  const advance = useCallback((next: Phase) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase(next);
    if (next < 9) {
      const nn    = (next + 1) as Phase;
      const delay = TIMING[nn] - TIMING[next];
      timerRef.current = setTimeout(() => advance(nn), delay);
    }
  }, []);

  useEffect(() => {
    timerRef.current = setTimeout(() => advance(1), TIMING[1]);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [advance]);

  /* Cycle backgrounds from phase 2 */
  useEffect(() => {
    if (phase < 2) return;
    const id = setInterval(() => setBgIdx(i => (i + 1) % BKGS.length), 5500);
    return () => clearInterval(id);
  }, [phase]);

  /* Year montage (phase 3) */
  useEffect(() => {
    if (phase !== 3) return;
    const ids: ReturnType<typeof setTimeout>[] = [];
    YEARS.forEach((_, i) => {
      ids.push(setTimeout(() => {
        setYearIdx(i);
        setImpactOn(true);
        setTimeout(() => setImpactOn(false), 110);
      }, i * 230));
    });
    return () => ids.forEach(clearTimeout);
  }, [phase]);

  /* 2026 impact flash (phase 6) */
  useEffect(() => {
    if (phase !== 6) return;
    setImpactOn(true);
    const id = setTimeout(() => setImpactOn(false), 180);
    return () => clearTimeout(id);
  }, [phase]);

  const handleEnter = useCallback(() => {
    sessionStorage.setItem("wciq_intro_seen", "1");
    setPhase(10);
    music.stop();
    setTimeout(onEnter, 900);
  }, [onEnter, music]);

  const vis = (n: Phase) => phase >= n;

  /* ─── Render ─────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Keyframes ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes charUp {
          from { opacity:0; transform:translateY(30px) scale(.88); filter:blur(8px); }
          to   { opacity:1; transform:none; filter:none; }
        }
        @keyframes slamDown {
          0%   { opacity:0; transform:translateY(-90px) scale(1.5); filter:blur(24px); }
          58%  { transform:translateY(7px) scale(.96); }
          100% { opacity:1; transform:none; filter:none; }
        }
        @keyframes yearCrash {
          0%   { opacity:0; transform:scale(4.5) rotate(-4deg); filter:blur(36px); }
          52%  { transform:scale(.93) rotate(.6deg); }
          100% { opacity:1; transform:scale(1) rotate(0); filter:none; }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(22px); }
          to   { opacity:1; transform:none; }
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes fadeOut{ from{opacity:1} to{opacity:0} }
        @keyframes bgFade {
          from { opacity:0; transform:scale(1.04); }
          to   { opacity:1; transform:scale(1); }
        }
        @keyframes pulseCTA {
          0%,100%{ box-shadow:0 0 0 0 rgba(211,243,64,0),0 0 55px rgba(211,243,64,.4); }
          50%    { box-shadow:0 0 0 22px rgba(211,243,64,0),0 0 100px rgba(211,243,64,.9); }
        }
        @keyframes introExit {
          0%  { opacity:1; transform:scale(1); filter:none; }
          60% { filter:brightness(2); }
          100%{ opacity:0; transform:scale(1.08); filter:brightness(0); }
        }
        @keyframes barSlide {
          from{ transform:scaleX(0); transform-origin:left; }
          to  { transform:scaleX(1); transform-origin:left; }
        }
        @keyframes spotPulse {
          0%,100%{ opacity:.45; height:60vh; }
          50%    { opacity:.85; height:68vh; }
        }
        @keyframes chromaLoop {
          0%  { text-shadow:5px 0 0 rgba(255,0,60,.8),-5px 0 0 rgba(0,229,255,.8),0 0 8px #fff,0 0 35px rgba(180,220,255,.9),0 0 90px rgba(100,180,255,.6),0 5px 0 rgba(0,0,0,1),0 10px 28px rgba(0,0,0,1); }
          50% { text-shadow:-4px 0 0 rgba(255,0,60,.7), 4px 0 0 rgba(0,229,255,.7),0 0 8px #fff,0 0 35px rgba(180,220,255,.9),0 0 90px rgba(100,180,255,.6),0 5px 0 rgba(0,0,0,1),0 10px 28px rgba(0,0,0,1); }
          100%{ text-shadow:5px 0 0 rgba(255,0,60,.8),-5px 0 0 rgba(0,229,255,.8),0 0 8px #fff,0 0 35px rgba(180,220,255,.9),0 0 90px rgba(100,180,255,.6),0 5px 0 rgba(0,0,0,1),0 10px 28px rgba(0,0,0,1); }
        }
        @keyframes glitchLegend {
          0%,88%,100%{ clip-path:none; transform:none; }
          90%{ clip-path:inset(40% 0 35% 0); transform:translateX(-6px); }
          92%{ clip-path:inset(10% 0 70% 0); transform:translateX(5px); }
          94%{ clip-path:none; transform:none; }
          96%{ clip-path:inset(55% 0 15% 0); transform:translateX(-4px); }
          98%{ clip-path:none; }
        }
        @keyframes sparkRise {
          0%  { opacity:0; transform:translateY(0) scaleY(1); }
          10% { opacity:1; }
          80% { opacity:.7; }
          100%{ opacity:0; transform:translateY(-70vh) scaleY(2.5); }
        }
        @keyframes yearFlash {
          0%  { opacity:0; transform:scale(1.4); filter:blur(8px); }
          15% { opacity:1; transform:scale(1); filter:none; }
          75% { opacity:1; }
          100%{ opacity:0; transform:scale(.9); }
        }
        @keyframes scanH {
          from{ transform:translateX(-110vw); }
          to  { transform:translateX(110vw); }
        }
        @keyframes grainAnim {
          0%  { transform:translate(0,0); }
          10% { transform:translate(-2%,-1%); }
          20% { transform:translate(1%,2%); }
          30% { transform:translate(-1%,1%); }
          40% { transform:translate(2%,-2%); }
          50% { transform:translate(0,1%); }
          60% { transform:translate(-2%,0); }
          70% { transform:translate(1%,-1%); }
          80% { transform:translate(-1%,2%); }
          90% { transform:translate(2%,1%); }
          100%{ transform:translate(0,0); }
        }
        @keyframes tensionRise {
          0%  { opacity:0; letter-spacing:1.2em; }
          100%{ opacity:1; letter-spacing:0.5em; }
        }
        @keyframes titleReveal {
          0%  { opacity:0; clip-path:inset(0 100% 0 0); }
          100%{ opacity:1; clip-path:inset(0 0% 0 0); }
        }
      `}</style>

      {/* ── Root ────────────────────────────────────────────────────── */}
      <div
        onClick={vis(9) ? handleEnter : music.start}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "#000", overflow: "hidden",
          cursor: vis(9) ? "pointer" : "default",
          animation: phase === 10 ? "introExit .9s ease forwards" : undefined,
        }}
      >
        {/* Film grain ──────────────────────────────────────────────── */}
        <div aria-hidden style={{
          position: "absolute", inset: "-10%",
          backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.72' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='220' height='220' filter='url(%23n)' opacity='.38'/></svg>")`,
          backgroundRepeat: "repeat",
          opacity: .5, mixBlendMode: "overlay",
          animation: "grainAnim .08s steps(1) infinite",
          pointerEvents: "none", zIndex: 20,
        }} />

        {/* Stadium bg ──────────────────────────────────────────────── */}
        {vis(2) && (
          <div key={bgIdx} style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${BKGS[bgIdx]})`,
            backgroundSize: "cover", backgroundPosition: "center 40%",
            animation: "bgFade 2.2s ease both",
          }} />
        )}

        {/* Master dark overlay ─────────────────────────────────────── */}
        <div style={{
          position: "absolute", inset: 0,
          background: vis(2)
            ? "linear-gradient(180deg,rgba(0,0,0,.92) 0%,rgba(0,0,0,.76) 45%,rgba(0,0,0,.96) 100%)"
            : "#000",
          transition: "background 1.5s ease",
        }} />

        {/* WHITE IMPACT FLASH ──────────────────────────────────────── */}
        <div style={{
          position: "absolute", inset: 0,
          background: "#fff", zIndex: 15,
          opacity: impactOn ? 0.9 : 0,
          transition: impactOn ? "none" : "opacity .35s ease",
          pointerEvents: "none",
        }} />

        {/* Horizontal scan flash ───────────────────────────────────── */}
        {vis(2) && (
          <div style={{
            position: "absolute", top: "44%", left: 0,
            width: "280px", height: "2px",
            background: "linear-gradient(90deg,transparent,rgba(0,229,255,1),transparent)",
            animation: "scanH 1s cubic-bezier(.4,0,.2,1) .3s 1",
            boxShadow: "0 0 24px rgba(0,229,255,.8)", pointerEvents: "none", zIndex: 5,
          }} />
        )}

        {/* Sparks (phase 6+) ───────────────────────────────────────── */}
        {vis(6) && <Sparks />}

        {/* Spotlights (phase 1) ────────────────────────────────────── */}
        {vis(1) && [0,1,2,3].map(i => (
          <div key={i} style={{
            position: "absolute", top: 0,
            left: `${14 + i * 24}%`,
            width: "3px", height: "65vh",
            transformOrigin: "top center",
            background: `linear-gradient(180deg,rgba(255,248,200,${.85 - i*.08}),transparent)`,
            filter: "blur(8px)",
            animation: `spotPulse 2.8s ease infinite ${i * 320}ms, fadeIn .9s ease ${i * 200}ms both`,
            zIndex: 3,
          }} />
        ))}

        {/* ═══════════════════════════════════════════════════════════
            LETTERBOX BARS (phase 2)
        ═══════════════════════════════════════════════════════════════ */}
        {vis(2) && (
          <>
            <div style={{ position:"absolute",top:0,left:0,right:0,height:"10vh",background:"#000",animation:"fadeIn .5s ease both",zIndex:8 }} />
            <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"10vh",background:"#000",animation:"fadeIn .5s ease both",zIndex:8 }} />
          </>
        )}

        {/* TOP INFO BAR ─────────────────────────────────────────────── */}
        {vis(2) && (
          <div style={{
            position:"absolute",top:"10vh",left:0,right:0,
            display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"10px 32px", zIndex:10,
            animation:"fadeUp .6s ease both",
          }}>
            <span style={{ fontFamily:"var(--font-data)",fontSize:10,letterSpacing:"0.32em",textTransform:"uppercase",color:"#ff007f",textShadow:"0 0 24px rgba(255,0,127,1)" }}>
              🐐 The Final Chapter of Legends
            </span>
            <span style={{ fontFamily:"var(--font-data)",fontSize:10,letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(0,229,255,.85)",textShadow:"0 0 18px rgba(0,229,255,.9)" }}>
              Jun 11 – Jul 19, 2026 · USA · Canada · Mexico
            </span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            CONTENT STACK (inset from letterbox bars)
        ═══════════════════════════════════════════════════════════════ */}
        <div style={{
          position: "absolute", inset: "10vh 0",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: "clamp(8px,1.8vh,20px)", padding: "0 28px",
          zIndex: 10,
        }}>

          {/* ── PHASE 1: Atmospheric chapter title ─────────────────── */}
          {phase >= 1 && phase <= 1 && (
            <div style={{ textAlign:"center", animation:"fadeUp .9s ease both" }}>
              <p style={{
                fontFamily:"var(--font-data)",fontSize:"clamp(11px,1.3vw,16px)",
                letterSpacing:"0.55em",textTransform:"uppercase",marginBottom:"1.2em",
                color:"rgba(255,255,255,.45)",
                textShadow:"0 2px 12px rgba(0,0,0,.9)",
              }}>
                WorldCupIQ presents
              </p>
              <div style={{
                fontFamily:"var(--font-display)",
                fontSize:"clamp(22px,3.5vw,48px)",
                fontWeight:700, letterSpacing:"0.08em",
                color:"rgba(255,255,255,.6)",
                textShadow:"0 4px 24px rgba(0,0,0,1)",
                animation:"titleReveal 1.2s cubic-bezier(.16,1,.3,1) .3s both",
              }}>
                For Decades, Two Names Defined the Game
              </div>
            </div>
          )}

          {/* ── PHASE 2: MESSI · RONALDO ───────────────────────────── */}
          {vis(2) && phase <= 2 && (
            <div style={{ textAlign:"center" }}>
              <div style={{
                fontFamily:"var(--font-display)",
                fontSize:"clamp(44px,9vw,120px)",
                fontWeight:900, letterSpacing:"0.1em",
                textTransform:"uppercase", lineHeight:.9,
                color:"#ffffff",
                animation:"slamDown .7s cubic-bezier(.16,1,.3,1) both, glitchLegend 5s ease infinite 1s",
                textShadow:[
                  "0 0 6px rgba(255,255,255,1)",
                  "0 0 30px rgba(200,220,255,.9)",
                  "0 0 80px rgba(150,190,255,.7)",
                  "0 6px 0 rgba(0,0,0,1)",
                  "0 12px 32px rgba(0,0,0,1)",
                ].join(","),
              }}>
                MESSI · RONALDO
              </div>
              <p style={{
                fontFamily:"var(--font-data)",fontSize:"clamp(10px,1.1vw,14px)",
                letterSpacing:"0.45em",textTransform:"uppercase",
                marginTop:"0.6em", color:"rgba(255,200,0,.8)",
                textShadow:"0 0 20px rgba(255,200,0,.8)",
                animation:"fadeUp .7s ease .4s both",
              }}>
                Their Last Dance
              </p>
            </div>
          )}

          {/* ── PHASE 3: YEAR MONTAGE ──────────────────────────────── */}
          {phase === 3 && (
            <div style={{ textAlign:"center", position:"relative" }}>
              <p style={{
                fontFamily:"var(--font-data)",fontSize:"clamp(10px,1vw,13px)",
                letterSpacing:"0.55em",textTransform:"uppercase",marginBottom:"1em",
                color:"rgba(255,255,255,.35)", animation:"fadeIn .4s ease both",
              }}>
                A journey across generations
              </p>
              {/* Big year flash */}
              <div style={{
                fontFamily:"var(--font-display)",
                fontSize:"clamp(80px,18vw,220px)",
                fontWeight:900, lineHeight:1, letterSpacing:"0.06em",
                color:"#ffffff",
                textShadow:"0 0 4px #fff,0 0 40px rgba(255,255,255,.5),0 6px 0 rgba(0,0,0,1)",
                animation:"yearFlash .22s ease both",
              }}>
                {YEARS[yearIdx]}
              </div>
              {/* Year dots row */}
              <div style={{
                display:"flex",gap:"clamp(4px,0.8vw,10px)",justifyContent:"center",marginTop:"1em",
                animation:"fadeIn .5s ease both",
              }}>
                {YEARS.map((y,i) => (
                  <span key={y} style={{
                    fontFamily:"var(--font-data)",fontSize:"clamp(8px,.8vw,10px)",
                    letterSpacing:"0.1em",
                    color: i === yearIdx ? "#d3f340" : "rgba(255,255,255,.25)",
                    textShadow: i === yearIdx ? "0 0 12px #d3f340" : undefined,
                    transition:"all .15s ease",
                  }}>{y}</span>
                ))}
              </div>
            </div>
          )}

          {/* ── PHASE 4: Tension — ONE FINAL CHANCE ─────────────────── */}
          {phase === 4 && (
            <div style={{ textAlign:"center" }}>
              <p style={{
                fontFamily:"var(--font-data)",fontSize:"clamp(9px,1vw,12px)",
                letterSpacing:"0.55em",textTransform:"uppercase",
                color:"rgba(255,255,255,.3)",marginBottom:"1em",
                animation:"fadeIn .5s ease both",
              }}>
                2026
              </p>
              <div style={{
                fontFamily:"var(--font-display)",
                fontSize:"clamp(36px,6.5vw,88px)",
                fontWeight:900, letterSpacing:"0.06em", textTransform:"uppercase",
                lineHeight:1.05,
                color:"#ffffff",
                textShadow:"0 0 6px rgba(255,255,255,.9),0 0 40px rgba(200,230,255,.6),0 6px 0 rgba(0,0,0,1),0 12px 28px rgba(0,0,0,1)",
                animation:"tensionRise 1.8s cubic-bezier(.16,1,.3,1) both",
              }}>
                One Final<br />Chance
              </div>
            </div>
          )}

          {/* ── PHASE 5: FIFA WORLD CUP ─────────────────────────────── */}
          {vis(5) && phase <= 5 && (
            <div style={{ textAlign:"center", lineHeight:1 }}>
              <p style={{
                fontFamily:"var(--font-data)",fontSize:"clamp(10px,1.2vw,15px)",
                letterSpacing:"0.5em",textTransform:"uppercase",marginBottom:"0.7em",
                color:"#00e5ff",
                textShadow:"0 0 28px rgba(0,229,255,1),0 0 60px rgba(0,229,255,.6)",
                animation:"fadeUp .6s ease both",
              }}>
                ⚽ Messi · Ronaldo · The Last Dance ⚽
              </p>
              <div style={{
                fontFamily:"var(--font-display)",
                fontSize:"clamp(32px,6.5vw,92px)",
                fontWeight:900, letterSpacing:"0.13em", textTransform:"uppercase", lineHeight:1,
                color:"#ffffff",
                animation:"slamDown .75s cubic-bezier(.16,1,.3,1) both, chromaLoop 2.8s ease infinite .8s",
              }}>
                FIFA WORLD CUP
              </div>
            </div>
          )}

          {/* ── PHASE 6: 2026 ───────────────────────────────────────── */}
          {vis(6) && (
            <div style={{
              fontFamily:"var(--font-display)",
              fontSize:"clamp(88px,21vw,280px)",
              fontWeight:900, lineHeight:.82, letterSpacing:"0.09em",
              color:"#d3f340",
              textShadow:[
                "0 0 4px #fff9a0",
                "0 0 16px #d3f340",
                "0 0 50px rgba(211,243,64,.95)",
                "0 0 120px rgba(211,243,64,.8)",
                "0 0 220px rgba(180,220,0,.55)",
                "0 7px 0 rgba(0,0,0,1)",
                "0 14px 36px rgba(0,0,0,.95)",
              ].join(","),
              animation:"yearCrash .9s cubic-bezier(.22,1.36,.4,1) both",
            }}>
              2026
            </div>
          )}

          {/* ── PHASE 7: Globe ──────────────────────────────────────── */}
          {vis(7) && (
            <div style={{
              width:"clamp(130px,18vw,220px)", height:"clamp(130px,18vw,220px)",
              animation:"slamDown .9s cubic-bezier(.22,1.36,.4,1) both",
            }}>
              <GlobeWrapper />
            </div>
          )}

          {/* ── PHASE 8: WorldCupIQ Brand ───────────────────────────── */}
          {vis(8) && (
            <div style={{ textAlign:"center" }}>
              <div style={{
                fontFamily:"var(--font-display)",
                fontSize:"clamp(36px,5.5vw,72px)",
                fontWeight:800, letterSpacing:"-0.01em", lineHeight:1,
              }}>
                <span style={{
                  color:"#ffffff",
                  textShadow:"0 0 6px rgba(255,255,255,1),0 0 24px rgba(0,229,255,1),0 0 60px rgba(0,200,255,.8),0 5px 0 rgba(0,0,0,1),0 10px 20px rgba(0,0,0,.9)",
                }}>
                  <Reveal text="WorldCup" delay={0} />
                </span>
                <span style={{
                  color:"#d3f340",
                  textShadow:"0 0 6px #fffb80,0 0 22px #d3f340,0 0 60px rgba(211,243,64,.95),0 5px 0 rgba(0,0,0,1),0 10px 20px rgba(0,0,0,.9)",
                }}>
                  <Reveal text="IQ" delay={500} />
                </span>
              </div>
              <p style={{
                fontFamily:"var(--font-data)",fontSize:"clamp(9px,1.1vw,13px)",
                letterSpacing:"0.42em",textTransform:"uppercase",marginTop:"0.7em",
                color:"#00e5ff",
                textShadow:"0 0 20px rgba(0,229,255,1)",
                animation:"fadeUp .6s ease .5s both",
              }}>
                Intelligence · Analytics · Predictions
              </p>
            </div>
          )}

          {/* Tagline (phase 8) */}
          {vis(8) && (
            <p style={{
              fontFamily:"var(--font-body)",fontSize:"clamp(13px,1.4vw,17px)",fontWeight:500,
              color:"#f0f8ff",textAlign:"center",maxWidth:480,lineHeight:1.72,
              textShadow:"0 2px 14px rgba(0,0,0,1)",
              animation:"fadeUp .8s ease .3s both",padding:"0 12px",
            }}>
              48 nations.{" "}
              <strong style={{ color:"#d3f340",textShadow:"0 0 16px rgba(211,243,64,.9)" }}>
                104 matches.
              </strong>{" "}
              One prediction engine.
              <br />
              <span style={{ color:"rgba(180,230,255,.85)" }}>
                Live data from the tournament, minute by minute.
              </span>
            </p>
          )}

          {/* ── PHASE 9: CTA ────────────────────────────────────────── */}
          {vis(9) && (
            <button
              onClick={e => { e.stopPropagation(); handleEnter(); }}
              style={{
                marginTop:16,
                padding:"18px 72px",
                fontSize:"clamp(14px,1.5vw,18px)",
                fontFamily:"var(--font-display)",fontWeight:800,
                letterSpacing:"0.22em",textTransform:"uppercase",
                color:"#000",
                background:"linear-gradient(135deg,#f0ff70,#d3f340 40%,#aacc1a 80%,#d3f340)",
                border:"2px solid rgba(255,255,255,.4)",
                borderRadius:9999,cursor:"pointer",
                animation:"slamDown .6s cubic-bezier(.22,1.36,.4,1) both, pulseCTA 2s ease .7s infinite",
                transition:"transform .18s, filter .18s",
                boxShadow:"0 0 48px rgba(211,243,64,.6),0 10px 32px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.45)",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform="scale(1.08)"; (e.currentTarget as HTMLElement).style.filter="brightness(1.25)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform="scale(1)";    (e.currentTarget as HTMLElement).style.filter="brightness(1)"; }}
            >
              ⚡ Enter the IQ →
            </button>
          )}
        </div>

        {/* ── Image filmstrip (phase 8) ─────────────────────────────── */}
        {vis(8) && (
          <div style={{
            position:"absolute",bottom:"10vh",left:0,right:0,
            height:"clamp(52px,8.5vh,78px)",
            display:"flex",gap:3,overflow:"hidden",
            animation:"fadeUp .9s ease .4s both",zIndex:10,
          }}>
            {["/images/players_action.jpg","/images/trophy1.jpg","/images/ball_field.jpg","/images/football1.jpg","/images/referee.jpg"].map((src,i) => (
              <div key={i} style={{
                flex:1,backgroundImage:`url(${src})`,
                backgroundSize:"cover",backgroundPosition:"center",
                opacity:.42,filter:"saturate(.5)",
              }} />
            ))}
            <div style={{ position:"absolute",inset:0,background:"linear-gradient(90deg,#000 0%,transparent 14%,transparent 86%,#000 100%)" }} />
          </div>
        )}

        {/* ── Rainbow accent line ───────────────────────────────────── */}
        {vis(2) && (
          <div style={{
            position:"absolute",bottom:"10vh",left:0,right:0,height:"1px",
            background:"linear-gradient(90deg,transparent,#ff007f 15%,#00e5ff 35%,#d3f340 50%,#00e5ff 65%,#ff007f 85%,transparent)",
            animation:"barSlide .9s ease .2s both",opacity:.65,zIndex:9,
          }} />
        )}

        {/* ── Controls ─────────────────────────────────────────────── */}
        <div style={{ position:"absolute",bottom:"calc(10vh + 14px)",right:20,display:"flex",gap:8,zIndex:15 }}>
          <button
            onClick={e => { e.stopPropagation(); music.toggle(); }}
            style={{
              background:"rgba(0,0,0,.6)",border:"1px solid rgba(255,255,255,.18)",
              borderRadius:9999,color:"#fff",padding:"6px 14px",
              fontSize:11,cursor:"pointer",fontFamily:"var(--font-data)",
              letterSpacing:"0.1em",backdropFilter:"blur(14px)",
            }}
          >
            {!music.started ? "▶ SOUND" : music.muted ? "🔇 MUTED" : "🔊 ON"}
          </button>
          {vis(2) && (
            <button
              onClick={e => { e.stopPropagation(); handleEnter(); }}
              style={{
                background:"rgba(0,0,0,.6)",border:"1px solid rgba(255,255,255,.14)",
                borderRadius:9999,color:"rgba(255,255,255,.5)",
                padding:"6px 14px",fontSize:11,cursor:"pointer",
                fontFamily:"var(--font-data)",letterSpacing:"0.1em",
                backdropFilter:"blur(14px)",
              }}
            >
              SKIP ▶
            </button>
          )}
        </div>

        {/* ── Progress dots ─────────────────────────────────────────── */}
        {vis(2) && (
          <div style={{ position:"absolute",bottom:"calc(10vh + 18px)",left:"50%",transform:"translateX(-50%)",display:"flex",gap:5,zIndex:15 }}>
            {[1,2,3,4,5,6,7,8,9].map(p => (
              <div key={p} style={{
                width: p <= phase ? 20 : 5, height:3, borderRadius:2,
                background: p <= phase ? "#d3f340" : "rgba(255,255,255,.18)",
                transition:"all .4s ease",
                boxShadow: p <= phase ? "0 0 10px rgba(211,243,64,.8)" : undefined,
              }} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
