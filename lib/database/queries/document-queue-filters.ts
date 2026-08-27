import type { FilterableQuery } from "@/lib/database/queries/paged-list";
import type { EstimateWorkQueue } from "@/shared/components/estimates/estimate-work-queues";
import type { InvoiceWorkQueue } from "@/shared/components/invoices/invoice-work-queues";

/**
 * The invoice and estimate list queues, expressed as database filters.
 *
 * ============================== WHY A PURE MODULE ==============================
 * The same reason as the customer, job and expense equivalents: re-expressing a
 * rule in SQL creates a second implementation of it, and nothing compares the
 * two unless something is built to. Nothing here imports the Supabase server
 * client, so scripts/verify-document-filters-live.mjs can import BOTH this and
 * the shipped predicates and run them over the same rows.
 *
 * ============================== THE LIFECYCLE DIFFERS BETWEEN THE TWO ==============================
 * This is the part worth reading twice, because the two look alike and are not.
 *
 * getInvoiceLifecycleState checks deleted, then VOIDED, then archived. A void or
 * cancelled invoice is therefore NOT "active" — it is its own lifecycle state,
 * which is exactly what the invoice "Past" queue selects.
 *
 * getEstimateLifecycleState has no voided state at all: deleted, then archived,
 * then active. So a converted or cancelled estimate IS still lifecycle-active,
 * and the estimate "Past" queue selects on status while staying inside active.
 *
 * Translating one from the other is how a queue silently empties.
 */

/** Invoice statuses that put a record in the voided lifecycle. */
const INVOICE_VOIDED_STATUSES = ["void", "cancelled"] as const;

/** Estimate statuses the Past queue collects, all still lifecycle-active. */
const ESTIMATE_PAST_STATUSES = ["converted", "cancelled"] as const;

/**
 * Lifecycle-active for an INVOICE: not deleted, not archived, and not in a
 * voiding status.
 */
function applyInvoiceActive<Q extends FilterableQuery<Q>>(query: Q): Q {
  return query
    .is("deleted_at", null)
    .is("archived_at", null)
    .not("status", "in", `(${INVOICE_VOIDED_STATUSES.join(",")})`);
}

export function applyInvoiceQueueFilters<Q extends FilterableQuery<Q>>(
  query: Q,
  queue: InvoiceWorkQueue,
): Q {
  if (queue === "past") {
    // The voided lifecycle: not deleted, and in a voiding status. Archived is
    // deliberately not excluded — getInvoiceLifecycleState checks voided BEFORE
    // archived, so a voided-and-archived invoice reads as voided.
    return query
      .is("deleted_at", null)
      .in("status", INVOICE_VOIDED_STATUSES);
  }

  // Every other queue is one status inside the active lifecycle, and none of
  // those statuses can be a voiding one.
  return applyInvoiceActive(query).eq("status", queue);
}

export function applyEstimateQueueFilters<Q extends FilterableQuery<Q>>(
  query: Q,
  queue: EstimateWorkQueue,
): Q {
  // Estimates have no voided lifecycle, so "active" is simply not deleted and
  // not archived — for every queue including Past.
  const active = query.is("deleted_at", null).is("archived_at", null);

  if (queue === "past") {
    return active.in("status", ESTIMATE_PAST_STATUSES);
  }

  return active.eq("status", queue);
}
