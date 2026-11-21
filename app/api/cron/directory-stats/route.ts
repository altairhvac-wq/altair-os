import { NextResponse } from "next/server";
import { getCronSecret, isAuthorizedCronRequest } from "@/lib/automation/env";
import { runMonthlyStatsEmails } from "@/lib/directory/monthly-stats";
import {
  recordPlatformAutomationRunFinished,
  recordPlatformAutomationRunStarted,
  sanitizeErrorSummary,
} from "@/lib/database/services/platform-automation-runs";
import { createRequestId, requestIdFromHeaders, runOperation } from "@/lib/operations";
import { finishCronCheckIn, startCronCheckIn } from "@/lib/operations/cron-monitor";

export const runtime = "nodejs";
/** The run's own 45 s budget sits under this, so it always records its result. */
export const maxDuration = 60;

const ROUTE_NAME = "directory-stats";
const OPERATION_NAME = "cron.directory_stats.monthly_email";
const AUTOMATION_KEY = "directory_stats_email";

/**
 * The public directory's monthly numbers email (migration 214).
 *
 * Scheduled in vercel.json for the 2nd of each month. Protected by
 * CRON_SECRET like every cron route: without the secret configured it
 * refuses to run (503), and without the right bearer token it answers 401.
 * Each listing is claimed for the month before its email is sent, so a
 * repeated call never sends twice (lib/directory/monthly-stats.ts).
 */
export async function GET(request: Request) {
  if (!getCronSecret()) {
    return NextResponse.json({ ok: false, route: ROUTE_NAME, error: "Cron secret is not configured" }, { status: 503 });
  }
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, route: ROUTE_NAME, error: "Unauthorized" }, { status: 401 });
  }

  const requestId = requestIdFromHeaders(request.headers) ?? createRequestId();
  const checkIn = startCronCheckIn(ROUTE_NAME);

  const opResult = await runOperation({
    operationName: OPERATION_NAME,
    context: { requestId, route: "/api/cron/directory-stats" },
    throwOnFailure: false,
    callback: async () => {
      const { runId, startedAt } = await recordPlatformAutomationRunStarted(AUTOMATION_KEY);
      try {
        const result = await runMonthlyStatsEmails();
        const hasErrors = result.failed > 0;
        await recordPlatformAutomationRunFinished(runId, {
          automationKey: AUTOMATION_KEY,
          startedAt,
          status: !result.installed ? "succeeded" : hasErrors ? "failed" : result.stoppedForTime ? "partial" : "succeeded",
          companyCount: result.considered,
          totals: {
            directoryStatsInstalled: result.installed,
            directoryStatsMonth: result.month,
            directoryStatsSent: result.sent,
            skipped: result.skipped,
            directoryStatsFailed: result.failed,
            directoryStatsAlreadyDone: result.alreadyDone,
            stoppedForTime: result.stoppedForTime,
            errorCount: result.failed,
          },
          errorSummary: hasErrors ? sanitizeErrorSummary(`${result.failed} monthly email ${result.failed === 1 ? "failure" : "failures"}`) : null,
        });
        return NextResponse.json({ ok: !hasErrors, route: ROUTE_NAME, processed: true, ...result });
      } catch (error) {
        await recordPlatformAutomationRunFinished(runId, {
          automationKey: AUTOMATION_KEY,
          startedAt,
          status: "failed",
          errorSummary: sanitizeErrorSummary(error),
        });
        return NextResponse.json({ ok: false, route: ROUTE_NAME, processed: false, error: "Monthly directory email run failed" }, { status: 500 });
      }
    },
  });

  if (opResult.success && opResult.value) {
    return finishCronCheckIn(checkIn, opResult.value);
  }
  return finishCronCheckIn(
    checkIn,
    NextResponse.json({ ok: false, route: ROUTE_NAME, processed: false, error: "Cron failed" }, { status: 500 }),
  );
}
