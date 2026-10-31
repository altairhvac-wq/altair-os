import type * as SentryModule from "@sentry/nextjs";

/**
 * Browser instrumentation entry point (Next.js `instrumentation-client.ts`).
 *
 * ==================== WHAT THIS CLOSES ====================
 * Server failures reached the monitor through instrumentation.ts; nothing
 * on the client did. A crash during signup, a Server Action that rejected in
 * the browser, a render error caught by app/error.tsx — all of it ended at
 * `console.error` on a stranger's phone (launch audit H3).
 *
 * ==================== WHAT MUST NEVER LEAVE THE BROWSER ====================
 * The public estimate-approval and invoice-payment pages carry a
 * bearer-equivalent token in their PATH, and the browser SDK records the
 * current URL on every event and on every navigation breadcrumb. `scrubUrl`
 * replaces that path segment with a placeholder and drops the query string
 * everywhere a URL can appear before the envelope is sent. `sendDefaultPii`
 * is off, request headers and cookies are stripped, and tracing is off — this
 * exists to make failures visible, not to profile users.
 *
 * ==================== NO DSN, NO SDK ====================
 * `NEXT_PUBLIC_SENTRY_DSN` is inlined at build time. Without it the SDK is
 * never imported and every SDK call in the app (the error boundaries) is a
 * no-op.
 *
 * ==================== LOADED AFTER THE PAGE, NOT BEFORE IT ====================
 * A static import here put the whole browser SDK (about 470 KB of the
 * homepage's 509 KB of JavaScript) in front of every first paint, including a
 * stranger's first visit from a video link. The SDK is now imported once the
 * page has loaded and the browser is idle. Errors in that first second or two
 * are the trade: they are not reported, and the page is on screen sooner.
 */

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || "";

/** Routes whose path carries a customer-facing secret. */
const TOKEN_PATH = /\/(estimate-approval|invoice-payment)\/[^/?#]+/g;

function scrubUrl(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const withoutQuery = value.split("?")[0] ?? value;
  return withoutQuery.replace(TOKEN_PATH, "/$1/[token]");
}

function resolveEnvironment(): string {
  return (
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_ENV?.trim() ||
    process.env.NODE_ENV ||
    "development"
  );
}

type Sentry = typeof SentryModule;

let sentry: Sentry | null = null;

function initSentry(Sentry: Sentry): void {
  sentry = Sentry;
  Sentry.init({
    dsn: DSN,
    environment: resolveEnvironment(),
    sendDefaultPii: false,
    tracesSampleRate: 0,
    maxValueLength: 2048,
    beforeSend(event) {
      if (event.request) {
        event.request.url = scrubUrl(event.request.url) as string | undefined;
        delete event.request.headers;
        delete event.request.cookies;
        delete event.request.query_string;
        delete event.request.data;
      }
      if (typeof event.transaction === "string") {
        event.transaction = scrubUrl(event.transaction) as string;
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data) {
        for (const key of ["url", "from", "to"]) {
          if (key in breadcrumb.data) {
            breadcrumb.data[key] = scrubUrl(breadcrumb.data[key]);
          }
        }
      }
      return breadcrumb;
    },
  });
}

function loadSentryWhenIdle(): void {
  const load = () => {
    void import("@sentry/nextjs")
      .then(initSentry)
      .catch(() => {
        // Monitoring is optional; the page is not.
      });
  };
  const idle = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }
  ).requestIdleCallback;
  const schedule = () => {
    if (idle) idle(load, { timeout: 4000 });
    else window.setTimeout(load, 1500);
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
}

if (DSN) {
  if (typeof window !== "undefined") loadSentryWhenIdle();
}

/**
 * Lets the SDK attribute a client-side error to the App Router navigation in
 * flight. Harmless when the SDK was not initialized (or not loaded yet).
 */
export function onRouterTransitionStart(href: string, navigationType: string): void {
  sentry?.captureRouterTransitionStart(href, navigationType);
}
