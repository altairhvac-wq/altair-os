import type { Instrumentation } from "next";

/**
 * Server instrumentation entry point.
 *
 * ==================== WHAT THIS CLOSES ====================
 * The application had a complete operations framework — structured logging,
 * request correlation, an error taxonomy, retry classification and metrics
 * hooks — and no consumer for any of it. `setOperationMetricsHooks` was never
 * called, and every failure outside the cron routes reported itself with
 * `console.error` into a log stream nothing watches. A Stripe webhook that
 * began returning 500 would retry for days and then stop, silently.
 *
 * `register()` runs once per server instance, before any request is served, so
 * it is the correct place to install monitoring. `onRequestError` is Next's own
 * hook for uncaught server errors and catches what never reaches a
 * `runOperation` boundary: a throwing Server Component, page, or Server Action.
 *
 * ==================== NO CREDENTIAL REQUIRED ====================
 * With `SENTRY_DSN` unset, initialization is skipped and every hook is a no-op.
 * Local development, CI, and the production build all run without a monitoring
 * project.
 */

export async function register() {
  // Node and Edge runtimes both evaluate this file. The monitoring module is
  // server-only and imports the Node SDK, so it is loaded lazily and only for
  // the runtime that can use it.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initOperationMonitoring } = await import(
      "@/lib/operations/monitoring"
    );
    initOperationMonitoring();
  }
}

/**
 * Uncaught server errors — rendering, route handlers, and Server Actions.
 *
 * Deliberately reports the route and the phase but NOT `request.headers` or
 * any body: those carry cookies, bearer tokens, Stripe payloads and customer
 * records, none of which is needed to identify a broken route.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { captureMonitoredException } = await import(
    "@/lib/operations/monitoring"
  );

  captureMonitoredException(error, {
    event: "next.request_error",
    route: context.routePath,
    meta: {
      method: request.method,
      // Path only — a query string can carry a token or an email address.
      path: request.path.split("?")[0],
      routerKind: context.routerKind,
      routeType: context.routeType,
      revalidateReason: context.revalidateReason,
    },
  });
};
