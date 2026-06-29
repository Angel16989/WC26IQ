"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";

const GlobeWrapper = dynamic(
  () => import("@/components/globe-wrapper").then((m) => ({ default: m.GlobeWrapper })),
  { ssr: false }
);

/* ── Image pool — cycling backgrounds ───────────────────────────────── */
const BG_IMAGES = [
  "/images/stadium1.jpg",
  "/images/crowd1.jpg",
  "/images/stadium_night.jpg",
  "/images/stadium2.jpg",
  "/images/pitch1.jpg",
];

const OVERLAY_IMAGES = [
  "/images/players_action.jpg",
  "/images/ball_field.jpg",
  "/images/football1.jpg",
  "/images/trophy1.jpg",
];

/* ── Audio engine (Web Audio API) — zero downloads, zero copyright ──── */
function createAudioEngine() {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0.7;
  master.connect(ctx.destination);

  function brownNoise(duration: number, volume: number) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 300;
    bp.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.5);
    gain.gain.setValueAtTime(volume, ctx.currentTime + duration - 1);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(master);
    src.start();
    src.stop(ctx.currentTime + duration);
  }

  function bassDrum(when: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(80, when);
    osc.frequency.exponentialRampToValueAtTime(20, when + 0.4);
    gain.gain.setValueAtTime(1.2, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.6);
    osc.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + 0.6);
  }

  function brassNote(freq: number, when: number, duration: number, vol = 0.5) {
    [1, 2, 3, 4].forEach((harmonic) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = freq * harmonic;
      osc.detune.value = (Math.random() - 0.5) * 8;
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(vol / harmonic, when + 0.05);
      gain.gain.setValueAtTime(vol / harmonic, when + duration - 0.1);
      gain.gain.linearRampToValueAtTime(0, when + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(when);
      osc.stop(when + duration + 0.05);
    });
  }

  function crowdRise(when: number, duration: number) {
    for (let i = 0; i < 8; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 220 + Math.random() * 600;
      osc.frequency.linearRampToValueAtTime(
        880 + Math.random() * 800,
        when + duration
      );
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(0.04, when + duration * 0.5);
      gain.gain.linearRampToValueAtTime(0.08, when + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(when + i * 0.05);
      osc.stop(when + duration + 0.1);
    }
  }

  function whistle(when: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(2200, when);
    osc.frequency.linearRampToValueAtTime(2600, when + 0.1);
    osc.frequency.setValueAtTime(2400, when + 0.2);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(0.4, when + 0.05);
    gain.gain.setValueAtTime(0.4, when + 0.25);
    gain.gain.linearRampToValueAtTime(0, when + 0.4);
    osc.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + 0.5);
  }

  // Orchestrate the full intro score
  function playCinematicIntro() {
    const t = ctx.currentTime + 0.05;
    brownNoise(18, 0.18);                // stadium crowd ambience throughout
    bassDrum(t + 0.3);                   // opening boom
    bassDrum(t + 0.7);
    brassNote(146.83, t + 1.5, 0.8);    // D note — builds up
    brassNote(174.61, t + 2.1, 0.8);    // F note
    brassNote(220.00, t + 2.7, 0.6);    // A note
    bassDrum(t + 3.0);                   // drum on text reveal
    brassNote(261.63, t + 3.2, 1.2, 0.6); // C — "FIFA" reveal
    bassDrum(t + 4.5);
    // "2026" slam
    bassDrum(t + 5.0);
    brassNote(196.00, t + 5.0, 0.4, 0.7);
    brassNote(261.63, t + 5.3, 0.4, 0.7);
    brassNote(329.63, t + 5.6, 0.5, 0.7);
    brassNote(392.00, t + 5.9, 1.5, 0.8); // G — triumphant
    // Rising crowd
    crowdRise(t + 7.0, 3.0);
    // Whistle + fanfare for WorldCupIQ reveal
    whistle(t + 7.5);
    brassNote(130.81, t + 8.0, 0.3, 0.5);
    brassNote(164.81, t + 8.3, 0.3, 0.5);
    brassNote(196.00, t + 8.6, 0.3, 0.5);
    brassNote(261.63, t + 8.9, 2.0, 0.7);
    // Final chord
    [261.63, 329.63, 392.00, 523.25].forEach((f, i) => {
      brassNote(f, t + 11.0, 3.0, 0.35 - i * 0.05);
    });
    crowdRise(t + 11.0, 3.0);
  }

  return { playCinematicIntro, ctx };
}

/* ── Phase constants ─────────────────────────────────────────────────── */
// 0=black  1=lights  2=stadium  3=bars  4=fifa  5=2026  6=globe  7=wciq  8=tagline  9=enter  10=exit
type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
const PHASE_DELAYS: Record<number, number> = {
  0: 0, 1: 400, 2: 1000, 3: 1800, 4: 2800, 5: 4200, 6: 5400,
  7: 6800, 8: 8000, 9: 9200, 10: 99999,
};

/* ── Character reveal helper ─────────────────────────────────────────── */
function CharReveal({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={className} style={{ display: "inline-block" }}>
      {text.split("").map((ch, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            animation: `charReveal 0.3s cubic-bezier(0.16,1,0.3,1) ${delay + i * 55}ms both`,
          }}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */
export function LandingIntro({ onEnter }: { onEnter: () => void }) {
  const [phase, setPhase] = useState<Phase>(0);
  const [bgIdx, setBgIdx] = useState(0);
  const [muted, setMuted] = useState(false);
  const [musicStarted, setMusicStarted] = useState(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const phaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback((next: Phase) => {
    if (phaseTimer.current) clearTimeout(phaseTimer.current);
    setPhase(next);
    if (next < 10) {
      const nextNext = (next + 1) as Phase;
      if (nextNext <= 9) {
        const delay = PHASE_DELAYS[nextNext] - PHASE_DELAYS[next];
        phaseTimer.current = setTimeout(() => advance(nextNext), delay);
      }
    }
  }, []);

  // Cycle background images every 4 seconds from phase 2 onward
  useEffect(() => {
    if (phase < 2) return;
    const t = setInterval(() => setBgIdx((i) => (i + 1) % BG_IMAGES.length), 4000);
    return () => clearInterval(t);
  }, [phase]);

  // Start animation sequence
  useEffect(() => {
    phaseTimer.current = setTimeout(() => advance(1), PHASE_DELAYS[1]);
    return () => { if (phaseTimer.current) clearTimeout(phaseTimer.current); };
  }, [advance]);

  const handleEnter = useCallback(() => {
    sessionStorage.setItem("wciq_intro_seen", "1");
    setPhase(10);
    if (musicRef.current) {
      musicRef.current.pause();
    }
    setTimeout(onEnter, 900);
  }, [onEnter]);

  // Start real HTML5 audio on first user gesture
  const startMusic = useCallback(() => {
    if (musicStarted) return;
    setMusicStarted(true);
    try {
      const audio = new Audio("/audio/wc_anthem.mp3");
      audio.loop = true;
      audio.volume = 0.55;
      audio.muted = false;
      musicRef.current = audio;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // autoplay blocked — user must click mute button to start
          setMusicStarted(false);
        });
      }
    } catch {}
  }, [musicStarted]);

  const toggleMute = useCallback(() => {
    if (!musicStarted) {
      startMusic();
      setMuted(false);
      return;
    }
    if (musicRef.current) {
      musicRef.current.muted = !musicRef.current.muted;
      setMuted(musicRef.current.muted);
    }
  }, [musicStarted, startMusic]);

  // Clean up music on unmount
  useEffect(() => {
    return () => {
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current = null;
      }
    };
  }, []);

  const isVisible = (minPhase: Phase) => phase >= minPhase;

  return (
    <>
      {/* Inject keyframes */}
      <style>{`
        /* ── Mobile overrides ──────────────────────────────────── */
        @media (max-width: 480px) {
          .lp-content { gap: 8px !important; }
          .lp-year    { font-size: clamp(64px, 22vw, 100px) !important; }
          .lp-title   { font-size: clamp(22px, 7vw, 42px) !important; }
          .lp-wciq    { font-size: clamp(28px, 9vw, 52px) !important; }
          .lp-globe   { width: 120px !important; height: 120px !important; }
          .lp-bar     { height: 5vh !important; }
          .lp-inset   { inset: 5vh 0 !important; }
          .lp-strip   { height: 48px !important; }
          .lp-tagline { font-size: 13px !important; }
        }
        @keyframes charReveal {
          from { opacity: 0; transform: translateY(28px) rotateX(-45deg); filter: blur(3px); }
          to   { opacity: 1; transform: none; filter: none; }
        }
        @keyframes slamIn {
          0%   { opacity: 0; transform: scale(3) rotate(-4deg); filter: blur(12px); }
          60%  { transform: scale(0.96) rotate(0.5deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); filter: none; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(60px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes barTop {
          from { transform: translateY(-100%); }
          to   { transform: translateY(0); }
        }
        @keyframes barBottom {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes lightBeam {
          0%   { opacity: 0; transform: scaleY(0) translateY(-50%); }
          50%  { opacity: 0.7; transform: scaleY(1.2) translateY(0); }
          100% { opacity: 0.25; transform: scaleY(1) translateY(0); }
        }
        @keyframes pulseCTA {
          0%, 100% { box-shadow: 0 0 0 0 rgba(211,243,64,0), 0 0 40px rgba(211,243,64,0.3); }
          50%       { box-shadow: 0 0 0 16px rgba(211,243,64,0), 0 0 80px rgba(211,243,64,0.6); }
        }
        @keyframes bgZoom {
          from { transform: scale(1.08); }
          to   { transform: scale(1.0); }
        }
        @keyframes scanline {
          from { background-position: 0 0; }
          to   { background-position: 0 100%; }
        }
        @keyframes exitScale {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0; transform: scale(1.08); }
        }
        @keyframes glitch {
          0%, 90%, 100% { clip-path: none; transform: none; }
          92%  { clip-path: inset(30% 0 50% 0); transform: translateX(-4px); }
          94%  { clip-path: inset(60% 0 10% 0); transform: translateX(4px); }
          96%  { clip-path: inset(10% 0 80% 0); transform: translateX(-2px); }
          98%  { clip-path: none; transform: none; }
        }
        @keyframes countUp2026 {
          from { letter-spacing: 0.8em; opacity: 0; transform: scale(0.6); }
          to   { letter-spacing: 0.15em; opacity: 1; transform: scale(1); }
        }
        @keyframes fadeInBg {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .landing-img-bg {
          animation: bgZoom 8s ease forwards, fadeInBg 1.5s ease forwards;
        }
        .landing-exit {
          animation: exitScale 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>

      {/* ── Full-screen container ─────────────────────────────────────── */}
      <div
        className={phase === 10 ? "landing-exit" : ""}
        onClick={phase >= 9 ? handleEnter : startMusic}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          overflow: "hidden",
          background: "#000",
          cursor: phase >= 9 ? "pointer" : "default",
        }}
      >
        {/* ── Stadium background (cycling images) ─────────────────── */}
        {isVisible(2) && (
          <div
            className="landing-img-bg"
            key={bgIdx}
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${BG_IMAGES[bgIdx]})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0,
            }}
          />
        )}

        {/* Dark overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: isVisible(2)
              ? "linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(4,4,12,0.85) 60%, rgba(0,0,0,0.94) 100%)"
              : "#000",
            transition: "background 1.5s ease",
          }}
        />

        {/* Scanline overlay — cinematic effect */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
            pointerEvents: "none",
            opacity: 0.5,
          }}
        />

        {/* ── Stadium spotlight beams ──────────────────────────────── */}
        {isVisible(1) && [0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 0,
              left: `${18 + i * 22}%`,
              width: "3px",
              height: "60vh",
              transformOrigin: "top center",
              background: `linear-gradient(180deg, rgba(255,255,220,0.9), transparent)`,
              animation: `lightBeam 1.2s cubic-bezier(0.16,1,0.3,1) ${i * 180}ms both`,
              filter: "blur(6px)",
              pointerEvents: "none",
            }}
          />
        ))}

        {/* ── Cinematic letterbox bars ─────────────────────────────── */}
        {isVisible(3) && (
          <>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "9vh",
              background: "#000",
              animation: "barTop 0.7s cubic-bezier(0.16,1,0.3,1) both",
            }} />
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: "9vh",
              background: "#000",
              animation: "barBottom 0.7s cubic-bezier(0.16,1,0.3,1) both",
            }} />
          </>
        )}

        {/* ── Main content ─────────────────────────────────────────── */}
        <div style={{
          position: "absolute",
          inset: "9vh 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(12px, 2.5vh, 28px)",
        }}
        className="lp-content">

          {/* Dark radial fog behind all text — ensures legibility on any bg image */}
          {isVisible(4) && (
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(ellipse 80% 70% at 50% 48%, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.55) 50%, transparent 80%)",
                pointerEvents: "none",
              }}
            />
          )}

          {/* FIFA WORLD CUP — letter reveal */}
          {isVisible(4) && (
            <div style={{ textAlign: "center", lineHeight: 1, position: "relative", zIndex: 2 }}>
              {/* Eyebrow */}
              <p style={{
                fontFamily: "var(--font-data)",
                fontSize: "clamp(10px, 1.2vw, 15px)",
                letterSpacing: "0.55em",
                color: "#00e5ff",
                textTransform: "uppercase",
                animation: "slideUp 0.6s ease both",
                marginBottom: "0.7em",
                textShadow: "0 0 20px rgba(0,229,255,0.9), 0 0 40px rgba(0,229,255,0.5)",
              }}>
                ⚽ The Future of Football Analytics ⚽
              </p>
              {/* Main headline */}
              <div style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(30px, 5.8vw, 80px)",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                lineHeight: 1,
                animation: "glitch 4s ease infinite 1s",
                /* Chrome/metallic gradient */
                background: "linear-gradient(180deg, #ffffff 0%, #c8e8ff 35%, #90c8ff 55%, #ffffff 80%, #d0ecff 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                /* Layered glow: soft halo + hard outline + depth shadow */
                filter: [
                  "drop-shadow(0 0 2px rgba(255,255,255,1))",
                  "drop-shadow(0 0 12px rgba(120,190,255,0.9))",
                  "drop-shadow(0 0 40px rgba(60,140,255,0.7))",
                  "drop-shadow(0 4px 0 rgba(0,0,0,0.95))",
                  "drop-shadow(0 8px 16px rgba(0,0,0,0.8))",
                ].join(" "),
              }}>
                <CharReveal text="FIFA WORLD CUP" delay={0} />
              </div>
            </div>
          )}

          {/* 2026 — slam in */}
          {isVisible(5) && (
            <div
              className="lp-year"
              style={{
                position: "relative",
                zIndex: 2,
                fontFamily: "var(--font-display)",
                fontSize: "clamp(88px, 19vw, 240px)",
                fontWeight: 900,
                lineHeight: 0.85,
                letterSpacing: "0.12em",
                background: "linear-gradient(175deg, #fffde0 0%, #f5e642 18%, #d3f340 38%, #aacc1a 55%, #f0ff60 72%, #d3f340 88%, #96b800 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "countUp2026 0.8s cubic-bezier(0.22,1.36,0.4,1) both",
                filter: [
                  "drop-shadow(0 0 4px rgba(255,255,180,1))",
                  "drop-shadow(0 0 24px rgba(211,243,64,1))",
                  "drop-shadow(0 0 60px rgba(211,243,64,0.8))",
                  "drop-shadow(0 6px 0 rgba(0,0,0,0.95))",
                  "drop-shadow(0 12px 24px rgba(0,0,0,0.8))",
                ].join(" "),
              }}>
              2026
            </div>
          )}

          {/* 3D Globe */}
          {isVisible(6) && (
            <div style={{
              position: "relative",
              zIndex: 2,
              width: "clamp(160px, 22vw, 260px)",
              height: "clamp(160px, 22vw, 260px)",
              animation: "slamIn 1.2s cubic-bezier(0.22,1.36,0.4,1) both",
            }}>
              <GlobeWrapper />
            </div>
          )}

          {/* WorldCupIQ */}
          {isVisible(7) && (
            <div style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
              <div style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(36px, 5.5vw, 72px)",
                fontWeight: 800,
                letterSpacing: "-0.01em",
                lineHeight: 1,
              }}>
                {/* "WorldCup" — bright electric cyan */}
                <span style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #a0f0ff 35%, #00e5ff 60%, #80f8ff 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: [
                    "drop-shadow(0 0 2px rgba(255,255,255,1))",
                    "drop-shadow(0 0 16px rgba(0,229,255,1))",
                    "drop-shadow(0 0 48px rgba(0,180,255,0.8))",
                    "drop-shadow(0 4px 0 rgba(0,0,0,0.95))",
                  ].join(" "),
                }}>
                  <CharReveal text="WorldCup" delay={0} />
                </span>
                {/* "IQ" — hot lime green, extra punch */}
                <span style={{
                  background: "linear-gradient(135deg, #f0ff70 0%, #d3f340 35%, #ffe000 60%, #d3f340 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: [
                    "drop-shadow(0 0 2px rgba(255,255,180,1))",
                    "drop-shadow(0 0 16px rgba(211,243,64,1))",
                    "drop-shadow(0 0 48px rgba(180,220,0,0.8))",
                    "drop-shadow(0 4px 0 rgba(0,0,0,0.95))",
                  ].join(" "),
                }}>
                  <CharReveal text="IQ" delay={550} />
                </span>
              </div>
              {/* Tagline bar */}
              <div style={{
                fontFamily: "var(--font-data)",
                fontSize: "clamp(9px, 1.1vw, 14px)",
                letterSpacing: "0.4em",
                color: "#00e5ff",
                textTransform: "uppercase",
                marginTop: "0.6em",
                animation: "slideUp 0.5s ease 0.3s both",
                textShadow: "0 0 16px rgba(0,229,255,0.9), 0 0 32px rgba(0,229,255,0.5)",
              }}>
                Intelligence · Analytics · Predictions
              </div>
            </div>
          )}

          {/* Tagline */}
          {isVisible(8) && (
            <p style={{
              fontFamily: "var(--font-body)",
              fontSize: "clamp(14px, 1.5vw, 18px)",
              fontWeight: 500,
              color: "#f0f8ff",
              textAlign: "center",
              maxWidth: 520,
              lineHeight: 1.7,
              animation: "slideUp 0.7s ease both",
              padding: "0 24px",
              position: "relative",
              zIndex: 2,
              textShadow: "0 2px 8px rgba(0,0,0,1), 0 0 24px rgba(0,0,0,0.9)",
            }}>
              48 nations.{" "}
              <span style={{ color: "#d3f340", textShadow: "0 0 12px rgba(211,243,64,0.8)" }}>104 matches.</span>
              {" "}One prediction engine.
              <br />
              <span style={{ color: "rgba(180,230,255,0.85)" }}>
                Live data from the tournament, minute by minute.
              </span>
            </p>
          )}

          {/* Enter button */}
          {isVisible(9) && (
            <button
              onClick={(e) => { e.stopPropagation(); handleEnter(); }}
              style={{
                marginTop: 12,
                position: "relative",
                zIndex: 2,
                padding: "18px 64px",
                fontSize: "clamp(14px, 1.5vw, 18px)",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#000",
                background: "linear-gradient(135deg, #f0ff70, #d3f340 40%, #aacc1a 70%, #d3f340)",
                border: "2px solid rgba(255,255,255,0.3)",
                borderRadius: 9999,
                cursor: "pointer",
                animation: "slamIn 0.6s cubic-bezier(0.22,1.36,0.4,1) both, pulseCTA 2s ease 0.6s infinite",
                transition: "transform 0.2s, filter 0.2s",
                boxShadow: "0 0 32px rgba(211,243,64,0.5), 0 8px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.4)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1.07)";
                (e.currentTarget as HTMLElement).style.filter = "brightness(1.2) saturate(1.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                (e.currentTarget as HTMLElement).style.filter = "brightness(1)";
              }}
            >
              ⚡ Enter the IQ →
            </button>
          )}
        </div>

        {/* ── Image strip — bottom overlay ─────────────────────────── */}
        {isVisible(7) && (
          <div style={{
            position: "absolute",
            bottom: "9vh",
            left: 0,
            right: 0,
            height: "clamp(60px, 10vh, 90px)",
            display: "flex",
            gap: 4,
            overflow: "hidden",
            animation: "slideUp 0.8s ease 0.2s both",
          }}>
            {OVERLAY_IMAGES.map((src, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  backgroundImage: `url(${src})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.5,
                  filter: "saturate(0.6)",
                }}
              />
            ))}
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, #000 0%, transparent 10%, transparent 90%, #000 100%)",
            }} />
          </div>
        )}

        {/* ── Top bar — event info ──────────────────────────────────── */}
        {isVisible(3) && (
          <div style={{
            position: "absolute",
            top: "9vh",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 24px",
            animation: "slideUp 0.6s ease both",
          }}>
            <span style={{
              fontFamily: "var(--font-data)",
              fontSize: 11,
              color: "rgba(255,255,255,0.75)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textShadow: "0 1px 8px rgba(0,0,0,0.9), 0 0 16px rgba(0,0,0,0.7)",
            }}>
              🇺🇸 USA · 🇨🇦 Canada · 🇲🇽 Mexico
            </span>
            <span style={{
              fontFamily: "var(--font-data)",
              fontSize: 11,
              color: "#00e5ff",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textShadow: "0 0 12px rgba(0,229,255,0.9), 0 1px 6px rgba(0,0,0,0.9)",
            }}>
              Jun 11 – Jul 19 · 16 Venues
            </span>
          </div>
        )}

        {/* ── Controls: mute / skip ─────────────────────────────────── */}
        <div style={{
          position: "absolute",
          bottom: "calc(9vh + 16px)",
          right: 24,
          display: "flex",
          gap: 8,
          zIndex: 10,
        }}>
          {/* Mute toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
            title={muted ? "Unmute" : "Mute"}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 9999,
              color: "#fff",
              padding: "6px 14px",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "var(--font-data)",
              letterSpacing: "0.1em",
              backdropFilter: "blur(8px)",
            }}
          >
            {!musicStarted ? "▶ MUSIC" : muted ? "🔇 MUTED" : "🔊 ON"}
          </button>

          {/* Skip */}
          {phase >= 2 && (
            <button
              onClick={(e) => { e.stopPropagation(); handleEnter(); }}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 9999,
                color: "rgba(255,255,255,0.5)",
                padding: "6px 14px",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "var(--font-data)",
                letterSpacing: "0.1em",
                backdropFilter: "blur(8px)",
              }}
            >
              SKIP ▶
            </button>
          )}
        </div>

        {/* Progress dots */}
        {isVisible(3) && (
          <div style={{
            position: "absolute",
            bottom: "calc(9vh + 20px)",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 6,
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((p) => (
              <div
                key={p}
                style={{
                  width: p <= phase ? 20 : 6,
                  height: 4,
                  borderRadius: 2,
                  background: p <= phase ? "var(--accent)" : "rgba(255,255,255,0.2)",
                  transition: "all 0.4s ease",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
