"use client";

import { useEffect } from "react";

/**
 * Last-resort error boundary.
 *
 * ==================== WHAT THIS CATCHES THAT app/error.tsx DOES NOT ====================
 * `app/error.tsx` is rendered INSIDE the root layout, so it only helps when the
 * layout itself succeeded. A throw in `app/layout.tsx` — a font import, a
 * provider, the metadata resolution — happens before that boundary exists, and
 * Next.js falls back to its own unstyled default page.
 *
 * `global-error.tsx` replaces the entire document, which is why it must render
 * its own <html> and <body>: at this point nothing else has.
 *
 * ==================== NO DESIGN SYSTEM HERE ====================
 * The styles are inline on purpose. If the root layout threw, `globals.css`
 * and the font variables it establishes may not have loaded, so every Tailwind
 * class could resolve to nothing. A recovery screen that depends on the thing
 * that just broke is not a recovery screen. The colours are the Altair paper
 * and ink values written literally, and the page respects the viewer's colour
 * scheme without needing a stylesheet.
 *
 * ==================== NO STACK TRACE ====================
 * Users see the digest and nothing else. The digest is what correlates this
 * page with the server-side record; the message and stack could contain query
 * fragments, ids, or customer data and are deliberately not rendered.
 *
 * Monitoring is unaffected: server exceptions still reach Sentry through
 * `onRequestError` in instrumentation.ts, which runs on the server before this
 * component is ever involved.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The one place a client-side root failure is recorded. Kept to
    // console.error rather than a monitoring call because at this point the
    // application bundle may be the thing that failed to evaluate.
    console.error("[global-error-boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "2rem 1.5rem",
          textAlign: "center",
          background: "#f4f7fa",
          color: "#0f172a",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.6875rem",
            fontWeight: 600,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#8a6d3b",
          }}
        >
          Altair OS
        </p>

        <h1
          style={{
            margin: "0.5rem 0 0",
            fontSize: "1.75rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          Something went wrong
        </h1>

        <p
          style={{
            margin: 0,
            maxWidth: "34rem",
            fontSize: "0.9375rem",
            lineHeight: 1.6,
            color: "#475569",
          }}
        >
          Altair could not finish loading. Your data is safe and nothing was
          lost — reloading usually clears it. If it keeps happening, tell us and
          include the reference below.
        </p>

        {error.digest ? (
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
              color: "#64748b",
            }}
          >
            Reference: {error.digest}
          </p>
        ) : null}

        <div
          style={{
            marginTop: "1.5rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={reset}
            style={{
              appearance: "none",
              border: "none",
              cursor: "pointer",
              borderRadius: "9999px",
              padding: "0.625rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              background: "#0f172a",
              color: "#f4f7fa",
            }}
          >
            Try again
          </button>

          {/*
            A plain anchor, not next/link, and the lint rule is disabled for
            this one line rather than relaxed in configuration.

            @next/next/no-html-link-for-pages is correct everywhere else: an
            <a> to an internal route throws away client-side navigation. Here
            that is the entire point. global-error.tsx renders when the root
            layout itself failed, which means the router may be exactly what did
            not initialize — and a <Link /> that depends on it would leave the
            user with a dead button on the one screen whose only job is to get
            them out. A full document navigation cannot fail the same way.
          */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              borderRadius: "9999px",
              padding: "0.625rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid #cbd5e1",
              color: "#0f172a",
            }}
          >
            Reload Altair
          </a>
        </div>
      </body>
    </html>
  );
}
