import { NextResponse } from "next/server";
import {
  getCronSecret,
  isAuthorizedCronRequest,
} from "@/lib/automation/env";
import { evaluateWorkflowRemindersForAllCompanies } from "@/lib/database/services/evaluate-workflow-reminders";
import {
  recordPlatformAutomationRunFinished,
  recordPlatformAutomationRunStarted,
  sanitizeErrorSummary,
  WORKFLOW_REMINDERS_AUTOMATION_KEY,
} from "@/lib/database/services/platform-automation-runs";
import {
  createRequestId,
  requestIdFromHeaders,
  runOperation,
} from "@/lib/operations";

export const runtime = "nodejs";
/**
 * The sweep's own time budget (45s) must sit comfortably under this so it
 * always has room to persist its checkpoint and run record before the
 * platform reclaims the function. A checkpoint that never gets written is the
 * failure the whole batching design exists to prevent.
 */
export const maxDuration = 60;

const ROUTE_NAME = "workflow-reminders";
const OPERATION_NAME = "cron.workflow_reminders.evaluate";

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

  const requestId =
    requestIdFromHeaders(request.headers) ?? createRequestId();

  const opResult = await runOperation({
    operationName: OPERATION_NAME,
    context: {
      requestId,
      route: "/api/cron/workflow-reminders",
    },
    throwOnFailure: false,
    callback: async () => {
      const { runId, startedAt } = await recordPlatformAutomationRunStarted(
        WORKFLOW_REMINDERS_AUTOMATION_KEY,
      );

      try {
        const result = await evaluateWorkflowRemindersForAllCompanies();
        const hasErrors = result.errors.length > 0;

        // ==================== 'partial' IS A REAL OUTCOME ====================
        // The sweep is bounded, so a healthy invocation frequently stops before
        // the tenant list is exhausted and resumes next time. Recording that as
        // 'succeeded' would hide an unfinished cycle; as 'failed' it would page
        // someone about normal operation. Migration 152 added 'partial' so the
        // graceful case is recorded honestly — and so a run still sitting at
        // 'started' now means what it should: the function died without getting
        // the chance to say anything.
        const cycleIncomplete = result.sweep?.cycleComplete === false;
        const status = hasErrors
          ? "failed"
          : cycleIncomplete
            ? "partial"
            : "succeeded";

        await recordPlatformAutomationRunFinished(runId, {
          automationKey: WORKFLOW_REMINDERS_AUTOMATION_KEY,
          startedAt,
          status,
          companyCount: result.companyCount,
          totals: {
            ...result.totals,
            errorCount: result.errors.length,
            cycleComplete: result.sweep?.cycleComplete ?? true,
            stoppedForTime: result.sweep?.stoppedForTime ?? false,
          },
          errorSummary: hasErrors
            ? sanitizeErrorSummary(
                `${result.errors.length} company evaluation ${result.errors.length === 1 ? "error" : "errors"}`,
              )
            : null,
        });

        return NextResponse.json({
          ok: !hasErrors,
          route: ROUTE_NAME,
          processed: true,
          evaluatedAt: result.evaluatedAt,
          companyCount: result.companyCount,
          totals: result.totals,
          sweep: result.sweep ?? null,
          errorCount: result.errors.length,
        });
      } catch (error) {
        await recordPlatformAutomationRunFinished(runId, {
          automationKey: WORKFLOW_REMINDERS_AUTOMATION_KEY,
          startedAt,
          status: "failed",
          errorSummary: sanitizeErrorSummary(error),
        });

        return NextResponse.json(
          {
            ok: false,
            route: ROUTE_NAME,
            processed: false,
            error: "Workflow reminder evaluation failed",
          },
          { status: 500 },
        );
      }
    },
  });

  if (!opResult.success || !opResult.value) {
    return NextResponse.json(
      {
        ok: false,
        route: ROUTE_NAME,
        processed: false,
        error: "Workflow reminder evaluation failed",
      },
      { status: 500 },
    );
  }

  return opResult.value;
}
