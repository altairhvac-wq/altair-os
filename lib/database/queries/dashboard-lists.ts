import "server-only";

import { createClient } from "@/lib/supabase/server";
import { UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS } from "@/shared/lib/unpaid-invoice-follow-up";
import { ESTIMATE_RECOVERY_THRESHOLD_DAYS } from "@/shared/lib/estimate-recovery";

/**
 * The dashboard's card lists, fetched bounded (migration 167).
 *
 * ============================== THE SHAPE THAT MADE THIS POSSIBLE ==============================
 * Every attention card on the dashboard is
 *
 *     { count: <predicate over the whole book>.length,
 *       items: <the same array>.slice(0, 5 or 10) }
 *
 * Not one card renders a whole array. The counts already came from SQL. The
 * items were still produced by loading every invoice, every estimate and every
 * expense a company has and slicing ten rows off the end of a filter — which
 * was also silently capped at PostgREST's 1,000 rows, so the "ten most overdue"
 * were the ten most overdue among the newest thousand.
 *
 * ============================== THE THRESHOLDS STAY IN TYPESCRIPT ==============================
 * UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS and ESTIMATE_RECOVERY_THRESHOLD_DAYS
 * are passed to the function rather than repeated inside it. Two copies of a
 * business threshold, one of them in SQL, is how the dashboard and the reminder
 * cron start disagreeing about what "overdue" means.
 *
 * ============================== WHAT THIS DOES NOT DO ==============================
 * It returns rows shaped for the dashboard's previews, not full domain objects.
 * The callers slice and map them into card payloads; nothing downstream needs an
 * Invoice or an Estimate, which is exactly why the whole-book read was
 * avoidable in the first place.
 */

export type DashboardListInvoice = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  job_id: string | null;
  status: string;
  total: number;
  balance_due: number;
  due_date: string | null;
  issue_date: string | null;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  days_unpaid?: number;
};

export type DashboardListEstimate = {
  id: string;
  estimate_number: string;
  customer_id: string | null;
  job_id: string | null;
  status: string;
  total: number;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  sent_at?: string | null;
  days_since_sent?: number;
  approved_at?: string | null;
  job_number?: string | null;
};

export type DashboardListExpense = {
  id: string;
  expense_number: string;
  merchant: string | null;
  amount: number;
  status: string;
  category: string | null;
  purchase_date: string | null;
  receipt_status: string;
  job_id: string | null;
  technician_id: string | null;
  created_at: string;
};

export type DashboardLists = {
  overdueInvoices: DashboardListInvoice[];
  unsentInvoices: DashboardListInvoice[];
  followUpInvoices: DashboardListInvoice[];
  unsentEstimates: DashboardListEstimate[];
  staleSentEstimates: DashboardListEstimate[];
  acceptedEstimatesNeedingScheduling: DashboardListEstimate[];
  acceptedEstimatesNeedingSchedulingCount: number;
  pendingExpenses: DashboardListExpense[];
  recentReceipts: DashboardListExpense[];
  rejectedExpenseCount: number;
  /** False when the RPC failed and every list above is the empty fallback. */
  ok: boolean;
};

export const EMPTY_DASHBOARD_LISTS: DashboardLists = {
  overdueInvoices: [],
  unsentInvoices: [],
  followUpInvoices: [],
  unsentEstimates: [],
  staleSentEstimates: [],
  acceptedEstimatesNeedingScheduling: [],
  acceptedEstimatesNeedingSchedulingCount: 0,
  pendingExpenses: [],
  recentReceipts: [],
  rejectedExpenseCount: 0,
  ok: false,
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function list<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? (raw as T[]) : [];
}

export async function getCompanyDashboardLists(
  companyId: string,
  options: { reference?: Date; limit: number },
): Promise<DashboardLists> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_company_dashboard_lists", {
    p_company_id: companyId,
    p_reference: (options.reference ?? new Date()).toISOString(),
    p_follow_up_days: UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS,
    p_recovery_days: ESTIMATE_RECOVERY_THRESHOLD_DAYS,
    p_limit: options.limit,
  });

  if (error) {
    // Empty lists rather than a throw: the dashboard is a read-only overview
    // and one blank card is better than a failed page. `ok` is what lets a
    // caller tell an empty company from a failure — the distinction shadow mode
    // was missing, and the same trap applies to every fallback like this.
    console.error("[getCompanyDashboardLists] rpc failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return EMPTY_DASHBOARD_LISTS;
  }

  const payload = (data ?? {}) as Record<string, unknown>;

  return {
    overdueInvoices: list<DashboardListInvoice>(payload.overdueInvoices),
    unsentInvoices: list<DashboardListInvoice>(payload.unsentInvoices),
    followUpInvoices: list<DashboardListInvoice>(payload.followUpInvoices),
    unsentEstimates: list<DashboardListEstimate>(payload.unsentEstimates),
    staleSentEstimates: list<DashboardListEstimate>(payload.staleSentEstimates),
    acceptedEstimatesNeedingScheduling: list<DashboardListEstimate>(
      payload.acceptedEstimatesNeedingScheduling,
    ),
    acceptedEstimatesNeedingSchedulingCount: toNumber(
      payload.acceptedEstimatesNeedingSchedulingCount,
    ),
    pendingExpenses: list<DashboardListExpense>(payload.pendingExpenses),
    recentReceipts: list<DashboardListExpense>(payload.recentReceipts),
    rejectedExpenseCount: toNumber(payload.rejectedExpenseCount),
    ok: true,
  };
}
