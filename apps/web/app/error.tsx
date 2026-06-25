"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="wc-error-panel rounded-[28px] p-8">
      <h2 className="text-xl font-semibold text-[var(--error)]">Something went wrong</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--foreground-muted)]">
        {error.message || "The placeholder page hit an unexpected error."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-full bg-[var(--accent-strong)] px-4 py-2 text-sm font-medium text-[#003915] transition hover:bg-[var(--accent)]"
      >
        Try again
      </button>
    </div>
  );
}
