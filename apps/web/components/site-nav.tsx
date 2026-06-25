"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/teams", label: "Teams" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/predictions", label: "Predictions" },
  { href: "/simulator", label: "Simulator" },
  { href: "/about", label: "About" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-wrap gap-2">
      {links.map((link) => {
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              isActive
                ? "wc-nav-link wc-nav-link-active"
                : "wc-nav-link"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
