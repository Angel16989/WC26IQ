import Link from "next/link";

const TECH_STACK = [
  { label: "Data Source",    value: "ESPN Live API · refreshed every 10 min",   accent: "#00e5ff" },
  { label: "Players",        value: "1,246 real WC 2026 squad members",          accent: "#4ade80" },
  { label: "Fixtures",       value: "104 matches · live scores & events",        accent: "#d3f340" },
  { label: "Prediction",     value: "DC-corrected Poisson (Dixon-Coles 1997)",   accent: "#a78bfa" },
  { label: "Simulation",     value: "8,000 Monte Carlo tournament iterations",   accent: "#fb923c" },
  { label: "AI Research",    value: "VOID · OpenClaw web scraping on tower PC",  accent: "#f472b6" },
];

const FORMULA_STEPS = [
  { step: "01", title: "Team Strength Prior",    desc: "Normalised from group stage points, squad depth, and historical WC record. Weighted at 52% of the model." },
  { step: "02", title: "Form Index",             desc: "Last 5 match results: W=+1, D=0, L=-1, recency-decayed. Contributes 22% weight." },
  { step: "03", title: "Squad Depth",            desc: "Bench quality and positional coverage based on 1,246 real player profiles. 16% weight." },
  { step: "04", title: "Poisson Score Matrix",   desc: "Expected goals (λ) fed into a Poisson probability matrix with Dixon-Coles low-score correction (ρ ≈ 0.08) to correct the classic 0-0/1-0 under-prediction." },
  { step: "05", title: "Monte Carlo Simulation", desc: "8,000 independent full-tournament simulations to derive winner probabilities with proper variance. Only Tier 1 teams (ARG, FRA, BRA, GER, ESP, ENG) appear in the top scenarios." },
];

const NAV_LINKS = [
  { href: "/",            label: "Home",         emoji: "🏠" },
  { href: "/teams",       label: "48 Teams",     emoji: "🏳️" },
  { href: "/fixtures",    label: "Fixtures",     emoji: "📅" },
  { href: "/knockout",    label: "⚡ Knockout",   emoji: "" },
  { href: "/predictions", label: "Predictions",  emoji: "🤖" },
  { href: "/simulator",   label: "Simulator",    emoji: "🎲" },
];

export default function AboutPage() {
  return (
    <div className="space-y-12">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="wc-panel relative overflow-hidden rounded-[28px] p-8 sm:p-12">
        <div className="pitch-lines" aria-hidden />
        <div className="stadium-glow" aria-hidden />
        <div className="relative z-10 max-w-2xl">
          <p className="wc-eyebrow text-xs font-semibold">About WorldCupIQ</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Built for football intelligence,
            <br />
            <span style={{ color: "var(--secondary)", textShadow: "0 0 20px rgba(0,229,255,0.4)" }}>
              not for betting
            </span>
          </h1>
          <p className="wc-body mt-4 text-base leading-relaxed">
            WorldCupIQ is a live analytics and prediction platform for the 2026 FIFA World Cup.
            Real squad data, real match scores, real DC-corrected Poisson predictions — all in
            one open analytics command-centre built for fans who want to understand the game
            at a deeper level.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {NAV_LINKS.map(l => (
              <Link key={l.href} href={l.href} className="wc-social-btn">
                {l.emoji && <span>{l.emoji}</span>}
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's powering it ──────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">What's powering it</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TECH_STACK.map(({ label, value, accent }) => (
            <div
              key={label}
              className="wc-panel-muted rounded-2xl px-5 py-4"
              style={{ borderTopColor: accent + "70" }}
            >
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: accent, fontFamily: "var(--font-data)" }}
              >
                {label}
              </p>
              <p className="text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Prediction formula ───────────────────────────────────────── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">How the prediction model works</h2>
          <p className="wc-body text-sm mt-2">
            Based on Dixon–Coles (1997) with modern xG calibrations. No black box — every
            component is explained below.
          </p>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div
            className="absolute left-6 top-8 bottom-8 w-px hidden sm:block"
            style={{ background: "linear-gradient(180deg, var(--secondary), var(--accent))", opacity: 0.25 }}
          />
          <div className="space-y-4">
            {FORMULA_STEPS.map(({ step, title, desc }) => (
              <div key={step} className="flex gap-5">
                <div
                  className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-bold"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,229,255,0.12), rgba(0,229,255,0.04))",
                    border: "1px solid rgba(0,229,255,0.3)",
                    color: "var(--secondary)",
                    fontFamily: "var(--font-data)",
                    flexShrink: 0,
                  }}
                >
                  {step}
                </div>
                <div className="flex-1 wc-panel-muted rounded-2xl px-5 py-4">
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="wc-body text-sm mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formula */}
        <div
          className="rounded-2xl p-5 text-center space-y-2"
          style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(211,243,64,0.2)" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--foreground-soft)", fontFamily: "var(--font-data)" }}>
            Expected Goals Formula
          </p>
          <p
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-data)", color: "var(--accent)" }}
          >
            λ = base_goals × (attack + 0.5) / (defence + 0.5)
          </p>
          <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
            attack = 0.52×strength + 0.22×form + 0.16×squad + 0.10×recent
          </p>
          <p className="text-xs" style={{ color: "var(--foreground-soft)" }}>
            P(home wins) = ΣΣ P(h,a) for h &gt; a — summed over Poisson score matrix
          </p>
        </div>
      </section>

      {/* ── Data sources ─────────────────────────────────────────────── */}
      <section className="wc-panel rounded-[28px] p-8 space-y-5">
        <h2 className="text-2xl font-semibold">Data sources</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { name: "ESPN",       role: "Live fixtures, scores, group standings, player rosters (104 matches, 1,246 players)", url: "espn.com",         icon: "📡" },
            { name: "FIFA",       role: "Official squad announcements, WC 2026 tournament structure, group assignments",        url: "fifa.com",         icon: "🏆" },
            { name: "VOID AI",    role: "OpenClaw web scraping on tower PC — formations, coach info, VOID research engine",     url: "tower · local LLM", icon: "🤖" },
          ].map(s => (
            <div key={s.name} className="wc-panel-muted rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{s.icon}</span>
                <span className="font-semibold">{s.name}</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--foreground-muted)" }}>{s.role}</p>
              <p
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--secondary)", fontFamily: "var(--font-data)" }}
              >
                {s.url}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Built by ─────────────────────────────────────────────────── */}
      <section className="wc-panel-muted rounded-[28px] p-8">
        <div className="flex flex-wrap items-start gap-8">
          <div
            className="shrink-0 flex h-20 w-20 items-center justify-center rounded-3xl text-2xl font-black"
            style={{
              background: "linear-gradient(135deg, rgba(211,243,64,0.18), rgba(0,229,255,0.08))",
              border: "1px solid rgba(211,243,64,0.35)",
              color: "var(--accent)",
              fontFamily: "var(--font-display)",
            }}
          >
            RT
          </div>
          <div className="flex-1 min-w-0">
            <p className="wc-eyebrow text-xs font-semibold mb-1">Built by</p>
            <h3 className="text-2xl font-semibold">Rasik Tiwari</h3>
            <p className="wc-body text-sm mt-1">
              Full-stack developer · Sports analytics enthusiast · 2026 World Cup obsessive
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="https://www.linkedin.com/in/rasik-tiwari/"
                target="_blank" rel="noopener noreferrer"
                className="wc-social-btn"
              >
                <span style={{ fontSize: 10, fontWeight: 800 }}>in</span> LinkedIn
              </a>
              <a
                href="https://github.com/Angel16989"
                target="_blank" rel="noopener noreferrer"
                className="wc-social-btn"
              >
                <span style={{ fontSize: 10, fontWeight: 800 }}>gh</span> GitHub
              </a>
              <a href="mailto:rasiktiwari@limeintel.com" className="wc-social-btn">
                ✉ Email
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Disclaimer ───────────────────────────────────────────────── */}
      <p className="text-center text-xs pb-6" style={{ color: "var(--foreground-soft)" }}>
        All predictions are statistical estimates for analytics and entertainment only.
        Not affiliated with FIFA, ESPN, or any national football association.
        WorldCupIQ © 2026 · Built with Next.js, FastAPI, Three.js & ❤️ for football.
      </p>
    </div>
  );
}
