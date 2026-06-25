"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

interface StaggerListProps {
  children: ReactNode;
  className?: string;
  itemDelay?: number;
}

export function StaggerList({ children, className = "", itemDelay = 60 }: StaggerListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const container = ref.current;
    if (!container || hasAnimated.current) return;

    const items = Array.from(container.children) as HTMLElement[];
    items.forEach((item) => {
      item.style.opacity = "0";
      item.style.transform = "translateY(18px)";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          items.forEach((item, i) => {
            setTimeout(() => {
              item.style.transition = "opacity 480ms ease, transform 480ms cubic-bezier(0.16, 1, 0.3, 1)";
              item.style.opacity = "1";
              item.style.transform = "none";
            }, i * itemDelay);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [itemDelay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
