import * as Sentry from "@sentry/nextjs";

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
 * `NEXT_PUBLIC_SENTRY_DSN` is inlined at build time. Without it `init` is not
 * called and every SDK call in the app (the error boundaries) is a no-op.
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

if (DSN) {
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

/**
 * Lets the SDK attribute a client-side error to the App Router navigation in
 * flight. Harmless when the SDK was not initialized.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
