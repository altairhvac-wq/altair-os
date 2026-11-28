"use client";

import { useEffect } from "react";

/**
 * The error screen for an embedded calculator.
 *
 * It has a "Try again" button and NO links. The root error screen offers
 * "Go to home page", an in-app link; inside another website's frame that
 * would try to draw the rest of the site there. See
 * shared/lib/resources/embeds.ts.
 */
export default function EmbedError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[embed-error-boundary]", error);
    // Same lazy import as app/error.tsx: loaded only when a boundary is hit. No-op without a DSN.
    void import("@sentry/nextjs")
      .then((Sentry) => Sentry.captureException(error, { tags: { boundary: "embed" } }))
      .catch(() => {});
  }, [error]);

  return (
    <main className="mx-auto max-w-[640px] p-4 text-center">
      <h1 className="text-base font-semibold text-stone-900">The calculator could not load</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-600">Nothing you typed was sent anywhere. Try again.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0d0f0c] px-4 text-[13px] font-semibold text-[#f3ebdd] hover:bg-[#1b1e18]"
      >
        Try again
      </button>
    </main>
  );
}
