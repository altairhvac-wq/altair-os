import { NextResponse } from "next/server";
import {
  getCronSecret,
  isAuthorizedCronRequest,
} from "@/lib/automation/env";
import { runDueMarketingTasks } from "@/lib/marketing/engine";
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

const ROUTE_NAME = "marketing-ai";
const OPERATION_NAME = "cron.marketing_ai.run_due_tasks";
const MARKETING_AI_AUTOMATION_KEY = "marketing_ai_hq";

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
    context: {
      requestId,
      route: "/api/cron/marketing-ai",
    },
    throwOnFailure: false,
    callback: async () => {
      const { runId, startedAt } = await recordPlatformAutomationRunStarted(
        MARKETING_AI_AUTOMATION_KEY,
      );

      try {
        const summary = await runDueMarketingTasks();
        const hasErrors = summary.errors.length > 0;
        const itemsCreated = summary.runs.reduce(
          (total, run) => total + run.itemsCreated,
          0,
        );

        await recordPlatformAutomationRunFinished(runId, {
          automationKey: MARKETING_AI_AUTOMATION_KEY,
          startedAt,
          status: hasErrors ? "failed" : "succeeded",
          companyCount: summary.companyCount,
          totals: {
            completed: summary.runs.length,
            created: itemsCreated,
            errorCount: summary.errors.length,
          },
          errorSummary: hasErrors
            ? sanitizeErrorSummary(
                `${summary.errors.length} marketing run ${summary.errors.length === 1 ? "error" : "errors"}`,
              )
            : null,
        });

        return NextResponse.json({
          ok: !hasErrors,
          route: ROUTE_NAME,
          processed: true,
          companyCount: summary.companyCount,
          runCount: summary.runs.length,
          itemsCreated,
          errorCount: summary.errors.length,
        });
      } catch (error) {
        await recordPlatformAutomationRunFinished(runId, {
          automationKey: MARKETING_AI_AUTOMATION_KEY,
          startedAt,
          status: "failed",
          errorSummary: sanitizeErrorSummary(error),
        });

        return NextResponse.json(
          {
            ok: false,
            route: ROUTE_NAME,
            processed: false,
            error: "Marketing AI run failed",
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
        error: "Marketing AI run failed",
      },
      { status: 500 },
    );
  }

  return opResult.value;
}
