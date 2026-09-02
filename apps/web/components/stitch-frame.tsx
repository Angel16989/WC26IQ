"use client";

import { useEffect, useRef, useState } from "react";

interface StitchFrameProps {
  src: string;
  title: string;
}

export function StitchFrame({ src, title }: StitchFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState(2200);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return undefined;
    }

    const syncHeight = () => {
      const doc = iframe.contentDocument;
      if (!doc) {
        return;
      }

      const nextHeight = Math.max(
        doc.documentElement.scrollHeight,
        doc.body.scrollHeight,
        1200,
      );
      setHeight(nextHeight);
    };

    const onLoad = () => {
      resizeObserverRef.current?.disconnect();
      syncHeight();

      const doc = iframe.contentDocument;
      if (!doc) {
        return;
      }

      const observer = new ResizeObserver(() => {
        syncHeight();
      });
      observer.observe(doc.documentElement);
      observer.observe(doc.body);
      resizeObserverRef.current = observer;
    };

    iframe.addEventListener("load", onLoad);
    window.addEventListener("resize", syncHeight);

    return () => {
      iframe.removeEventListener("load", onLoad);
      window.removeEventListener("resize", syncHeight);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
  }, [src]);

  return (
    <div className="w-full bg-background">
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        className="block w-full border-0"
        style={{ height }}
      />
    </div>
  );
}
