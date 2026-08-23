import { NextResponse } from "next/server";
import {
  getCronSecret,
  isAuthorizedCronRequest,
} from "@/lib/automation/env";
import { collectReelInsightsForCompany } from "@/lib/marketing/reel-insights-collector";
import { listCompaniesWithActiveMarketingHq } from "@/lib/marketing/store";
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

const ROUTE_NAME = "marketing-insights";
const OPERATION_NAME = "cron.marketing_insights.collect";
const AUTOMATION_KEY = "marketing_reel_insights";

/**
 * Collects organic Reel performance for every company, once a day.
 *
 * Same shape as `/api/cron/marketing-ai`: cron-secret gate, an automation run
 * record either side, `runOperation` around the work. Reads only — it asks Meta
 * about posts that are already published and writes numbers into
 * `marketing_metrics`. It cannot publish, and it never touches paid campaigns.
 *
 * A company whose Reels are all too fresh reports `notReady` and is a SUCCESS.
 * Only a genuine fault — a bad token, a write that failed — counts as an error,
 * because a cron that goes red every morning stops being read.
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
    context: { requestId, route: "/api/cron/marketing-insights" },
    throwOnFailure: false,
    callback: async () => {
      const { runId, startedAt } = await recordPlatformAutomationRunStarted(AUTOMATION_KEY);
      try {
        const companyIds = await listCompaniesWithActiveMarketingHq();
        let collected = 0;
        let notReady = 0;
        let failed = 0;
        let metricsWritten = 0;

        for (const companyId of companyIds) {
          const summary = await collectReelInsightsForCompany({ companyId });
          collected += summary.collected;
          notReady += summary.notReady;
          failed += summary.failed;
          metricsWritten += summary.metricsWritten;
        }

        await recordPlatformAutomationRunFinished(runId, {
          automationKey: AUTOMATION_KEY,
          startedAt,
          status: failed > 0 ? "failed" : "succeeded",
          companyCount: companyIds.length,
          totals: { completed: collected, created: metricsWritten, errorCount: failed },
          errorSummary: failed > 0
            ? sanitizeErrorSummary(`${failed} delivery collection ${failed === 1 ? "error" : "errors"}`)
            : null,
        });

        return NextResponse.json({
          ok: failed === 0,
          route: ROUTE_NAME,
          companyCount: companyIds.length,
          collected,
          notReady,
          failed,
          metricsWritten,
        });
      } catch (error) {
        await recordPlatformAutomationRunFinished(runId, {
          automationKey: AUTOMATION_KEY,
          startedAt,
          status: "failed",
          errorSummary: sanitizeErrorSummary(error),
        });
        return NextResponse.json(
          { ok: false, route: ROUTE_NAME, error: "Reel insights collection failed" },
          { status: 500 },
        );
      }
    },
  });

  if (!opResult.success || !opResult.value) {
    return NextResponse.json(
      { ok: false, route: ROUTE_NAME, error: "Reel insights collection failed" },
      { status: 500 },
    );
  }
  return opResult.value;
}
