"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

const GlobeWrapper = dynamic(
  () => import("@/components/globe-wrapper").then((m) => ({ default: m.GlobeWrapper })),
  { ssr: false }
);

/* ══════════════════════════════════════════════════════════════════════
   LEGEND DATA
   ══════════════════════════════════════════════════════════════════════ */
const LEGENDS = [
  { file: "/legends/messi.png",       name: "Lionel Messi",        nation: "Argentina",  accent: "#43b5fe" },
  { file: "/legends/ronaldo.jpg",      name: "Cristiano Ronaldo",   nation: "Portugal",   accent: "#d5182e" },
  { file: "/legends/mbappe.jpg",       name: "Kylian Mbappé",       nation: "France",     accent: "#002395" },
  { file: "/legends/neymar.jpg",       name: "Neymar Jr.",          nation: "Brazil",     accent: "#009c3b" },
  { file: "/legends/kane.jpg",         name: "Harry Kane",          nation: "England",    accent: "#cf081f" },
  { file: "/legends/vinicius.jpg",     name: "Vinícius Jr.",        nation: "Brazil",     accent: "#009c3b" },
  { file: "/legends/bellingham.jpg",   name: "Jude Bellingham",     nation: "England",    accent: "#cf081f" },
  { file: "/legends/salah.jpg",        name: "Mohamed Salah",       nation: "Egypt",      accent: "#c8102e" },
  { file: "/legends/modric.jpg",       name: "Luka Modrić",         nation: "Croatia",    accent: "#ff0000" },
  { file: "/legends/lewandowski.jpg",  name: "Robert Lewandowski",  nation: "Poland",     accent: "#dc143c" },
  { file: "/legends/pedri.jpg",        name: "Pedri",               nation: "Spain",      accent: "#c60b1e" },
];

const WC_YEARS = ["1986","1990","1994","1998","2002","2006","2010","2014","2018","2022"];
const BKGS     = ["/images/stadium1.jpg","/images/crowd1.jpg","/images/stadium_night.jpg","/images/stadium2.jpg"];
const SPARK_COLOURS = ["#d3f340", "#00e5ff", "#ffffff", "#ff007f", "#ffd700"];

function seededRandom(seed: number) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}

const SPARKS = Array.from({ length: 30 }, (_, i) => ({
  left: 5 + seededRandom(i + 1) * 90,
  delay: seededRandom(i + 31) * 4,
  duration: 3 + seededRandom(i + 61) * 4,
  size: 1.2 + seededRandom(i + 91) * 2.5,
  colour: SPARK_COLOURS[Math.floor(seededRandom(i + 121) * SPARK_COLOURS.length)],
}));

/* ══════════════════════════════════════════════════════════════════════
   WEB AUDIO — real intro track, no generated synth layer
   ══════════════════════════════════════════════════════════════════════ */
const INTRO_TRACK = "/audio/wc_anthem.mp3";

function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted,   setMuted]   = useState(false);
  const [started, setStarted] = useState(false);

  const start = useCallback(() => {
    if (started) return;
    setStarted(true);
    try {
      const track = new Audio(INTRO_TRACK);
      track.volume = 0.78;
      track.preload = "auto";
      audioRef.current = track;
      void track.play();
    } catch {}
  }, [started]);

  const toggle = useCallback(() => {
    if (!started) { start(); return; }
    const track = audioRef.current;
    if (!track) return;
    if (track.paused) {
      void track.play();
      setMuted(false);
    } else {
      track.pause();
      setMuted(true);
    }
  }, [started, start]);

  const stop = useCallback(() => {
    const track = audioRef.current;
    if (!track) return;
    track.pause();
    track.currentTime = 0;
    audioRef.current = null;
  }, []);

  useEffect(() => () => stop(), [stop]);
  return { muted, started, start, toggle, stop };
}

/* ══════════════════════════════════════════════════════════════════════
   PHASE MACHINE
   0 black | 1 heartbeat-text | 2 legends-gallery | 3 year-montage
   4 tension | 5 fifa-text | 6 2026 | 7 globe | 8 brand | 9 cta
   ══════════════════════════════════════════════════════════════════════ */
type Phase = 0|1|2|3|4|5|6|7|8|9|10;
const TIMING: Record<number,number> = {
  0:0, 1:700, 2:2400, 3:5800, 4:8200, 5:10000,
  6:11800, 7:13400, 8:14800, 9:16200,
};

/* ── Char reveal ─────────────────────────────────────────────────────── */
function Reveal({ text, delay=0, style={} }: { text:string; delay?:number; style?:React.CSSProperties }) {
  return (
    <span style={{ display:"inline-block", ...style }}>
      {text.split("").map((ch,i) => (
        <span key={i} style={{ display:"inline-block", animation:`charUp .42s cubic-bezier(.16,1,.3,1) ${delay+i*46}ms both` }}>
          {ch===" " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

/* ── Sparks ──────────────────────────────────────────────────────────── */
function Sparks() {
  return (
    <div style={{ position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden" }} aria-hidden>
      {SPARKS.map((spark, i) => (
        <div key={i} style={{
          position:"absolute", bottom:"-8px", left:`${spark.left}%`,
          width:spark.size, height:spark.size*4, borderRadius:"50%",
          background:spark.colour, boxShadow:`0 0 ${spark.size*3}px ${spark.colour}`,
          animation:`sparkRise ${spark.duration}s ease-in ${spark.delay}s infinite`, opacity:0,
        }} />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════════════════════════ */
export function LandingIntro({ onEnter }: { onEnter:()=>void }) {
  const [phase,    setPhase]    = useState<Phase>(0);
  const [bgIdx,    setBgIdx]    = useState(0);
  const [yearIdx,  setYearIdx]  = useState(0);
  const [legIdx,   setLegIdx]   = useState(0);
  // impact flash removed — was jarring
  const timer  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const audio  = useAudio();

  const advance = useCallback((next:Phase) => {
    if (timer.current) clearTimeout(timer.current);
    setPhase(next);
  }, []);

  useEffect(() => {
    if (phase >= 9) return;
    const next = (phase + 1) as Phase;
    timer.current = setTimeout(() => advance(next), TIMING[next] - TIMING[phase]);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [advance, phase]);

  // Cycle backgrounds
  useEffect(() => {
    if (phase < 2) return;
    const id = setInterval(() => setBgIdx(i => (i+1)%BKGS.length), 5500);
    return () => clearInterval(id);
  }, [phase]);

  // Legends cycle (phase 2)
  useEffect(() => {
    if (phase !== 2) return;
    const ids: ReturnType<typeof setTimeout>[] = [];
    LEGENDS.forEach((_,i) => {
      ids.push(setTimeout(() => setLegIdx(i), i * 300));
    });
    return () => ids.forEach(clearTimeout);
  }, [phase]);

  // Year montage (phase 3)
  useEffect(() => {
    if (phase !== 3) return;
    const ids: ReturnType<typeof setTimeout>[] = [];
    WC_YEARS.forEach((_,i) => {
      ids.push(setTimeout(() => setYearIdx(i), i * 240));
    });
    return () => ids.forEach(clearTimeout);
  }, [phase]);

  const handleEnter = useCallback(() => {
    sessionStorage.setItem("wciq_intro_seen","1");
    setPhase(10);
    audio.stop();
    setTimeout(onEnter, 900);
  }, [onEnter, audio]);

  const vis = (n:Phase) => phase >= n;
  const leg = LEGENDS[legIdx];

  return (
    <>
      <style>{`
        @keyframes charUp   { from{opacity:0;transform:translateY(28px) scale(.88);filter:blur(8px)} to{opacity:1;transform:none;filter:none} }
        @keyframes slamDown { 0%{opacity:0;transform:translateY(-90px) scale(1.5);filter:blur(24px)} 58%{transform:translateY(7px) scale(.96)} 100%{opacity:1;transform:none;filter:none} }
        @keyframes yearCrash{ 0%{opacity:0;transform:scale(4.5) rotate(-4deg);filter:blur(36px)} 52%{transform:scale(.93) rotate(.6deg)} 100%{opacity:1;transform:scale(1) rotate(0);filter:none} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:none} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes bgFade   { from{opacity:0;transform:scale(1.05)} to{opacity:1;transform:scale(1)} }
        @keyframes pulseCTA { 0%,100%{box-shadow:0 0 0 0 rgba(211,243,64,0),0 0 55px rgba(211,243,64,.4)} 50%{box-shadow:0 0 0 22px rgba(211,243,64,0),0 0 100px rgba(211,243,64,.95)} }
        @keyframes introExit{ 0%{opacity:1;transform:scale(1);filter:none} 55%{filter:brightness(2.5)} 100%{opacity:0;transform:scale(1.1);filter:brightness(0)} }
        @keyframes barSlide { from{transform:scaleX(0);transform-origin:left} to{transform:scaleX(1);transform-origin:left} }
        @keyframes spotPulse{ 0%,100%{opacity:.42;height:60vh} 50%{opacity:.85;height:68vh} }
        @keyframes chromaLoop{
          0%  {text-shadow:5px 0 0 rgba(255,0,60,.8),-5px 0 0 rgba(0,229,255,.8),0 0 8px #fff,0 0 36px rgba(180,220,255,.9),0 0 90px rgba(100,180,255,.6),0 5px 0 rgba(0,0,0,1),0 10px 28px rgba(0,0,0,1)}
          50% {text-shadow:-4px 0 0 rgba(255,0,60,.7),4px 0 0 rgba(0,229,255,.7),0 0 8px #fff,0 0 36px rgba(180,220,255,.9),0 0 90px rgba(100,180,255,.6),0 5px 0 rgba(0,0,0,1),0 10px 28px rgba(0,0,0,1)}
          100%{text-shadow:5px 0 0 rgba(255,0,60,.8),-5px 0 0 rgba(0,229,255,.8),0 0 8px #fff,0 0 36px rgba(180,220,255,.9),0 0 90px rgba(100,180,255,.6),0 5px 0 rgba(0,0,0,1),0 10px 28px rgba(0,0,0,1)}
        }
        @keyframes glitchLg { 0%,88%,100%{clip-path:none;transform:none} 90%{clip-path:inset(40% 0 35% 0);transform:translateX(-6px)} 93%{clip-path:inset(10% 0 70% 0);transform:translateX(5px)} 96%{clip-path:none} }
        @keyframes sparkRise{ 0%{opacity:0;transform:translateY(0) scaleY(1)} 10%{opacity:1} 80%{opacity:.7} 100%{opacity:0;transform:translateY(-72vh) scaleY(2.5)} }
        @keyframes yearFlash{ 0%{opacity:0;transform:scale(1.4);filter:blur(8px)} 18%{opacity:1;transform:scale(1);filter:none} 78%{opacity:1} 100%{opacity:0;transform:scale(.9)} }
        @keyframes scanH    { from{transform:translateX(-110vw)} to{transform:translateX(110vw)} }
        @keyframes tensionR { 0%{opacity:0;letter-spacing:1.3em} 100%{opacity:1;letter-spacing:0.06em} }
        @keyframes titleRev { 0%{opacity:0;clip-path:inset(0 100% 0 0)} 100%{opacity:1;clip-path:inset(0 0% 0 0)} }
        @keyframes legSlide { 0%{opacity:0;transform:translateX(40px) scale(.95)} 100%{opacity:1;transform:none} }
        @keyframes legImgIn { 0%{opacity:0;transform:scale(1.1);filter:blur(6px)} 100%{opacity:1;transform:scale(1);filter:none} }
        @keyframes grainAnim{ 0%{transform:translate(0,0)} 25%{transform:translate(-1%,1%)} 50%{transform:translate(1%,-1%)} 75%{transform:translate(-1%,0)} 100%{transform:translate(0,0)} }
      `}</style>

      {/* ── Root ─────────────────────────────────────────────────────── */}
      <div
        onClick={vis(9) ? handleEnter : audio.start}
        style={{
          position:"fixed",inset:0,zIndex:9999,
          background:"#000",overflow:"hidden",
          cursor:vis(9)?"pointer":"default",
          animation:phase===10?"introExit .9s ease forwards":undefined,
        }}
      >
        {/* Film grain */}
        <div aria-hidden style={{
          position:"absolute",inset:"-10%",
          backgroundImage:`url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.72' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='220' height='220' filter='url(%23n)' opacity='.35'/></svg>")`,
          backgroundRepeat:"repeat",opacity:.5,mixBlendMode:"overlay",
          animation:"grainAnim .1s steps(1) infinite",pointerEvents:"none",zIndex:20,
        }} />

        {/* Stadium bg */}
        {vis(2) && (
          <div key={bgIdx} style={{
            position:"absolute",inset:0,
            backgroundImage:`url(${BKGS[bgIdx]})`,
            backgroundSize:"cover",backgroundPosition:"center 40%",
            animation:"bgFade 2.2s ease both",
          }} />
        )}

        {/* Dark overlay */}
        <div style={{
          position:"absolute",inset:0,
          background:vis(2)
            ?"linear-gradient(180deg,rgba(0,0,0,.92) 0%,rgba(0,0,0,.75) 45%,rgba(0,0,0,.96) 100%)"
            :"#000",
          transition:"background 1.4s ease",
        }} />



        {/* Scan flash */}
        {vis(2) && (
          <div style={{
            position:"absolute",top:"44%",left:0,
            width:"300px",height:"2px",
            background:"linear-gradient(90deg,transparent,rgba(0,229,255,1),transparent)",
            animation:"scanH 1.1s cubic-bezier(.4,0,.2,1) .3s 1",
            boxShadow:"0 0 24px rgba(0,229,255,.8)",pointerEvents:"none",zIndex:5,
          }} />
        )}

        {/* Sparks */}
        {vis(6) && <Sparks />}

        {/* Spotlights */}
        {vis(1) && [0,1,2,3].map(i => (
          <div key={i} style={{
            position:"absolute",top:0,left:`${14+i*24}%`,
            width:"3px",height:"65vh",transformOrigin:"top center",
            background:`linear-gradient(180deg,rgba(255,248,200,${.88-i*.1}),transparent)`,
            filter:"blur(8px)",
            animation:`spotPulse 2.8s ease infinite ${i*300}ms, fadeIn .9s ease ${i*180}ms both`,
            zIndex:3,
          }} />
        ))}

        {/* Letterbox */}
        {vis(2) && (
          <>
            <div style={{position:"absolute",top:0,left:0,right:0,height:"9.5vh",background:"#000",animation:"fadeIn .5s ease both",zIndex:8}} />
            <div style={{position:"absolute",bottom:0,left:0,right:0,height:"9.5vh",background:"#000",animation:"fadeIn .5s ease both",zIndex:8}} />
          </>
        )}

        {/* Top bar */}
        {vis(2) && (
          <div style={{
            position:"absolute",top:"9.5vh",left:0,right:0,
            display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"10px 32px",zIndex:10,animation:"fadeUp .6s ease both",
          }}>
            <span style={{fontFamily:"var(--font-data)",fontSize:10,letterSpacing:"0.32em",textTransform:"uppercase",color:"#ff007f",textShadow:"0 0 24px rgba(255,0,127,1)"}}>
              🐐 The Final Chapter of Legends
            </span>
            <span style={{fontFamily:"var(--font-data)",fontSize:10,letterSpacing:"0.22em",textTransform:"uppercase",color:"rgba(0,229,255,.85)",textShadow:"0 0 18px rgba(0,229,255,.9)"}}>
              Jun 11 – Jul 19, 2026 · USA · Canada · Mexico
            </span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            CONTENT
        ═══════════════════════════════════════════════════════════════ */}
        <div style={{
          position:"absolute",inset:"9.5vh 0",
          display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",
          gap:"clamp(6px,1.6vh,18px)",padding:"0 24px",
          zIndex:10,
        }}>

          {/* ── PHASE 1: Intro card ─────────────────────────────────── */}
          {phase === 1 && (
            <div style={{textAlign:"center",animation:"fadeUp .9s ease both"}}>
              <p style={{fontFamily:"var(--font-data)",fontSize:"clamp(11px,1.3vw,16px)",letterSpacing:"0.55em",textTransform:"uppercase",marginBottom:"1.2em",color:"rgba(255,255,255,.4)",textShadow:"0 2px 12px rgba(0,0,0,.9)"}}>
                WorldCupIQ presents
              </p>
              <div style={{
                fontFamily:"var(--font-display)",fontSize:"clamp(22px,3.5vw,50px)",
                fontWeight:700,letterSpacing:"0.08em",color:"rgba(255,255,255,.58)",
                textShadow:"0 4px 28px rgba(0,0,0,1)",
                animation:"titleRev 1.3s cubic-bezier(.16,1,.3,1) .3s both",
              }}>
                For Decades, Two Names Defined the Game
              </div>
            </div>
          )}

          {/* ── PHASE 2: LEGENDS GALLERY ────────────────────────────── */}
          {phase === 2 && leg && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"clamp(12px,2vh,24px)",width:"100%",maxWidth:700}}>

              {/* Headline */}
              <div style={{textAlign:"center",animation:"fadeIn .5s ease both"}}>
                <p style={{fontFamily:"var(--font-data)",fontSize:"clamp(9px,1vw,12px)",letterSpacing:"0.55em",textTransform:"uppercase",color:"rgba(255,255,255,.35)"}}>The stars of 2026</p>
              </div>

              {/* Feature legend card */}
              <div key={legIdx} style={{
                display:"flex",alignItems:"center",gap:"clamp(16px,3vw,40px)",
                animation:"legSlide .35s cubic-bezier(.16,1,.3,1) both",
              }}>
                {/* Player photo */}
                <div style={{
                  width:"clamp(100px,18vw,180px)",
                  height:"clamp(120px,22vw,220px)",
                  borderRadius:16,overflow:"hidden",flexShrink:0,
                  border:`2px solid ${leg.accent}60`,
                  boxShadow:`0 0 32px ${leg.accent}40, 0 16px 40px rgba(0,0,0,.7)`,
                  animation:"legImgIn .35s ease both",
                  position:"relative",
                }}>
                  <Image
                    src={leg.file}
                    alt={leg.name}
                    fill
                    className="object-cover object-top"
                    unoptimized
                  />
                  {/* Gradient overlay on photo */}
                  <div style={{
                    position:"absolute",inset:0,
                    background:`linear-gradient(180deg,transparent 50%,rgba(0,0,0,.9) 100%)`,
                  }} />
                </div>

                {/* Name + nation */}
                <div>
                  <p style={{
                    fontFamily:"var(--font-data)",fontSize:"clamp(9px,.9vw,11px)",
                    letterSpacing:"0.35em",textTransform:"uppercase",marginBottom:"0.4em",
                    color:leg.accent,textShadow:`0 0 20px ${leg.accent}`,
                  }}>
                    {leg.nation}
                  </p>
                  <div style={{
                    fontFamily:"var(--font-display)",
                    fontSize:"clamp(26px,4.5vw,60px)",
                    fontWeight:900,letterSpacing:"-0.01em",lineHeight:.95,
                    color:"#ffffff",
                    textShadow:`0 0 6px rgba(255,255,255,.9),0 0 28px ${leg.accent}80,0 6px 0 rgba(0,0,0,1),0 12px 30px rgba(0,0,0,1)`,
                  }}>
                    {leg.name.split(" ").map((w,i) => <span key={i} style={{display:"block"}}>{w}</span>)}
                  </div>
                </div>
              </div>

              {/* Thumbnail strip */}
              <div style={{
                display:"flex",gap:"clamp(5px,1vw,10px)",
                animation:"fadeUp .7s ease .2s both",
              }}>
                {LEGENDS.map((l,i) => (
                  <div key={i} style={{
                    width:"clamp(36px,5.5vw,56px)",
                    height:"clamp(36px,5.5vw,56px)",
                    borderRadius:10,overflow:"hidden",flexShrink:0,
                    border:`1.5px solid ${i===legIdx?l.accent:"rgba(255,255,255,.12)"}`,
                    opacity:i===legIdx?1:.45,
                    transition:"all .3s ease",
                    position:"relative",
                    boxShadow:i===legIdx?`0 0 16px ${l.accent}60`:undefined,
                  }}>
                    <Image src={l.file} alt={l.name} fill className="object-cover object-top" unoptimized />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PHASE 3: Year montage ────────────────────────────────── */}
          {phase === 3 && (
            <div style={{textAlign:"center"}}>
              <p style={{fontFamily:"var(--font-data)",fontSize:"clamp(10px,1vw,13px)",letterSpacing:"0.55em",textTransform:"uppercase",marginBottom:"0.9em",color:"rgba(255,255,255,.3)",animation:"fadeIn .4s ease both"}}>
                A journey across generations
              </p>
              <div style={{
                fontFamily:"var(--font-display)",
                fontSize:"clamp(80px,18vw,230px)",
                fontWeight:900,lineHeight:1,letterSpacing:"0.06em",
                color:"#ffffff",
                textShadow:"0 0 4px #fff,0 0 40px rgba(255,255,255,.5),0 6px 0 rgba(0,0,0,1)",
                animation:"yearFlash .22s ease both",
              }}>
                {WC_YEARS[yearIdx]}
              </div>
              <div style={{display:"flex",gap:"clamp(4px,.8vw,10px)",justifyContent:"center",marginTop:"1em",animation:"fadeIn .5s ease both"}}>
                {WC_YEARS.map((y,i) => (
                  <span key={y} style={{
                    fontFamily:"var(--font-data)",fontSize:"clamp(7px,.75vw,10px)",letterSpacing:"0.1em",
                    color:i===yearIdx?"#d3f340":"rgba(255,255,255,.22)",
                    textShadow:i===yearIdx?"0 0 14px #d3f340":undefined,
                    transition:"all .15s ease",
                  }}>{y}</span>
                ))}
              </div>
            </div>
          )}

          {/* ── PHASE 4: Tension ─────────────────────────────────────── */}
          {phase === 4 && (
            <div style={{textAlign:"center"}}>
              <p style={{fontFamily:"var(--font-data)",fontSize:"clamp(9px,1vw,12px)",letterSpacing:"0.55em",textTransform:"uppercase",color:"rgba(255,255,255,.28)",marginBottom:"1em",animation:"fadeIn .5s ease both"}}>
                2026
              </p>
              <div style={{
                fontFamily:"var(--font-display)",
                fontSize:"clamp(36px,6.5vw,90px)",
                fontWeight:900,letterSpacing:"0.06em",textTransform:"uppercase",lineHeight:1.05,
                color:"#ffffff",
                textShadow:"0 0 6px rgba(255,255,255,.9),0 0 40px rgba(200,230,255,.6),0 6px 0 rgba(0,0,0,1),0 12px 28px rgba(0,0,0,1)",
                animation:"tensionR 1.9s cubic-bezier(.16,1,.3,1) both",
              }}>
                One Final<br />Chance
              </div>
            </div>
          )}

          {/* ── PHASE 5: FIFA WORLD CUP ──────────────────────────────── */}
          {vis(5) && phase <= 5 && (
            <div style={{textAlign:"center",lineHeight:1}}>
              <p style={{fontFamily:"var(--font-data)",fontSize:"clamp(10px,1.2vw,15px)",letterSpacing:"0.5em",textTransform:"uppercase",marginBottom:"0.7em",color:"#00e5ff",textShadow:"0 0 28px rgba(0,229,255,1),0 0 60px rgba(0,229,255,.6)",animation:"fadeUp .6s ease both"}}>
                ⚽ Messi · Ronaldo · The Last Dance ⚽
              </p>
              <div style={{
                fontFamily:"var(--font-display)",
                fontSize:"clamp(32px,6.5vw,94px)",
                fontWeight:900,letterSpacing:"0.13em",textTransform:"uppercase",lineHeight:1,
                color:"#ffffff",
                animation:"slamDown .75s cubic-bezier(.16,1,.3,1) both, chromaLoop 2.8s ease infinite .8s",
              }}>
                FIFA WORLD CUP
              </div>
            </div>
          )}

          {/* ── PHASE 6: 2026 ────────────────────────────────────────── */}
          {vis(6) && (
            <div style={{
              fontFamily:"var(--font-display)",
              fontSize:"clamp(90px,21vw,280px)",
              fontWeight:900,lineHeight:.82,letterSpacing:"0.09em",
              color:"#d3f340",
              textShadow:"0 0 4px #fff9a0,0 0 18px #d3f340,0 0 55px rgba(211,243,64,.95),0 0 130px rgba(211,243,64,.8),0 0 220px rgba(180,220,0,.55),0 7px 0 rgba(0,0,0,1),0 14px 36px rgba(0,0,0,.95)",
              animation:"yearCrash .9s cubic-bezier(.22,1.36,.4,1) both",
            }}>
              2026
            </div>
          )}

          {/* ── PHASE 7: Globe ───────────────────────────────────────── */}
          {vis(7) && (
            <div style={{width:"clamp(130px,18vw,210px)",height:"clamp(130px,18vw,210px)",animation:"slamDown .9s cubic-bezier(.22,1.36,.4,1) both"}}>
              <GlobeWrapper />
            </div>
          )}

          {/* ── PHASE 8: Brand ───────────────────────────────────────── */}
          {vis(8) && (
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:"clamp(34px,5.2vw,70px)",fontWeight:800,letterSpacing:"-0.01em",lineHeight:1}}>
                <span style={{color:"#ffffff",textShadow:"0 0 6px rgba(255,255,255,1),0 0 24px rgba(0,229,255,1),0 0 60px rgba(0,200,255,.8),0 5px 0 rgba(0,0,0,1),0 10px 20px rgba(0,0,0,.9)"}}>
                  <Reveal text="WorldCup" delay={0} />
                </span>
                <span style={{color:"#d3f340",textShadow:"0 0 6px #fffb80,0 0 22px #d3f340,0 0 60px rgba(211,243,64,.95),0 5px 0 rgba(0,0,0,1),0 10px 20px rgba(0,0,0,.9)"}}>
                  <Reveal text="IQ" delay={480} />
                </span>
              </div>
              <p style={{fontFamily:"var(--font-data)",fontSize:"clamp(9px,1.1vw,13px)",letterSpacing:"0.42em",textTransform:"uppercase",marginTop:"0.7em",color:"#00e5ff",textShadow:"0 0 20px rgba(0,229,255,1)",animation:"fadeUp .6s ease .5s both"}}>
                Intelligence · Analytics · Predictions
              </p>
            </div>
          )}

          {/* Tagline */}
          {vis(8) && (
            <p style={{fontFamily:"var(--font-body)",fontSize:"clamp(13px,1.4vw,17px)",fontWeight:500,color:"#f0f8ff",textAlign:"center",maxWidth:480,lineHeight:1.72,textShadow:"0 2px 14px rgba(0,0,0,1)",animation:"fadeUp .8s ease .3s both",padding:"0 12px"}}>
              48 nations.{" "}<strong style={{color:"#d3f340",textShadow:"0 0 16px rgba(211,243,64,.9)"}}>104 matches.</strong>{" "}One prediction engine.
              <br /><span style={{color:"rgba(180,230,255,.85)"}}>Live data from the tournament, minute by minute.</span>
            </p>
          )}

          {/* ── PHASE 9: CTA ─────────────────────────────────────────── */}
          {vis(9) && (
            <button
              onClick={e => { e.stopPropagation(); handleEnter(); }}
              style={{
                marginTop:12,padding:"18px 72px",
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
              onMouseEnter={e => {(e.currentTarget as HTMLElement).style.transform="scale(1.08)";(e.currentTarget as HTMLElement).style.filter="brightness(1.25)";}}
              onMouseLeave={e => {(e.currentTarget as HTMLElement).style.transform="scale(1)";(e.currentTarget as HTMLElement).style.filter="brightness(1)";}}
            >
              ⚡ Enter the IQ →
            </button>
          )}
        </div>

        {/* Filmstrip */}
        {vis(8) && (
          <div style={{position:"absolute",bottom:"9.5vh",left:0,right:0,height:"clamp(50px,8vh,74px)",display:"flex",gap:3,overflow:"hidden",animation:"fadeUp .9s ease .4s both",zIndex:10}}>
            {["/images/players_action.jpg","/images/trophy1.jpg","/images/ball_field.jpg","/images/football1.jpg","/images/referee.jpg"].map((src,i) => (
              <div key={i} style={{flex:1,backgroundImage:`url(${src})`,backgroundSize:"cover",backgroundPosition:"center",opacity:.4,filter:"saturate(.5)"}} />
            ))}
            <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,#000 0%,transparent 14%,transparent 86%,#000 100%)"}} />
          </div>
        )}

        {/* Rainbow line */}
        {vis(2) && (
          <div style={{position:"absolute",bottom:"9.5vh",left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,#ff007f 15%,#00e5ff 35%,#d3f340 50%,#00e5ff 65%,#ff007f 85%,transparent)",animation:"barSlide .9s ease .2s both",opacity:.65,zIndex:9}} />
        )}

        {/* Controls */}
        <div style={{position:"absolute",bottom:"calc(9.5vh + 14px)",right:20,display:"flex",gap:8,zIndex:15}}>
          <button
            onClick={e => { e.stopPropagation(); audio.toggle(); }}
            style={{background:"rgba(0,0,0,.6)",border:"1px solid rgba(255,255,255,.18)",borderRadius:9999,color:"#fff",padding:"6px 14px",fontSize:11,cursor:"pointer",fontFamily:"var(--font-data)",letterSpacing:"0.1em",backdropFilter:"blur(14px)"}}
          >
            {!audio.started?"▶ SOUND":audio.muted?"🔇 MUTED":"🔊 ON"}
          </button>
          {vis(2) && (
            <button
              onClick={e => { e.stopPropagation(); handleEnter(); }}
              style={{background:"rgba(0,0,0,.6)",border:"1px solid rgba(255,255,255,.14)",borderRadius:9999,color:"rgba(255,255,255,.5)",padding:"6px 14px",fontSize:11,cursor:"pointer",fontFamily:"var(--font-data)",letterSpacing:"0.1em",backdropFilter:"blur(14px)"}}
            >
              SKIP ▶
            </button>
          )}
        </div>

        {/* Progress dots */}
        {vis(2) && (
          <div style={{position:"absolute",bottom:"calc(9.5vh + 18px)",left:"50%",transform:"translateX(-50%)",display:"flex",gap:5,zIndex:15}}>
            {[1,2,3,4,5,6,7,8,9].map(p => (
              <div key={p} style={{width:p<=phase?20:5,height:3,borderRadius:2,background:p<=phase?"#d3f340":"rgba(255,255,255,.18)",transition:"all .4s ease",boxShadow:p<=phase?"0 0 10px rgba(211,243,64,.8)":undefined}} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
