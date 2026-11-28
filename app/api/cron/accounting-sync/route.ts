import { NextResponse } from "next/server";
import { runDueAccountingSyncs } from "@/lib/accounting/run";
import { getCronSecret, isAuthorizedCronRequest } from "@/lib/automation/env";

/**
 * Daily QuickBooks Online job (vercel.json).
 *
 * Records normally go the moment they change (lib/accounting/run.ts,
 * scheduleAccountingSync). This picks up whatever is still waiting: a retry
 * that came due, a change from a path that does not send right away (the
 * overdue sweep, a card payment), a company that was busy. It also refreshes
 * the keys of quiet connections so they never reach Intuit's 100-day limit.
 *
 * Protected by CRON_SECRET like every cron route. Answers counts only.
 */

export const dynamic = "force-dynamic";
const ROUTE_NAME = "accounting-sync";
const BUDGET_MS = 50_000;

export async function GET(request: Request) {
  if (!getCronSecret()) {
    return NextResponse.json({ ok: false, route: ROUTE_NAME, error: "Cron secret is not configured" }, { status: 503 });
  }
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, route: ROUTE_NAME, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const totals = await runDueAccountingSyncs({ budgetMs: BUDGET_MS });
    return NextResponse.json({ ok: true, route: ROUTE_NAME, ...totals });
  } catch {
    return NextResponse.json({ ok: false, route: ROUTE_NAME, error: "Run failed" }, { status: 500 });
  }
}
