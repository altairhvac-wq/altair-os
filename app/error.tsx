"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Root error boundary. Catches unexpected render/runtime errors and shows a
 * calm, branded recovery screen instead of a blank page or stack trace.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error-boundary]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-altair-paper px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-altair-brass">
        Altair OS
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-altair-ink">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-sm text-altair-ink-secondary">
        An unexpected error interrupted this page. Your data is safe — try
        again, and if it keeps happening use the Feedback button to tell us.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-altair-ink-muted">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center rounded-full bg-altair-ink px-6 py-2.5 text-sm font-semibold text-altair-paper transition-opacity hover:opacity-85"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-altair-border-strong px-6 py-2.5 text-sm font-semibold text-altair-ink transition-colors hover:bg-altair-paper-subtle"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
