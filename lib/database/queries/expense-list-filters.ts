import { escapeFilterValue } from "@/lib/database/queries/pagination";
import type { FilterableQuery } from "@/lib/database/queries/paged-list";
import type { ExpenseWorkQueue } from "@/shared/components/expenses/expense-work-queues";

/**
 * The expenses list filters and work queues, expressed as database filters.
 *
 * ============================== WHY A PURE MODULE ==============================
 * Same reason as the customer queues and the job filters: re-expressing a rule
 * in SQL creates a second implementation, and nothing compares the two unless
 * something is built to. This module imports nothing from the Supabase server
 * client, so scripts/verify-expense-filters-live.mjs can import BOTH this and
 * the original TypeScript predicates and run them over the same rows.
 *
 * ============================== THE QUEUES OVERLAP ==============================
 * Worth stating, because the customer queues do not and the difference is easy
 * to carry over by mistake. From expense-work-queues.ts:
 *
 *   past          lifecycle is not active, OR status is rejected or reimbursed
 *   needs-review  not past, AND (status = submitted OR receipt is pending)
 *   uncategorized not past, not needs-review, AND (status = draft OR
 *                 category = other OR merchant blank OR amount null)
 *   approved      not past, AND status = approved
 *
 * `approved` does not exclude `uncategorized`, so an approved expense with a
 * catch-all category legitimately appears in both. The differential asserts the
 * SQL agrees with the predicates — it must NOT assert a partition.
 *
 * ============================== THE DATE WINDOW ==============================
 * matchesDateFilter measures from `purchaseDate ?? createdAt`. PostgREST cannot
 * express coalesce in a filter, so it becomes an OR: the purchase date is in
 * range, or there is no purchase date and the created date is. purchase_date is
 * the one nullable column in this set, which is exactly why it needs the branch.
 */

export type ExpenseStatusFilter = string | "all";
export type ExpenseCategoryFilter = string | "all";
export type ExpensePaymentFilter = "all" | "reimbursable" | "company_paid";
export type ExpenseReceiptFilter = "all" | "attached" | "missing";
export type ExpenseDateFilter = "all" | "last_7" | "last_30" | "older";

export type ExpenseListFilterRequest = {
  queue?: ExpenseWorkQueue | null;
  statusFilter?: ExpenseStatusFilter | null;
  categoryFilter?: ExpenseCategoryFilter | null;
  technicianFilter?: string | "all" | null;
  jobFilter?: string | "all" | null;
  paymentFilter?: ExpensePaymentFilter | null;
  receiptFilter?: ExpenseReceiptFilter | null;
  dateFilter?: ExpenseDateFilter | null;
  /** Deep-link context from ?jobId= / ?customerId=. */
  jobIdFilter?: string | null;
  customerIdFilter?: string | null;
  /** Fixed reference so a test can pin "now". */
  reference?: Date;
};

/** Blank after trimming — matches the `!expense.merchant.trim()` test. */
const BLANK_SQL_PATTERN = "^[[:space:]]*$";

const CLOSED_STATUSES = ["rejected", "reimbursed"] as const;

function daysAgoIso(reference: Date, days: number): string {
  return new Date(reference.getTime() - days * 86_400_000).toISOString();
}

/**
 * Lifecycle-active, in the sense getExpenseLifecycleState means it: neither
 * archived nor deleted.
 */
function applyActiveLifecycle<Q extends FilterableQuery<Q>>(query: Q): Q {
  return query.is("deleted_at", null).is("archived_at", null);
}

export function applyExpenseQueueFilters<Q extends FilterableQuery<Q>>(
  query: Q,
  queue: ExpenseWorkQueue,
): Q {
  const blank = escapeFilterValue(BLANK_SQL_PATTERN);

  if (queue === "past") {
    // Archived or deleted, or closed by status.
    return query.or(
      `deleted_at.not.is.null,archived_at.not.is.null,` +
        CLOSED_STATUSES.map((status) => `status.eq.${status}`).join(","),
    );
  }

  // Everything else is lifecycle-active and not closed.
  let scoped = applyActiveLifecycle(query).not(
    "status",
    "in",
    `(${CLOSED_STATUSES.join(",")})`,
  );

  if (queue === "needs-review") {
    return scoped.or("status.eq.submitted,receipt_status.eq.pending");
  }

  if (queue === "approved") {
    return scoped.eq("status", "approved");
  }

  // uncategorized: excludes needs-review as well, then any of four conditions.
  scoped = scoped.neq("status", "submitted").neq("receipt_status", "pending");
  return scoped.or(
    `status.eq.draft,category.eq.other,merchant.is.null,merchant.imatch.${blank},amount.is.null`,
  );
}

export function applyExpenseListFilters<Q extends FilterableQuery<Q>>(
  query: Q,
  request: ExpenseListFilterRequest,
): Q {
  let scoped = query;
  const reference = request.reference ?? new Date();

  if (request.queue) {
    scoped = applyExpenseQueueFilters(scoped, request.queue);
  }

  if (request.statusFilter && request.statusFilter !== "all") {
    scoped = scoped.eq("status", request.statusFilter);
  }
  if (request.categoryFilter && request.categoryFilter !== "all") {
    scoped = scoped.eq("category", request.categoryFilter);
  }
  if (request.technicianFilter && request.technicianFilter !== "all") {
    scoped = scoped.eq("technician_id", request.technicianFilter);
  }
  if (request.jobFilter && request.jobFilter !== "all") {
    scoped = scoped.eq("job_id", request.jobFilter);
  }
  // Deep-link context is ANDed on top of the dropdown filter, exactly as the
  // TypeScript does — they are separate conditions, not alternatives.
  if (request.jobIdFilter) {
    scoped = scoped.eq("job_id", request.jobIdFilter);
  }
  if (request.customerIdFilter) {
    scoped = scoped.eq("customer_id", request.customerIdFilter);
  }

  if (request.paymentFilter === "reimbursable") {
    scoped = scoped.eq("is_reimbursable", "true");
  } else if (request.paymentFilter === "company_paid") {
    scoped = scoped.neq("is_reimbursable", "true");
  }

  if (request.receiptFilter === "attached") {
    scoped = scoped.eq("receipt_status", "attached");
  } else if (request.receiptFilter === "missing") {
    scoped = scoped.neq("receipt_status", "attached");
  }

  const date = request.dateFilter;
  if (date && date !== "all") {
    const days = date === "last_7" ? 7 : 30;
    const cutoff = daysAgoIso(reference, days);

    if (date === "older") {
      scoped = scoped.or(
        `purchase_date.lt.${cutoff},and(purchase_date.is.null,created_at.lt.${cutoff})`,
      );
    } else {
      scoped = scoped.or(
        `purchase_date.gte.${cutoff},and(purchase_date.is.null,created_at.gte.${cutoff})`,
      );
    }
  }

  return scoped;
}
