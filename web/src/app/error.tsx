"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="font-[family-name:var(--font-display)] text-3xl font-bold">Something broke.</p>
      <p className="max-w-md text-sm text-[color:var(--text-2)]">
        The error has been contained to this view — the data and models are unaffected.
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-[color:var(--accent)] px-5 py-2.5 text-sm font-bold text-[color:var(--on-accent)]"
      >
        Try again
      </button>
    </main>
  );
}
