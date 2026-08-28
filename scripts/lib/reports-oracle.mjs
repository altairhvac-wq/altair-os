/**
 * Ground truth for the reports page: every row, mapped by the shipped mappers.
 *
 * ===================== WHY THIS FILE EXISTS =====================
 * getReportsPageData loads twelve datasets with no .limit() and reduces them
 * through buildReportsPageData. PostgREST caps every one of those reads at
 * 1,000 rows and reports the cut in a Content-Range header nothing reads, so on
 * a tenant past that ceiling the reports page computes real business figures --
 * revenue, outstanding AR, aging, close rate, sales tax -- from a fraction of
 * the book and renders them as the whole.
 *
 * That means the array the page currently holds CANNOT be the oracle for a fix:
 * it is the defect. This module builds the oracle instead, by paging every read
 * to completion and running the SAME mappers and the SAME builder the
 * application runs. What comes out is what the page would say if PostgREST had
 * no ceiling.
 *
 * ===================== WHY THE SHIPPED MAPPERS =====================
 * Every mapper and select string here is imported from the application, not
 * restated. A differential test that maps rows its own way proves the test
 * agrees with itself. Where a select constant was private it was exported
 * rather than copied, for the same reason the job mapper was extracted.
 *
 * ===================== PAGE SIZE =====================
 * PAGE is 1,000 and not a byte more, deliberately. Asking for 2,000 and
 * stopping when a page comes back short is the exact mistake this whole pass
 * exists to remove -- the server silently gives 1,000, the loop reads the
 * shortfall as "that was the end", and a twelfth of the tenant is reported as
 * all of it. verify-job-completeness-live made that error against this same
 * scratch project and produced a confident 6,301-versus-517 mismatch.
 *
 * Offline of the application: this is used by scripts only.
 */

import {
  INVOICE_LIST_SELECT,
  mapInvoiceRowToInvoice,
} from "@/lib/database/queries/invoices";
import {
  JOB_TECHNICIAN_SELECT,
} from "@/lib/database/queries/jobs";
import { mapJobRowToJob } from "@/lib/database/mappers/job";
import {
  ESTIMATE_LIST_SELECT,
  mapEstimateRowToEstimate,
} from "@/lib/database/queries/estimates";
import {
  EXPENSE_SELECT,
  mapExpenseRow,
} from "@/lib/database/queries/expenses";
import {
  INVOICE_PAYMENT_LIST_SELECT,
  mapPaymentRowWithInvoice,
} from "@/lib/database/queries/invoice-payments";
import { mapCustomerRowToCustomer } from "@/lib/database/mappers/customer";
import { mapLeadRowToLead } from "@/lib/database/queries/leads";
import { mapTimeEntryRow } from "@/lib/database/queries/time-entries";
import {
  mergeEstimateLifecycleTimestampsBatch,
  resolveEstimateLifecycleTimestampsByEstimateId,
} from "@/shared/lib/estimate-lifecycle-timestamps";

export const POSTGREST_ROW_CEILING = 1000;

/**
 * Reads a table to completion.
 *
 * `.range()` rather than a keyset walk because the caller wants every row and
 * the order is irrelevant to a set comparison; the shipped ordering is applied
 * separately where a figure depends on it.
 */
export async function readAll(client, table, select, apply) {
  const rows = [];
  for (let from = 0; ; from += POSTGREST_ROW_CEILING) {
    let query = client
      .from(table)
      .select(select)
      .range(from, from + POSTGREST_ROW_CEILING - 1);
    query = apply(query);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < POSTGREST_ROW_CEILING) break;
  }
  return rows;
}

/** The single first page — what the application actually sees today. */
export async function readFirstPage(client, table, select, apply) {
  let query = client.from(table).select(select);
  query = apply(query);
  const { data, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

const LIFECYCLE_EVENT_TYPES = ["estimate_sent", "estimate_approved"];

/**
 * The estimate lifecycle timestamps, read whole.
 *
 * The application resolves these through selectInChunks over every estimate id,
 * 200 ids per chunk. That avoids the request-line limit but NOT the row
 * ceiling: a chunk whose estimates carry more than 1,000 lifecycle activities
 * between them is silently cut, and sentAt/approvedAt go missing for whichever
 * estimates fall off. Reading by company and paging avoids both.
 */
async function readEstimateLifecycleTimestamps(client, companyId) {
  const rows = await readAll(
    client,
    "estimate_activities",
    "estimate_id, event_type, created_at",
    (query) =>
      query
        .eq("company_id", companyId)
        .in("event_type", LIFECYCLE_EVENT_TYPES)
        .order("created_at", { ascending: true }),
  );

  return resolveEstimateLifecycleTimestampsByEstimateId(
    rows.map((row) => ({
      estimateId: row.estimate_id,
      eventType: row.event_type,
      createdAt: row.created_at,
    })),
  );
}

const LIVE = (query) => query.is("deleted_at", null).is("archived_at", null);

/**
 * Every dataset getReportsPageData loads, in the same scope and the same order.
 *
 * `truncate: true` reproduces exactly what the page sees today -- one page, no
 * pagination -- so the two can be compared without a second code path.
 */
export async function loadReportDatasets(client, companyId, options = {}) {
  const read = options.truncate ? readFirstPage : readAll;

  const [
    invoiceRows,
    paymentRows,
    estimateRows,
    jobRows,
    expenseRows,
    leadRows,
    customerRows,
    laborRows,
  ] = await Promise.all([
    read(client, "invoices", INVOICE_LIST_SELECT, (q) =>
      LIVE(q.eq("company_id", companyId)).order("created_at", {
        ascending: false,
      }),
    ),
    read(client, "invoice_payments", INVOICE_PAYMENT_LIST_SELECT, (q) =>
      q
        .eq("company_id", companyId)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ),
    read(client, "estimates", ESTIMATE_LIST_SELECT, (q) =>
      LIVE(q.eq("company_id", companyId)).order("created_at", {
        ascending: false,
      }),
    ),
    read(client, "jobs", JOB_TECHNICIAN_SELECT, (q) =>
      LIVE(q.eq("company_id", companyId)).order("scheduled_at", {
        ascending: false,
      }),
    ),
    read(client, "expenses", EXPENSE_SELECT, (q) =>
      LIVE(q.eq("company_id", companyId)).order("created_at", {
        ascending: false,
      }),
    ),
    read(client, "leads", "*", (q) =>
      LIVE(q.eq("company_id", companyId)).order("created_at", {
        ascending: false,
      }),
    ),
    read(client, "customers", "*", (q) =>
      LIVE(q.eq("company_id", companyId)).order("created_at", {
        ascending: false,
      }),
    ),
    read(
      client,
      "time_entries",
      "*, technician:profiles!time_entries_technician_id_fkey(full_name, email), job:jobs(job_number)",
      (q) =>
        q
          .eq("company_id", companyId)
          .eq("entry_type", "job_labor")
          .order("started_at", { ascending: false }),
    ),
  ]);

  const estimates = mergeEstimateLifecycleTimestampsBatch(
    estimateRows.map(mapEstimateRowToEstimate),
    options.truncate
      ? new Map()
      : await readEstimateLifecycleTimestamps(client, companyId),
  );

  return {
    invoices: invoiceRows.map(mapInvoiceRowToInvoice),
    payments: paymentRows.map(mapPaymentRowWithInvoice),
    estimates,
    jobs: jobRows.map(mapJobRowToJob),
    expenses: expenseRows.map(mapExpenseRow),
    leads: leadRows.map(mapLeadRowToLead),
    customers: customerRows.map(mapCustomerRowToCustomer),
    laborEntries: laborRows.map(mapTimeEntryRow),
  };
}

/** company_memberships -> the rate map listTechnicianLaborCostRates produces. */
export async function loadLaborCostRates(client, companyId) {
  const { data, error } = await client
    .from("company_memberships")
    .select("user_id, labor_cost_rate_cents")
    .eq("company_id", companyId)
    .eq("status", "active")
    .not("user_id", "is", null);
  if (error) throw new Error(`company_memberships: ${error.message}`);

  const rates = new Map();
  for (const row of data ?? []) {
    if (
      row.user_id &&
      row.labor_cost_rate_cents != null &&
      row.labor_cost_rate_cents >= 0
    ) {
      rates.set(row.user_id, row.labor_cost_rate_cents / 100);
    }
  }
  return rates;
}
