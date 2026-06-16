"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-red-200 bg-red-50 p-8">
      <h2 className="text-xl font-semibold text-red-900">Something went wrong</h2>
      <p className="mt-3 text-sm leading-6 text-red-800">
        {error.message || "The placeholder page hit an unexpected error."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-full bg-red-900 px-4 py-2 text-sm font-medium text-white"
      >
        Try again
      </button>
    </div>
  );
}
