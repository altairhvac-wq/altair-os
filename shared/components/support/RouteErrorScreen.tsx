"use client";

import "@/app/status-page.css";

import Link from "next/link";
import { useEffect } from "react";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";

type RouteErrorScreenProps = {
  error: Error & { digest?: string };
  retry: () => void;
  /** Tag for the error report, e.g. "auth" or "setup". */
  boundary: string;
  /** Where the secondary button goes, and what it says. */
  homeHref: string;
  homeLabel: string;
};

/**
 * The error screen for routes where the person may not be signed in yet
 * (sign-in, sign-up, password reset, company setup).
 *
 * Those routes used to fall through to the root error page, which offered
 * "Back to dashboard" to someone with no dashboard and pointed to a Feedback
 * button that is not on these pages. This one offers a way back that works
 * signed out, and the support address.
 */
export function RouteErrorScreen({
  error,
  retry,
  boundary,
  homeHref,
  homeLabel,
}: RouteErrorScreenProps) {
  useEffect(() => {
    console.error(`[${boundary}-error-boundary]`, error);
    // Same lazy import as app/error.tsx: the browser SDK is only loaded when a
    // boundary is actually hit. No-op when NEXT_PUBLIC_SENTRY_DSN is unset.
    void import("@sentry/nextjs")
      .then((Sentry) => Sentry.captureException(error, { tags: { boundary } }))
      .catch(() => {});
  }, [boundary, error]);

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "Problem signing in or setting up Altair",
  )}${
    error.digest
      ? `&body=${encodeURIComponent(`Reference: ${error.digest}\n\nWhat I was doing:\n`)}`
      : ""
  }`;

  return (
    <main className="status-page">
      <p className="status-page__eyebrow">Altair Operating System</p>
      <h1 className="status-page__title status-page__title--small">
        Something went wrong
      </h1>
      <p className="status-page__text">
        This page hit an unexpected error. Nothing you entered was lost on
        our side. Try again, and if it keeps happening email{" "}
        <a href={mailto}>{SUPPORT_EMAIL}</a> and a person will help.
      </p>
      {error.digest ? (
        <p className="status-page__note">Reference: {error.digest}</p>
      ) : null}
      <div className="status-page__actions status-page__actions--nowrap">
        <button
          type="button"
          onClick={() => retry()}
          className="status-page__button status-page__button--primary"
        >
          Try again
        </button>
        <Link
          href={homeHref}
          className="status-page__button status-page__button--outline-strong"
        >
          {homeLabel}
        </Link>
      </div>
    </main>
  );
}
