import { NextResponse } from "next/server";
import {
  getCronSecret,
  isAuthorizedCronRequest,
} from "@/lib/automation/env";
import { runOverdueInvoiceSweep } from "@/lib/database/services/overdue-invoice-sweep";
import { runRetentionSweeps } from "@/lib/database/services/retention-sweeps";
import {
  runTrialPaymentReminders,
  type TrialReminderSweepResult,
} from "@/lib/saas-billing/trial-reminders";
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
import { finishCronCheckIn, startCronCheckIn } from "@/lib/operations/cron-monitor";

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

  // Sentry cron check-in (audit H3): opened only for an authorized run.
  const checkIn = startCronCheckIn(ROUTE_NAME);

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

        // ==================== RETENTION SWEEPS (audit M10) ====================
        // The rate-limit counters (173) and the security audit log (174) had
        // sweep functions and no caller, so both tables grew forever. They
        // ride this daily run. Each is a single bounded DELETE; a failure is
        // counted and reported but never hides the invoice sweep's result.
        // First-party analytics (202) is kept 25 months and deleted in small
        // batches under its own short time budget (203); a backlog left for
        // tomorrow makes the run "partial", not "failed".
        const retention = await runRetentionSweeps();

        // ==================== TRIAL PAYMENT REMINDERS ====================
        // Card-free trials (migration 200) have no Stripe subscription, so
        // Stripe's trial_will_end email never fires for them. This is the
        // product's own reminder, on the same daily schedule. It is kept
        // from failing the invoice sweep: a mail-provider outage must not
        // stop invoices becoming overdue.
        let reminders: TrialReminderSweepResult;
        try {
          reminders = await runTrialPaymentReminders();
        } catch (reminderError) {
          reminders = {
            candidates: 0,
            remindersSent: 0,
            remindersSkipped: 0,
            errors: [
              reminderError instanceof Error
                ? reminderError.message
                : "trial reminder sweep threw",
            ],
          };
        }

        const errorCount =
          result.errors.length +
          retention.errors.length +
          reminders.errors.length;
        const hasErrors = errorCount > 0;

        await recordPlatformAutomationRunFinished(runId, {
          automationKey: AUTOMATION_KEY,
          startedAt,
          status: hasErrors
            ? "failed"
            : result.cycleComplete && retention.webAnalyticsSweepComplete
              ? "succeeded"
              : "partial",
          companyCount: result.attempted,
          totals: {
            updated: result.invoicesMarkedOverdue,
            errorCount,
            cycleComplete: result.cycleComplete,
            stoppedForTime: result.stoppedForTime,
            rateLimitRowsSwept: retention.rateLimitRowsDeleted,
            auditEventsSwept: retention.auditEventsDeleted,
            webAnalyticsEventsSwept: retention.webAnalyticsEventsDeleted,
            webAnalyticsSweepComplete: retention.webAnalyticsSweepComplete,
            webAnalyticsSweepInstalled: retention.webAnalyticsSweepInstalled,
            trialReminderCandidates: reminders.candidates,
            trialRemindersSent: reminders.remindersSent,
          },
          errorSummary: hasErrors
            ? sanitizeErrorSummary(
                [
                  result.errors.length > 0
                    ? `${result.errors.length} company sweep ${result.errors.length === 1 ? "error" : "errors"}`
                    : null,
                  ...retention.errors,
                  reminders.errors.length > 0
                    ? `${reminders.errors.length} trial reminder ${reminders.errors.length === 1 ? "error" : "errors"}`
                    : null,
                ]
                  .filter(Boolean)
                  .join("; "),
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
          errorCount,
          retention: {
            rateLimitRowsSwept: retention.rateLimitRowsDeleted,
            auditEventsSwept: retention.auditEventsDeleted,
            webAnalyticsEventsSwept: retention.webAnalyticsEventsDeleted,
            webAnalyticsSweepComplete: retention.webAnalyticsSweepComplete,
            webAnalyticsSweepInstalled: retention.webAnalyticsSweepInstalled,
            errors: retention.errors,
          },
          trialReminderCandidates: reminders.candidates,
          trialRemindersSent: reminders.remindersSent,
          trialRemindersSkipped: reminders.remindersSkipped,
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
    return finishCronCheckIn(checkIn, opResult.value);
  }

  return finishCronCheckIn(
    checkIn,
    NextResponse.json(
      { ok: false, route: ROUTE_NAME, processed: false, error: "Cron failed" },
      { status: 500 },
    ),
  );
}
