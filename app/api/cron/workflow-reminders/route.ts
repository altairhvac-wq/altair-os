import { NextResponse } from "next/server";
import {
  getCronSecret,
  isAuthorizedCronRequest,
} from "@/lib/automation/env";
import { evaluateWorkflowRemindersForAllCompanies } from "@/lib/database/services/evaluate-workflow-reminders";

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

  const result = await evaluateWorkflowRemindersForAllCompanies();

  return NextResponse.json({
    ok: true,
    evaluatedAt: result.evaluatedAt,
    companyCount: result.companyCount,
    totals: result.totals,
    errorCount: result.errors.length,
  });
}
