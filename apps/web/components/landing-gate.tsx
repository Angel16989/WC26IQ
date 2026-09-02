"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { LandingIntro } from "./landing-intro";

interface LandingGateProps {
  children: ReactNode;
}

export function LandingGate({ children }: LandingGateProps) {
  const [showIntro, setShowIntro] = useState<boolean | null>(null);

  useEffect(() => {
    // Only show once per session (not on every page load)
    const seen = sessionStorage.getItem("wciq_intro_seen");
    setShowIntro(!seen);
  }, []);

  const handleEnter = () => setShowIntro(false);

  // While checking sessionStorage (SSR), render nothing to avoid flash
  if (showIntro === null) {
    return (
      <div style={{ minHeight: "100vh", background: "#000" }} />
    );
  }

  return (
    <>
      {showIntro && <LandingIntro onEnter={handleEnter} />}
      <div
        style={{
          opacity: showIntro ? 0 : 1,
          transition: "opacity 0.6s ease 0.2s",
          pointerEvents: showIntro ? "none" : "auto",
        }}
      >
        {children}
      </div>
    </>
  );
}
