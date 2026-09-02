"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

interface StaggerListProps {
  children: ReactNode;
  className?: string;
  itemDelay?: number;
}

export function StaggerList({ children, className = "", itemDelay = 55 }: StaggerListProps) {
  const ref          = useRef<HTMLDivElement>(null);
  const hasAnimated  = useRef(false);

  useEffect(() => {
    const container = ref.current;
    if (!container || hasAnimated.current) return;

    const items = Array.from(container.children) as HTMLElement[];
    if (!items.length) return;

    // Hide items initially
    items.forEach((item) => {
      item.style.opacity = "0";
      item.style.transform = "translateY(16px)";
    });

    const animate = () => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;
      items.forEach((item, i) => {
        setTimeout(() => {
          item.style.transition = "opacity 460ms ease, transform 460ms cubic-bezier(0.16, 1, 0.3, 1)";
          item.style.opacity = "1";
          item.style.transform = "none";
        }, i * itemDelay);
      });
    };

    // If already in viewport, animate immediately — fixes mobile/SSR issue
    // where IntersectionObserver fires too late or not at all
    const rect = container.getBoundingClientRect();
    if (rect.top < window.innerHeight * 1.1) {
      // Small delay so CSS paint happens first
      const id = setTimeout(animate, 60);
      return () => clearTimeout(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.05 },
    );

    observer.observe(container);

    // Nuclear fallback — if nothing triggers within 1.2 s, show everything
    const fallback = setTimeout(animate, 1200);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, [itemDelay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
