import "server-only";

import {
  runTenantSweep,
  type TenantSweepCompany,
  type TenantSweepCursor,
} from "@/lib/automation/tenant-sweep";
import { syncOverdueInvoiceStatuses } from "@/lib/database/queries/invoices";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { resolveCompanyTimeZone } from "@/shared/lib/datetime";

/**
 * Scheduled overdue-invoice transition, one tenant at a time.
 *
 * ==================== WHAT THIS IS FOR ====================
 * `syncOverdueInvoiceStatuses` currently runs during page renders — the
 * dashboard, the invoices list and the customers page all reach it through
 * `ensureInvoiceBillingStatesSynced`. It selects every past-due unpaid invoice
 * unbounded, updates them, and inserts an activity row per update. That is an
 * unbounded write performed while a user waits for a page.
 *
 * This module gives that work a scheduled home so the read-path call can be
 * removed afterwards, without a window in which invoices stop transitioning.
 *
 * ==================== STAGE ONE ====================
 * Nothing is removed yet. Both paths run, which is harmless because the work is
 * idempotent: the query only matches invoices that are still `sent` or
 * `partially_paid` with a balance and a past due date, so an invoice already
 * marked `overdue` is not matched again and no duplicate activity row is
 * written. Running both is redundant, not incorrect.
 *
 * ==================== TIME ZONE ====================
 * "Past due" is a calendar question, so it is evaluated in the COMPANY's time
 * zone, not the server's. That is why each company is swept individually with
 * its own `companies.timezone` rather than the whole table being updated in one
 * statement — a single global sweep would mark a west-coast company's invoice
 * overdue several hours early.
 */

const OVERDUE_SWEEP_AUTOMATION_KEY = "billing_maintenance_overdue_sweep";

/**
 * Companies per invocation.
 *
 * Larger than the reminder sweep's batch because the per-company work is a
 * single indexed query that usually matches nothing — migration 150 adds
 * invoices (company_id, due_date) where balance_due > 0 for exactly this.
 */
const OVERDUE_SWEEP_BATCH_SIZE = 200;

export type OverdueInvoiceSweepResult = {
  attempted: number;
  succeeded: number;
  invoicesMarkedOverdue: number;
  cycleComplete: boolean;
  stoppedForTime: boolean;
  errors: { companyId: string; message: string }[];
};

type CompanyRow = TenantSweepCompany & { timezone: string | null };

/**
 * One page of companies in (created_at, id) order.
 *
 * The keyset predicate is the standard row-comparison expansion, because
 * PostgREST cannot express `(a, b) > (x, y)` directly.
 */
async function listCompanyPage(
  client: ReturnType<typeof createServiceRoleClient>,
  cursor: TenantSweepCursor | null,
  limit: number,
): Promise<CompanyRow[]> {
  let query = client
    .from("companies")
    .select("id, created_at, timezone")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit);

  if (cursor) {
    query = query.or(
      `created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.companyId})`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CompanyRow[];
}

export async function runOverdueInvoiceSweep(options?: {
  batchSize?: number;
  timeBudgetMs?: number;
}): Promise<OverdueInvoiceSweepResult> {
  const client = createServiceRoleClient();

  // Time zones are needed per company inside processCompany, but the sweep only
  // hands back an id. Cached from the page that produced it.
  const timeZoneByCompany = new Map<string, string>();
  let invoicesMarkedOverdue = 0;

  const outcome = await runTenantSweep({
    automationKey: OVERDUE_SWEEP_AUTOMATION_KEY,
    batchSize: options?.batchSize ?? OVERDUE_SWEEP_BATCH_SIZE,
    timeBudgetMs: options?.timeBudgetMs,
    listCompanies: async (cursor, limit) => {
      const page = await listCompanyPage(client, cursor, limit);
      for (const row of page) {
        timeZoneByCompany.set(row.id, resolveCompanyTimeZone(row.timezone));
      }
      return page.map((row) => ({ id: row.id, created_at: row.created_at }));
    },
    processCompany: async (companyId) => {
      const updated = await syncOverdueInvoiceStatuses(
        companyId,
        timeZoneByCompany.get(companyId),
      );
      invoicesMarkedOverdue += updated;
    },
  });

  return {
    attempted: outcome.attempted,
    succeeded: outcome.succeeded,
    invoicesMarkedOverdue,
    cycleComplete: outcome.cycleComplete,
    stoppedForTime: outcome.stoppedForTime,
    errors: outcome.errors,
  };
}
