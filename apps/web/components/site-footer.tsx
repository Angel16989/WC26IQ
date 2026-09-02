import Link from "next/link";

const NAV_LINKS = [
  { href: "/",           label: "Home" },
  { href: "/teams",      label: "Teams" },
  { href: "/fixtures",   label: "Fixtures" },
  { href: "/predictions",label: "Predictions" },
  { href: "/simulator",  label: "Simulator" },
];

const SOCIAL_LINKS = [
  {
    href: "https://www.linkedin.com/in/rasik-tiwari/",
    label: "LinkedIn",
    icon: "in",
    accent: "#0077b5",
  },
  {
    href: "https://github.com/Angel16989",
    label: "GitHub",
    icon: "gh",
    accent: "#fff",
  },
  {
    href: "mailto:rasiktiwari@limeintel.com",
    label: "Email",
    icon: "✉",
    accent: "#00e5ff",
  },
];

export function SiteFooter() {
  return (
    <footer className="wc-footer mt-16">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Top row: branding + nav */}
        <div className="grid gap-8 pb-8 md:grid-cols-[1.2fr_1fr_1fr]">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="trophy-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{
                  background: "linear-gradient(135deg, rgba(211,243,64,0.2), rgba(211,243,64,0.06))",
                  border: "1px solid rgba(211,243,64,0.3)",
                }}
              >
                🏆
              </div>
              <div>
                <p
                  className="text-base font-semibold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  WorldCupIQ
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--foreground-soft)", fontFamily: "var(--font-data)", letterSpacing: "0.12em" }}
                >
                  WC 2026 · INTELLIGENCE
                </p>
              </div>
            </div>
            <p className="max-w-xs text-sm leading-relaxed" style={{ color: "var(--foreground-muted)" }}>
              Live analytics, match predictions, and tournament simulation
              for the 2026 FIFA World Cup across USA, Canada & Mexico.
            </p>
            {/* Stats pill */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[["48", "Teams"], ["104", "Matches"], ["16", "Venues"]].map(([num, label]) => (
                <span
                  key={label}
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: "rgba(0,229,255,0.08)",
                    border: "1px solid rgba(0,229,255,0.2)",
                    color: "var(--secondary)",
                    fontFamily: "var(--font-data)",
                  }}
                >
                  {num} {label}
                </span>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <p
              className="mb-4 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--secondary)", fontFamily: "var(--font-data)" }}
            >
              Quick Links
            </p>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm transition-colors"
                    style={{ color: "var(--foreground-muted)" }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--secondary)")}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--foreground-muted)")}
                  >
                    → {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About the builder */}
          <div>
            <p
              className="mb-4 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--accent)", fontFamily: "var(--font-data)" }}
            >
              Built By
            </p>
            <div className="space-y-3">
              <div>
                <p className="text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                  Rasik Tiwari
                </p>
                <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                  Full-stack developer · Sports analytics enthusiast
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {SOCIAL_LINKS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wc-social-btn"
                    style={{ "--accent-color": s.accent } as React.CSSProperties}
                  >
                    <span style={{ fontSize: 10, fontWeight: 800 }}>{s.icon}</span>
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="wc-divider" />

        {/* Bottom row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 text-xs" style={{ color: "var(--foreground-soft)" }}>
          <p>
            © 2026 WorldCupIQ · Built by{" "}
            <a
              href="https://www.linkedin.com/in/rasik-tiwari/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-[var(--secondary)]"
            >
              Rasik Tiwari
            </a>
            {" "}· Powered by Live ESPN Data + VOID AI Research
          </p>
          <p style={{ fontFamily: "var(--font-data)", letterSpacing: "0.12em" }}>
            ⚽ FIFA WORLD CUP 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
