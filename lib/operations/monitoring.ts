import "server-only";

import * as Sentry from "@sentry/nextjs";
import { redactMeta } from "@/lib/operations/serialize-error";
import { setOperationMetricsHooks } from "@/lib/operations/metrics";
import type {
  OperationMetricsFinishEvent,
  OperationMetricsStartEvent,
} from "@/lib/operations/metrics";

/**
 * The single seam between Altair's operations framework and the error monitor.
 *
 * ==================== WHY IT IS ONE MODULE ====================
 * `setOperationMetricsHooks` was designed for exactly this and had never been
 * called. Wiring the vendor in here means business logic keeps calling
 * `runOperation` and knows nothing about Sentry: there is one import of the SDK
 * in the server codebase, one place that decides what is redacted, and one
 * place to change if the vendor ever changes.
 *
 * ==================== WHAT REACHES THE MONITOR ====================
 * Operation name, request id, company id, user id, route, duration, and whether
 * the failure was classified retryable. Deliberately NOT: request bodies,
 * Stripe payloads, tokens, customer records, or anything else that would turn
 * the monitoring account into a second copy of the database. Every structured
 * value passes through `redactMeta`, the same redactor the logger uses.
 *
 * A user id is attached because "which tenant is broken" is the first question
 * during an incident; an email address is not, because it is not needed to
 * answer that and it is customer PII.
 *
 * ==================== NO DSN, NO PROBLEM ====================
 * With `SENTRY_DSN` unset — local development, CI, and any checkout without
 * credentials — `Sentry.init` is skipped entirely and every function here
 * becomes a cheap no-op. Nothing in the test or build path requires a real
 * project.
 */

const DSN_ENV = "SENTRY_DSN";
const ENVIRONMENT_ENV = "SENTRY_ENVIRONMENT";
const TRACES_SAMPLE_RATE_ENV = "SENTRY_TRACES_SAMPLE_RATE";

let initialized = false;

export function getMonitoringDsn(): string | null {
  return process.env[DSN_ENV]?.trim() || null;
}

export function isMonitoringConfigured(): boolean {
  return Boolean(getMonitoringDsn());
}

/**
 * Resolved deployment environment for grouping.
 * Falls back to Vercel's own signal, then NODE_ENV, so a deploy is never
 * reported as "unknown" just because one variable was forgotten.
 */
function resolveEnvironment(): string {
  return (
    process.env[ENVIRONMENT_ENV]?.trim() ||
    process.env.VERCEL_ENV?.trim() ||
    process.env.NODE_ENV ||
    "development"
  );
}

function resolveTracesSampleRate(): number {
  const raw = process.env[TRACES_SAMPLE_RATE_ENV]?.trim();
  if (!raw) return 0;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return 0;
  return parsed;
}

/**
 * Initializes the monitor and installs the operations metrics hooks.
 *
 * Safe to call more than once — Next.js runs `register()` per runtime, and a
 * hot reload can re-enter it.
 */
export function initOperationMonitoring(): void {
  if (initialized) return;
  initialized = true;

  const dsn = getMonitoringDsn();

  if (!dsn) {
    // Not an error. Local and CI run without a monitoring project by design.
    return;
  }

  Sentry.init({
    dsn,
    environment: resolveEnvironment(),
    // Tracing is off unless explicitly sampled: this integration exists to make
    // failures visible, and performance data is a separate (and billable)
    // decision.
    tracesSampleRate: resolveTracesSampleRate(),
    // Request bodies can contain invoice line items, customer addresses and
    // Stripe payloads. None of that is needed to diagnose a failure.
    sendDefaultPii: false,
    maxValueLength: 2048,
    beforeSend(event) {
      // Belt and braces on top of sendDefaultPii: strip anything the SDK
      // gathered from the request that could carry customer or credential data.
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.query_string;
      }
      return event;
    },
  });

  installOperationMetricsBridge();
}

/**
 * Routes runOperation failures into the monitor.
 *
 * Only `onOperationFailed` reports. A successful operation is not an event
 * worth paying for, and a monitor that receives every success stops being read.
 */
function installOperationMetricsBridge(): void {
  setOperationMetricsHooks({
    onOperationStarted(event: OperationMetricsStartEvent) {
      Sentry.addBreadcrumb({
        category: "operation",
        level: "info",
        message: `${event.operation} started`,
        data: redactMeta({
          requestId: event.requestId,
          route: event.route,
        }) as Record<string, unknown>,
      });
    },
    onOperationFailed(event: OperationMetricsFinishEvent) {
      captureOperationFailure(event);
    },
  });
}

function captureOperationFailure(event: OperationMetricsFinishEvent): void {
  if (!isMonitoringConfigured()) return;

  Sentry.withScope((scope) => {
    scope.setTag("operation", event.operation);
    scope.setTag("retryable", String(event.retryable));
    if (event.route) scope.setTag("route", event.route);
    if (event.companyId) scope.setTag("company_id", event.companyId);
    scope.setTag("request_id", event.requestId);
    if (event.userId) scope.setUser({ id: event.userId });
    scope.setContext(
      "operation",
      redactMeta({
        operation: event.operation,
        requestId: event.requestId,
        companyId: event.companyId,
        route: event.route,
        durationMs: event.durationMs,
        retryable: event.retryable,
      }) as Record<string, unknown>,
    );
    Sentry.captureMessage(`Operation failed: ${event.operation}`, "error");
  });
}

export type MonitoredEventLevel = "info" | "warning" | "error" | "fatal";

export type MonitoredEventInput = {
  /** Stable, greppable identifier — becomes the Sentry issue title. */
  event: string;
  level?: MonitoredEventLevel;
  requestId?: string;
  companyId?: string;
  route?: string;
  /** Structured detail. Redacted before it leaves the process. */
  meta?: Record<string, unknown>;
};

/**
 * Reports a named condition that is not an exception but must be seen.
 *
 * The motivating case is a payment routed to reconciliation: nothing threw,
 * the webhook correctly returned 200, and money was captured that has not been
 * applied to an invoice. That is precisely the class of event that used to be
 * discoverable only by someone opening the founder dashboard.
 */
export function captureMonitoredEvent(input: MonitoredEventInput): void {
  if (!isMonitoringConfigured()) return;

  Sentry.withScope((scope) => {
    scope.setTag("altair_event", input.event);
    if (input.route) scope.setTag("route", input.route);
    if (input.companyId) scope.setTag("company_id", input.companyId);
    if (input.requestId) scope.setTag("request_id", input.requestId);
    if (input.meta) {
      scope.setContext(
        "detail",
        redactMeta(input.meta) as Record<string, unknown>,
      );
    }
    Sentry.captureMessage(input.event, input.level ?? "warning");
  });
}

/**
 * Reports a thrown error directly.
 *
 * For code that catches and handles an error itself and therefore never
 * reaches `runOperation`'s failure path — the webhook handlers' internal
 * recovery branches, for example.
 */
export function captureMonitoredException(
  error: unknown,
  input: Omit<MonitoredEventInput, "level"> & { level?: MonitoredEventLevel },
): void {
  if (!isMonitoringConfigured()) return;

  Sentry.withScope((scope) => {
    scope.setTag("altair_event", input.event);
    if (input.route) scope.setTag("route", input.route);
    if (input.companyId) scope.setTag("company_id", input.companyId);
    if (input.requestId) scope.setTag("request_id", input.requestId);
    scope.setLevel(input.level ?? "error");
    if (input.meta) {
      scope.setContext(
        "detail",
        redactMeta(input.meta) as Record<string, unknown>,
      );
    }
    Sentry.captureException(error);
  });
}

/**
 * Flushes buffered events.
 *
 * Serverless functions can be frozen the moment a response is returned, taking
 * an unsent event with them. Route handlers that report something important
 * immediately before returning should await this.
 */
export async function flushMonitoring(timeoutMs = 2000): Promise<void> {
  if (!isMonitoringConfigured()) return;
  try {
    await Sentry.flush(timeoutMs);
  } catch {
    // A monitor that cannot flush must never break the request it was
    // observing. The webhook's own response is what matters.
  }
}
