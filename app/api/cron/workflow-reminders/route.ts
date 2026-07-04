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

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!getCronSecret()) {
    return NextResponse.json(
      { error: "Cron secret is not configured" },
      { status: 503 },
    );
  }

  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      { error: "Workflow reminder evaluation failed" },
      { status: 500 },
    );
  }
}
