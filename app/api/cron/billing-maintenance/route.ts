import { NextResponse } from "next/server";
import {
  getCronSecret,
  isAuthorizedCronRequest,
} from "@/lib/automation/env";
import { runOverdueInvoiceSweep } from "@/lib/database/services/overdue-invoice-sweep";
import {
  recordPlatformAutomationRunFinished,
  recordPlatformAutomationRunStarted,
  sanitizeErrorSummary,
} from "@/lib/database/services/platform-automation-runs";
import {
  createRequestId,
  requestIdFromHeaders,
  runOperation,
} from "@/lib/operations";

export const runtime = "nodejs";
/**
 * The sweep's own 45s budget sits under this so it always has room to persist
 * its checkpoint and run record before the platform reclaims the function.
 */
export const maxDuration = 60;

const ROUTE_NAME = "billing-maintenance";
const OPERATION_NAME = "cron.billing_maintenance.overdue_sweep";
const AUTOMATION_KEY = "billing_maintenance";

/**
 * Scheduled overdue-invoice transition.
 *
 * ==================== WHY THIS ROUTE EXISTS ====================
 * `ensureInvoiceBillingStatesSynced` runs during PAGE RENDERS — the dashboard,
 * the invoices list, and the customers page all call it. Underneath,
 * `syncOverdueInvoiceStatuses` selects every past-due sent/partially-paid
 * invoice unbounded, issues an UPDATE per distinct status, and then inserts an
 * activity row per updated invoice.
 *
 * On the first load of a day with a backlog that is an unbounded write plus an
 * unbounded activity-log insert, performed while a user waits for a page. Two
 * users loading the dashboard at the same moment do it concurrently.
 *
 * ==================== THIS IS STAGE ONE OF TWO ====================
 * The read-path call is DELIBERATELY STILL IN PLACE. Removing it in the same
 * change would create a window where overdue invoices stop transitioning if
 * anything about this route is wrong — a customer's invoice silently never
 * becoming overdue is worse than the performance problem being fixed.
 *
 * The order is:
 *   1. THIS: add the scheduled path and let it run alongside the read path.
 *      Both are idempotent — an invoice already marked overdue is not matched
 *      by the query — so running both is harmless, just redundant.
 *   2. Verify it transitions invoices on a real schedule, by comparing
 *      platform_automation_runs totals against invoices moving to 'overdue'.
 *   3. Only then remove the call from ensureInvoiceBillingStatesSynced.
 *
 * Stage 3 is recorded as outstanding work in the Phase 4 handoff. Until it
 * happens the performance defect remains; what this route buys is that the fix
 * can be completed without a coverage gap.
 */
export async function GET(request: Request) {
  if (!getCronSecret()) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "Cron secret is not configured" },
      { status: 503 },
    );
  }

  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const requestId = requestIdFromHeaders(request.headers) ?? createRequestId();

  const opResult = await runOperation({
    operationName: OPERATION_NAME,
    context: { requestId, route: "/api/cron/billing-maintenance" },
    throwOnFailure: false,
    callback: async () => {
      const { runId, startedAt } = await recordPlatformAutomationRunStarted(
        AUTOMATION_KEY,
      );

      try {
        const result = await runOverdueInvoiceSweep();
        const hasErrors = result.errors.length > 0;

        await recordPlatformAutomationRunFinished(runId, {
          automationKey: AUTOMATION_KEY,
          startedAt,
          status: hasErrors
            ? "failed"
            : result.cycleComplete
              ? "succeeded"
              : "partial",
          companyCount: result.attempted,
          totals: {
            updated: result.invoicesMarkedOverdue,
            errorCount: result.errors.length,
            cycleComplete: result.cycleComplete,
            stoppedForTime: result.stoppedForTime,
          },
          errorSummary: hasErrors
            ? sanitizeErrorSummary(
                `${result.errors.length} company sweep ${result.errors.length === 1 ? "error" : "errors"}`,
              )
            : null,
        });

        return NextResponse.json({
          ok: !hasErrors,
          route: ROUTE_NAME,
          processed: true,
          companiesAttempted: result.attempted,
          invoicesMarkedOverdue: result.invoicesMarkedOverdue,
          cycleComplete: result.cycleComplete,
          stoppedForTime: result.stoppedForTime,
          errorCount: result.errors.length,
        });
      } catch (error) {
        await recordPlatformAutomationRunFinished(runId, {
          automationKey: AUTOMATION_KEY,
          startedAt,
          status: "failed",
          errorSummary: sanitizeErrorSummary(error),
        });

        return NextResponse.json(
          {
            ok: false,
            route: ROUTE_NAME,
            processed: false,
            error: "Overdue invoice sweep failed",
          },
          { status: 500 },
        );
      }
    },
  });

  if (opResult.success && opResult.value) {
    return opResult.value;
  }

  return NextResponse.json(
    { ok: false, route: ROUTE_NAME, processed: false, error: "Cron failed" },
    { status: 500 },
  );
}
