"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        An unexpected error happened. If this keeps happening, check that all environment variables are set.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md px-4 py-2 text-sm font-medium text-[color:var(--accent-fg)]"
        style={{ background: "var(--accent)" }}
      >
        Try again
      </button>
    </main>
  );
}
