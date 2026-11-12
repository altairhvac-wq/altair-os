"use client";
import "./status-page.css";

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
    // React error boundaries swallow the throw, so the browser SDK's global
    // handler never sees it; this is the only place a client render crash
    // can be reported. No-op when NEXT_PUBLIC_SENTRY_DSN is unset.
    // Imported here, not at the top: a static import would ship the whole
    // browser SDK with every page for the sake of a boundary most visitors
    // never hit.
    void import("@sentry/nextjs")
      .then((Sentry) => Sentry.captureException(error, { tags: { boundary: "app" } }))
      .catch(() => {});
  }, [error]);

  return (
    <main className="status-page">
      <p className="status-page__eyebrow">
        Altair Operating System
      </p>
      <h1 className="status-page__title status-page__title--small">
        Something went wrong
      </h1>
      <p className="status-page__text">
        An unexpected error interrupted this page. Your data is safe — try
        again, and if it keeps happening use the Feedback button to tell us.
      </p>
      {error.digest ? (
        <p className="status-page__note">
          Reference: {error.digest}
        </p>
      ) : null}
      <div className="status-page__actions status-page__actions--nowrap">
        <button
          type="button"
          onClick={reset}
          className="status-page__button status-page__button--primary"
        >
          Try again
        </button>
        <Link
          href="/"
          className="status-page__button status-page__button--outline-strong"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
