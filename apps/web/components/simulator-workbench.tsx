"use client";

import type { TournamentSimulationResponse } from "@worldcupiq/shared";
import { useEffect, useState, useTransition } from "react";

interface SimulatorWorkbenchProps {
  teamCount: number;
}

function probabilityWidth(probability: number) {
  return `${Math.round(probability * 100)}%`;
}

export function SimulatorWorkbench({ teamCount }: SimulatorWorkbenchProps) {
  const [iterations, setIterations] = useState(2000);
  const [seed, setSeed] = useState(2026);
  const [startingStage, setStartingStage] = useState("group");
  const [result, setResult] = useState<TournamentSimulationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadSimulation() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/simulate/tournament", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            iterations,
            seed,
            startingStage,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.detail ?? "Simulation request failed.");
        }

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setResult(payload);
        });
      } catch (simulationError) {
        if (cancelled) {
          return;
        }

        setError(
          simulationError instanceof Error
            ? simulationError.message
            : "Simulation data is temporarily unavailable.",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSimulation();

    return () => {
      cancelled = true;
    };
  }, [iterations, seed, startingStage, startTransition]);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
      <section className="wc-panel rounded-[28px] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="wc-eyebrow text-xs font-semibold">Simulation Engine</p>
            <h2 className="mt-3 text-2xl font-semibold">Run tournament paths</h2>
          </div>
          <div className="rounded-full border border-[var(--border)] bg-[rgba(7,13,31,0.72)] px-3 py-1 font-[var(--font-data)] text-[11px] uppercase tracking-[0.18em] text-[var(--secondary)]">
            {teamCount} Teams
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="wc-data-label text-xs font-semibold">Iterations</span>
            <input
              type="number"
              min={250}
              step={250}
              value={iterations}
              onChange={(event) => setIterations(Number(event.target.value) || 250)}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[rgba(7,13,31,0.82)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--secondary)]"
            />
          </label>

          <label className="block">
            <span className="wc-data-label text-xs font-semibold">Seed</span>
            <input
              type="number"
              value={seed}
              onChange={(event) => setSeed(Number(event.target.value) || 2026)}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[rgba(7,13,31,0.82)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--secondary)]"
            />
          </label>

          <label className="block">
            <span className="wc-data-label text-xs font-semibold">Starting Stage</span>
            <select
              value={startingStage}
              onChange={(event) => setStartingStage(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[rgba(7,13,31,0.82)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--secondary)]"
            >
              <option value="group">Group Stage</option>
              <option value="round_of_16">Round of 16</option>
              <option value="quarterfinal">Quarterfinal</option>
              <option value="semifinal">Semifinal</option>
            </select>
          </label>

          <div className="rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.56)] p-5">
            <p className="wc-data-label text-xs font-semibold">Run Profile</p>
            <p className="wc-body mt-3 text-sm leading-7">
              This uses the current placeholder tournament model and seeded noise from the
              backend so the page works end-to-end right now.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[var(--border)] bg-[rgba(7,13,31,0.72)] px-3 py-1 font-[var(--font-data)] text-[11px] uppercase tracking-[0.16em] text-[var(--accent)]">
                {isLoading ? "Computing" : "Ready"}
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[rgba(7,13,31,0.72)] px-3 py-1 font-[var(--font-data)] text-[11px] uppercase tracking-[0.16em] text-[var(--secondary)]">
                Seed {seed}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="wc-panel rounded-[28px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="wc-eyebrow text-xs font-semibold">Projection Output</p>
            <h2 className="mt-3 text-2xl font-semibold">Likely tournament outcomes</h2>
          </div>
          {result ? (
            <div className="rounded-full border border-[var(--border)] bg-[rgba(7,13,31,0.72)] px-3 py-1 font-[var(--font-data)] text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
              {result.iterations} Iterations
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mt-6 rounded-3xl border border-[rgba(255,180,171,0.28)] bg-[rgba(147,0,10,0.14)] p-5 text-sm text-[var(--error)]">
            {error}
          </div>
        ) : null}

        {!error && !result ? (
          <div className="mt-6 rounded-3xl border border-dashed border-[var(--border)] bg-[rgba(12,19,36,0.52)] p-6 text-sm text-[var(--foreground-muted)]">
            {isLoading ? "Running simulation..." : "Choose settings to generate tournament outcomes."}
          </div>
        ) : null}

        {result ? (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
              <div className="rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.52)] p-5">
                <p className="wc-data-label text-xs font-semibold">Projected Champion</p>
                <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
                  {result.winnerProbabilities[0]?.teamName ?? "Unavailable"}
                </p>
                <p className="wc-data-value mt-2 text-2xl font-semibold text-[var(--accent)]">
                  {Math.round((result.winnerProbabilities[0]?.probability ?? 0) * 100)}%
                </p>
              </div>
              <div className="rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.52)] p-5">
                <p className="wc-data-label text-xs font-semibold">Starting Stage</p>
                <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
                  {result.startingStage.replaceAll("_", " ")}
                </p>
                <p className="wc-body mt-2 text-sm">Seeded with deterministic placeholder noise.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.52)] p-5">
              <p className="wc-data-label text-xs font-semibold">Winner Probabilities</p>
              <div className="mt-4 space-y-3">
                {result.winnerProbabilities.slice(0, 8).map((item) => (
                  <div key={item.teamId}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-semibold text-[var(--foreground)]">{item.teamName}</span>
                      <span className="wc-data-value text-lg font-semibold">
                        {Math.round(item.probability * 100)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[rgba(35,41,60,0.9)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#0b1321,#4be277)]"
                        style={{ width: probabilityWidth(item.probability) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.52)] p-5">
                <p className="wc-data-label text-xs font-semibold">Projected Finalists</p>
                <div className="mt-4 space-y-3">
                  {result.finalists.map((item) => (
                    <div
                      key={item.teamId}
                      className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[rgba(7,13,31,0.72)] px-4 py-3"
                    >
                      <span>{item.teamName}</span>
                      <span className="wc-data-value font-semibold">
                        {Math.round(item.probability * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.52)] p-5">
                <p className="wc-data-label text-xs font-semibold">Projected Semi-Finalists</p>
                <div className="mt-4 space-y-3">
                  {result.semiFinalists.map((item) => (
                    <div
                      key={item.teamId}
                      className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[rgba(7,13,31,0.72)] px-4 py-3"
                    >
                      <span>{item.teamName}</span>
                      <span className="wc-data-value font-semibold">
                        {Math.round(item.probability * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {result.projectedGroupTables.length ? (
              <div className="rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.52)] p-5">
                <p className="wc-data-label text-xs font-semibold">Projected Group Tables</p>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  {result.projectedGroupTables.map((table) => (
                    <div
                      key={table.group}
                      className="rounded-3xl border border-[var(--border)] bg-[rgba(7,13,31,0.72)] p-4"
                    >
                      <p className="text-lg font-semibold text-[var(--foreground)]">
                        Group {table.group}
                      </p>
                      <div className="mt-4 space-y-2">
                        {table.standings.map((row) => (
                          <div
                            key={row.teamId}
                            className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-3 py-2"
                          >
                            <div>
                              <p className="font-semibold text-[var(--foreground)]">{row.teamName}</p>
                              <p className="wc-body text-xs">
                                GD {row.goalDifference} • GF {row.goalsFor}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="wc-data-value text-lg font-semibold">{row.points}</p>
                              <p className="wc-body text-xs">{row.qualificationStatus}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.52)] p-5">
              <p className="wc-data-label text-xs font-semibold">Simulation Notes</p>
              <ul className="wc-body mt-4 space-y-2 text-sm leading-7">
                {result.notes.map((note) => (
                  <li
                    key={note}
                    className="rounded-2xl border border-[var(--border)] bg-[rgba(7,13,31,0.72)] px-4 py-3"
                  >
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
