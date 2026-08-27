import "server-only";

import { createClient } from "@/lib/supabase/server";
import { selectInChunks } from "@/lib/database/queries/chunked-in";

/**
 * Per-customer operational stats, scoped to a page of customers and complete.
 *
 * ============================== THE DEFECT THIS REPLACES ==============================
 * listCustomerOperationalStatsByCompany loads EVERY job and EVERY invoice for
 * the company with no limit, then reduces them in JavaScript. Both of those
 * reads stop at PostgREST's 1000-row response ceiling, so on the seeded tenant
 * the stats are computed from 1,000 of 12,000 jobs and 1,000 of 10,000 invoices.
 *
 * The consequence is per-customer and silent: total jobs, revenue and last
 * service date are all understated for most of the book, in the same way and for
 * the same reason the dashboard totals were.
 *
 * ============================== TWO CHANGES, NOT ONE ==============================
 * Scoping to the visible page is what makes this bounded — a list showing 50
 * customers needs stats for 50 customers, not for all 5,000.
 *
 * But scoping alone is not enough to make it CORRECT: fifty long-standing
 * customers could still own more than 1,000 jobs between them, and the ceiling
 * would truncate again, quietly. So the reads page to completion rather than
 * taking the first response. Being bounded is what makes paging to completion
 * cheap; being complete is what makes the numbers true.
 */

const PAGE = 1000;

type JobStatRow = {
  customer_id: string;
  status: string;
  completed_at: string | null;
  scheduled_at: string;
};

type InvoiceStatRow = {
  customer_id: string;
  status: string;
  amount_paid: number | string;
  total: number | string;
  balance_due: number | string;
};

/**
 * Reads every row matching the filter, not the first 1000.
 *
 * `.range()` walking is used rather than a keyset cursor because these are
 * aggregate feeds with no stable user-facing order — the only requirement is
 * that every row is seen exactly once within a single consistent read, which a
 * range walk over a fixed filter satisfies.
 */
async function readAll<TRow>(
  build: (from: number, to: number) => PromiseLike<{
    data: TRow[] | null;
    error: { code?: string; message: string } | null;
  }>,
  label: string,
): Promise<TRow[]> {
  const rows: TRow[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) {
      console.error(`[${label}] read failed:`, {
        from,
        code: error.code,
        message: error.message,
      });
      return rows;
    }
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE) return rows;
  }
}

/**
 * Deliberately the SAME shape as CustomerOperationalStats in
 * shared/lib/customers/customer-operational-stats.ts, so these results drop
 * straight into applyCustomerOperationalStats. A second, slightly different
 * stats shape would be one more pair of things to keep in agreement.
 */
export type ScopedCustomerStats = {
  totalJobs: number;
  totalRevenue: number;
  lastServiceDate?: string;
  hasOverdueInvoice: boolean;
};

export async function listCustomerOperationalStatsForCustomers(
  companyId: string,
  customerIds: readonly string[],
): Promise<Map<string, ScopedCustomerStats>> {
  const byCustomer = new Map<string, ScopedCustomerStats>();
  if (customerIds.length === 0) return byCustomer;

  const supabase = await createClient();

  const [jobs, invoices] = await Promise.all([
    selectInChunks<JobStatRow>(customerIds, (chunk) =>
      readAll<JobStatRow>(
        (from, to) =>
          supabase
            .from("jobs")
            .select("customer_id, status, completed_at, scheduled_at")
            .eq("company_id", companyId)
            .in("customer_id", chunk)
            .is("deleted_at", null)
            .is("archived_at", null)
            .range(from, to),
        "customerStats.jobs",
      ).then((data) => ({ data, error: null })),
    ),
    selectInChunks<InvoiceStatRow>(customerIds, (chunk) =>
      readAll<InvoiceStatRow>(
        (from, to) =>
          supabase
            .from("invoices")
            .select("customer_id, status, amount_paid, total, balance_due")
            .eq("company_id", companyId)
            .in("customer_id", chunk)
            .is("deleted_at", null)
            .is("archived_at", null)
            .range(from, to),
        "customerStats.invoices",
      ).then((data) => ({ data, error: null })),
    ),
  ]);

  const ensure = (customerId: string): ScopedCustomerStats => {
    const existing = byCustomer.get(customerId);
    if (existing) return existing;
    const created: ScopedCustomerStats = {
      totalJobs: 0,
      totalRevenue: 0,
      hasOverdueInvoice: false,
    };
    byCustomer.set(customerId, created);
    return created;
  };

  for (const id of customerIds) ensure(id);

  for (const row of jobs.data) {
    const stats = ensure(row.customer_id);
    stats.totalJobs += 1;
    const serviced = row.completed_at ?? row.scheduled_at;
    if (serviced && (!stats.lastServiceDate || serviced > stats.lastServiceDate)) {
      stats.lastServiceDate = serviced;
    }
  }

  for (const row of invoices.data) {
    const stats = ensure(row.customer_id);
    if (row.status !== "void" && row.status !== "cancelled") {
      stats.totalRevenue += Number(row.amount_paid);
    }
    if (row.status === "overdue") {
      stats.hasOverdueInvoice = true;
    }
  }

  return byCustomer;
}
