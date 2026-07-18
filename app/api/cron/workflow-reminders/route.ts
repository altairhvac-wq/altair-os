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

        await recordPlatformAutomationRunFinished(runId, {
          automationKey: WORKFLOW_REMINDERS_AUTOMATION_KEY,
          startedAt,
          status: hasErrors ? "failed" : "succeeded",
          companyCount: result.companyCount,
          totals: {
            ...result.totals,
            errorCount: result.errors.length,
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
