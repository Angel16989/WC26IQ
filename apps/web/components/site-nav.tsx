"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",            label: "Home",        icon: "🏠", short: "Home"    },
  { href: "/teams",       label: "Teams",       icon: "🏳️",  short: "Teams"   },
  { href: "/fixtures",    label: "Fixtures",    icon: "📅",  short: "Games"   },
  { href: "/knockout",    label: "Knockout",    icon: "⚡",  short: "KO"      },
  { href: "/predictions", label: "Predictions", icon: "🤖",  short: "Predict" },
  { href: "/simulator",   label: "Simulator",   icon: "🎲",  short: "Sim"     },
  { href: "/about",       label: "About",       icon: "ℹ️",  short: "About"   },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-wrap items-center gap-1.5">
      {links.map((link) => {
        const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));

        return (
          <Link
            key={link.href}
            href={link.href}
            title={link.label}
            className="group relative"
            style={{ textDecoration: "none" }}
          >
            <span
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200"
              style={{
                background: isActive
                  ? "linear-gradient(135deg, rgba(211,243,64,0.2), rgba(211,243,64,0.08))"
                  : "rgba(255,255,255,0.04)",
                border: isActive
                  ? "1px solid rgba(211,243,64,0.55)"
                  : "1px solid rgba(255,255,255,0.08)",
                color: isActive ? "var(--accent)" : "var(--foreground-muted)",
                boxShadow: isActive
                  ? "0 0 16px rgba(211,243,64,0.18), inset 0 1px 0 rgba(255,255,255,0.1)"
                  : "inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              {/* Icon */}
              <span
                className="text-base leading-none"
                style={{ filter: isActive ? "drop-shadow(0 0 6px rgba(211,243,64,0.8))" : undefined }}
              >
                {link.icon}
              </span>

              {/* Label — hidden on small screens */}
              <span className="hidden sm:inline">{link.label}</span>
            </span>

            {/* Active underline dot */}
            {isActive && (
              <span
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
