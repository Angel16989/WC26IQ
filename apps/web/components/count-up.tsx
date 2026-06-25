"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  end: number;
  decimals?: number;
  duration?: number;
  className?: string;
}

export function CountUp({ end, decimals = 0, duration = 1400, className = "" }: CountUpProps) {
  const [value, setValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const runAnimation = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * end);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(runAnimation);
      } else {
        setValue(end);
      }
    };

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          startTimeRef.current = null;
          rafRef.current = requestAnimationFrame(runAnimation);
          observerRef.current?.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observerRef.current.observe(el);

    return () => {
      cancelAnimationFrame(rafRef.current);
      observerRef.current?.disconnect();
    };
  }, [end, duration]);

  return (
    <span ref={spanRef} className={className}>
      {value.toFixed(decimals)}
    </span>
  );
}
