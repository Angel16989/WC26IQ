"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { SiteShell } from "./site-shell";

interface RouteShellProps {
  children: ReactNode;
}

const stitchRoutes = new Set(["/", "/teams", "/fixtures", "/predictions", "/simulator"]);

export function RouteShell({ children }: RouteShellProps) {
  const pathname = usePathname();

  if (stitchRoutes.has(pathname)) {
    return <>{children}</>;
  }

  return <SiteShell>{children}</SiteShell>;
}
