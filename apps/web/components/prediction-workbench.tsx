"use client";

import type {
  Match,
  MatchPredictionResponse,
  Team,
} from "@worldcupiq/shared";
import { useEffect, useState, useTransition } from "react";

import { TeamMark } from "./team-mark";

interface PredictionWorkbenchProps {
  fixtures: Match[];
  teams: Team[];
}

function probabilityWidth(probability: number) {
  return `${Math.round(probability * 100)}%`;
}

export function PredictionWorkbench({
  fixtures,
  teams,
}: PredictionWorkbenchProps) {
  const [selectedFixtureId, setSelectedFixtureId] = useState(fixtures[0]?.id ?? "");
  const [result, setResult] = useState<MatchPredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();

  const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const selectedFixture = fixtureById.get(selectedFixtureId) ?? fixtures[0];

  useEffect(() => {
    if (!selectedFixture) {
      return;
    }

    let cancelled = false;

    async function loadPrediction() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/predict/match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            homeTeamId: selectedFixture.homeTeamId,
            awayTeamId: selectedFixture.awayTeamId,
            includeLikelyScorers: true,
            includeModelNotes: true,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.detail ?? "Prediction request failed.");
        }

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setResult(payload);
        });
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Prediction data is temporarily unavailable.",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPrediction();

    return () => {
      cancelled = true;
    };
  }, [selectedFixture, startTransition]);

  if (!selectedFixture) {
    return (
      <div className="wc-panel rounded-[28px] p-8">
        <p className="wc-body text-sm">
          No fixtures are available yet for prediction analysis.
        </p>
      </div>
    );
  }

  const homeTeam = teamById.get(selectedFixture.homeTeamId);
  const awayTeam = teamById.get(selectedFixture.awayTeamId);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="wc-panel rounded-[28px] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="wc-eyebrow text-xs font-semibold">Prediction Studio</p>
            <h2 className="mt-3 text-2xl font-semibold">Choose a matchup</h2>
          </div>
          <div className="rounded-full border border-[var(--border)] bg-[rgba(7,13,31,0.72)] px-3 py-1 font-[var(--font-data)] text-[11px] uppercase tracking-[0.18em] text-[var(--secondary)]">
            {isLoading ? "Loading" : result?.modelVersion ?? "Ready"}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="wc-data-label text-xs font-semibold">Fixture</span>
            <select
              value={selectedFixtureId}
              onChange={(event) => setSelectedFixtureId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[rgba(7,13,31,0.82)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--secondary)]"
            >
              {fixtures.map((fixture) => {
                const home = teamById.get(fixture.homeTeamId);
                const away = teamById.get(fixture.awayTeamId);

                return (
                  <option key={fixture.id} value={fixture.id}>
                    {(home?.name ?? fixture.homeTeamId).trim()} vs{" "}
                    {(away?.name ?? fixture.awayTeamId).trim()}
                  </option>
                );
              })}
            </select>
          </label>

          <div className="grid gap-3">
            {fixtures.slice(0, 4).map((fixture) => {
              const home = teamById.get(fixture.homeTeamId);
              const away = teamById.get(fixture.awayTeamId);
              const isActive = fixture.id === selectedFixtureId;

              return (
                <button
                  key={fixture.id}
                  type="button"
                  onClick={() => setSelectedFixtureId(fixture.id)}
                  className={`rounded-3xl border px-4 py-4 text-left transition ${
                    isActive
                      ? "border-[rgba(107,255,143,0.5)] bg-[rgba(34,197,94,0.12)] shadow-[0_0_22px_rgba(74,225,118,0.12)]"
                      : "border-[var(--border)] bg-[rgba(12,19,36,0.56)] hover:border-[rgba(76,215,246,0.34)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <TeamMark
                      fifaCode={home?.fifaCode ?? fixture.homeTeamId.toUpperCase()}
                      name={home?.name ?? fixture.homeTeamId}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                        {home?.name ?? fixture.homeTeamId} vs {away?.name ?? fixture.awayTeamId}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--foreground-soft)]">
                        {fixture.stage.replaceAll("_", " ")}
                        {fixture.group ? ` • Group ${fixture.group}` : ""}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="wc-panel rounded-[28px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="wc-eyebrow text-xs font-semibold">Live Output</p>
            <h2 className="mt-3 text-2xl font-semibold">Model forecast</h2>
          </div>
          {result ? (
            <div className="rounded-full border border-[var(--border)] bg-[rgba(7,13,31,0.72)] px-3 py-1 font-[var(--font-data)] text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
              Confidence {result.confidence}
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
            {isLoading ? "Calculating probabilities..." : "Select a fixture to load the forecast."}
          </div>
        ) : null}

        {result ? (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="flex items-center gap-4 rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.52)] p-4">
                <TeamMark
                  fifaCode={homeTeam?.fifaCode ?? result.match.homeTeamId.toUpperCase()}
                  name={result.match.homeTeamName}
                  size="md"
                />
                <div>
                  <p className="text-lg font-semibold">{result.match.homeTeamName}</p>
                  <p className="wc-body text-sm">Home profile</p>
                </div>
              </div>
              <div className="text-center">
                <p className="wc-data-label text-xs font-semibold">Forecast</p>
                <p className="mt-2 text-3xl font-semibold text-[var(--secondary)]">VS</p>
              </div>
              <div className="flex items-center gap-4 rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.52)] p-4">
                <TeamMark
                  fifaCode={awayTeam?.fifaCode ?? result.match.awayTeamId.toUpperCase()}
                  name={result.match.awayTeamName}
                  size="md"
                />
                <div>
                  <p className="text-lg font-semibold">{result.match.awayTeamName}</p>
                  <p className="wc-body text-sm">Away profile</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.52)] p-5">
                <p className="wc-data-label text-xs font-semibold">Home Win</p>
                <p className="wc-data-value mt-3 text-3xl font-semibold">
                  {Math.round(result.homeWinProbability * 100)}%
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(35,41,60,0.9)]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#0b1321,#4be277)]"
                    style={{ width: probabilityWidth(result.homeWinProbability) }}
                  />
                </div>
              </div>
              <div className="rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.52)] p-5">
                <p className="wc-data-label text-xs font-semibold">Draw</p>
                <p className="wc-data-value mt-3 text-3xl font-semibold">
                  {Math.round(result.drawProbability * 100)}%
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(35,41,60,0.9)]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#0b1321,#4cd7f6)]"
                    style={{ width: probabilityWidth(result.drawProbability) }}
                  />
                </div>
              </div>
              <div className="rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.52)] p-5">
                <p className="wc-data-label text-xs font-semibold">Away Win</p>
                <p className="wc-data-value mt-3 text-3xl font-semibold">
                  {Math.round(result.awayWinProbability * 100)}%
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(35,41,60,0.9)]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#0b1321,#fabe22)]"
                    style={{ width: probabilityWidth(result.awayWinProbability) }}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.52)] p-5">
                <p className="wc-data-label text-xs font-semibold">Expected Goals</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="wc-body text-sm">{result.match.homeTeamName}</p>
                    <p className="wc-data-value mt-1 text-3xl font-semibold">
                      {result.expectedGoals.home.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="wc-body text-sm">{result.match.awayTeamName}</p>
                    <p className="wc-data-value mt-1 text-3xl font-semibold">
                      {result.expectedGoals.away.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.52)] p-5">
                <p className="wc-data-label text-xs font-semibold">Likely Scorers</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {result.likelyScorers.map((scorer) => {
                    const scorerTeam = teamById.get(scorer.teamId);

                    return (
                      <div
                        key={scorer.playerId}
                        className="rounded-2xl border border-[var(--border)] bg-[rgba(7,13,31,0.72)] px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <TeamMark
                            fifaCode={scorerTeam?.fifaCode ?? scorer.teamId.toUpperCase()}
                            name={scorerTeam?.name ?? scorer.teamId}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[var(--foreground)]">
                              {scorer.name}
                            </p>
                            <p className="wc-body text-xs">
                              {scorerTeam?.name ?? scorer.teamId}
                            </p>
                          </div>
                        </div>
                        <p className="wc-data-value mt-3 text-xl font-semibold">
                          {Math.round(scorer.probability * 100)}%
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[rgba(12,19,36,0.52)] p-5">
              <p className="wc-data-label text-xs font-semibold">Model Explanation</p>
              <p className="wc-body mt-4 text-sm leading-7">{result.explanation}</p>
              {result.notes?.length ? (
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
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
