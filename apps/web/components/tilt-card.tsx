"use client";

import type { ReactNode, MouseEvent, CSSProperties } from "react";
import { useRef, useState, useCallback } from "react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  intensity?: number;
}

export function TiltCard({ children, className = "", style, intensity = 10 }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState<CSSProperties>({
    transform: "perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)",
  });
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotX = (y - 0.5) * -intensity;
    const rotY = (x - 0.5) * intensity;
    setTiltStyle({
      transform: `perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.025)`,
      transition: "transform 80ms linear",
    });
    setGlowPos({ x: x * 100, y: y * 100, opacity: 1 });
  }, [intensity]);

  const handleMouseLeave = useCallback(() => {
    setTiltStyle({
      transform: "perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)",
      transition: "transform 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    });
    setGlowPos((p) => ({ ...p, opacity: 0 }));
  }, []);

  return (
    <div
      ref={cardRef}
      className={className}
      style={{ ...style, ...tiltStyle, transformStyle: "preserve-3d", willChange: "transform" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Highlight glow that follows cursor */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(0,229,255,0.14) 0%, transparent 55%)`,
          opacity: glowPos.opacity,
          transition: "opacity 300ms ease",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <div style={{ position: "relative", zIndex: 2, height: "100%" }}>
        {children}
      </div>
    </div>
  );
}
