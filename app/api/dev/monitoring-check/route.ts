import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/database/auth";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import {
  createRequestId,
  requestIdFromHeaders,
  runOperation,
} from "@/lib/operations";
import {
  captureMonitoredEvent,
  flushMonitoring,
  isMonitoringConfigured,
} from "@/lib/operations/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Development-only proof that a server failure actually reaches the monitor.
 *
 * ==================== WHY THIS EXISTS ====================
 * "We added Sentry" is not a verifiable claim. Wiring can be present and still
 * dead: hooks not installed, the module never imported, the DSN read from the
 * wrong variable, an init that silently no-ops. The only honest way to know is
 * to throw a real error through the real stack and see it arrive.
 *
 * This route does exactly that. It runs a `runOperation` whose callback throws,
 * which is the same path a failing payment webhook takes, so a green result
 * here means the seam between the operations framework and the monitor is
 * genuinely live.
 *
 * ==================== SECURITY POSTURE ====================
 * Mirrors the other /api/dev routes:
 *   - 404 outside NODE_ENV=development, so it does not exist in production;
 *   - platform admin only, so it is not a nuisance endpoint even locally.
 *
 * It is a diagnostic, not a feature. It writes nothing and reads no customer
 * data.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user || !canAccessPlatformAdmin(user)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const requestId = requestIdFromHeaders(request.headers) ?? createRequestId();
  const marker = `altair-monitoring-check-${requestId}`;

  // 1. A named non-exception condition — the shape used for
  //    payments.reconciliation_required.
  captureMonitoredEvent({
    event: "dev.monitoring_check",
    level: "info",
    requestId,
    route: "/api/dev/monitoring-check",
    meta: { marker },
  });

  // 2. A real thrown error through runOperation, which is the path every
  //    wrapped route and cron uses. throwOnFailure stays false so this route
  //    reports rather than 500s.
  const opResult = await runOperation({
    operationName: "dev.monitoring_check",
    context: { requestId, route: "/api/dev/monitoring-check" },
    throwOnFailure: false,
    callback: async () => {
      throw new Error(`Deliberate monitoring check failure (${marker})`);
    },
  });

  await flushMonitoring(5000);

  return NextResponse.json({
    ok: true,
    monitoringConfigured: isMonitoringConfigured(),
    requestId,
    marker,
    operationFailedAsExpected: opResult.success === false,
    note: isMonitoringConfigured()
      ? `Look for "Operation failed: dev.monitoring_check" and "dev.monitoring_check" in the monitoring project, tagged request_id=${requestId}.`
      : "SENTRY_DSN is not set, so nothing was transmitted. The operation still failed as expected, which proves the runOperation path itself. Set SENTRY_DSN in .env.local and re-run to prove delivery.",
  });
}
