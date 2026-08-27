import { escapeFilterValue } from "@/lib/database/queries/pagination";
import type { CustomerWorkQueue } from "@/shared/components/customers/customer-work-queues";

/**
 * The customer work queues, expressed as database filters.
 *
 * ============================== WHY THIS IS A SEPARATE, PURE MODULE ==============================
 * These predicates used to be JavaScript run over whatever rows had reached the
 * browser, which is precisely why they were wrong at scale: the "needs info"
 * count was computed across 1,000 of a tenant's 5,000 customers and presented
 * as the state of the whole book.
 *
 * Re-expressing them in SQL creates the risk that broke migration 151 — two
 * implementations of one rule, drifting apart with nothing comparing them. This
 * module therefore imports nothing from the Supabase server client, so
 * scripts/verify-customer-queues-live.mjs can import BOTH this and the original
 * TypeScript predicates and run them against the same rows. The test compares
 * what ships against what ships.
 *
 * ============================== THE TRANSLATION ==============================
 * From shared/components/customers/customer-work-queues.ts:
 *
 *   past      = archived OR deleted
 *   inactive  = lifecycle-active AND status = 'inactive'
 *   needs-info= lifecycle-active AND status <> 'inactive'
 *               AND validateCustomerFormData(requireContact, requireAddress) fails
 *   active    = lifecycle-active AND status = 'active' AND NOT needs-info
 *
 * needs-info reads like arbitrary application logic. Expanded it is six
 * emptiness tests plus one regex:
 *
 *   email, phone, address_line1, city, state, postal_code all non-blank, and
 *   if email is present it matches /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 *
 * "Blank" means blank AFTER TRIMMING, because normalizeCustomerFormData trims
 * before validating. A column holding a single space is missing in the UI, so it
 * has to be missing here — which a plain `= ''` test would get wrong. The
 * comparisons below are written against btrim for that reason.
 */

/** POSIX form of EMAIL_PATTERN in shared/lib/email-validation.ts. */
export const EMAIL_SQL_PATTERN = "^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$";

/**
 * "Blank" in the sense normalizeCustomerFormData means it: empty AFTER trimming.
 *
 * A plain `= ''` test gets this wrong. A column holding a single space reads as
 * missing everywhere in the UI, because the form data is trimmed before it is
 * validated, so the database filter has to agree or the queue counts drift from
 * what the user sees on the record.
 */
export const BLANK_SQL_PATTERN = "^[[:space:]]*$";

/** The fields validateCustomerFormData requires when both option flags are on. */
export const REQUIRED_CONTACT_COLUMNS = [
  "email",
  "phone",
  "address_line1",
  "city",
  "state",
  "postal_code",
] as const;

export type CustomerQueueRequest = {
  queue: CustomerWorkQueue;
  /** Only meaningful for the "past" queue. */
  pastLifecycle?: "archived" | "deleted" | null;
};

export type FilterableQuery<Q> = {
  is: (column: string, value: null) => Q;
  not: (column: string, operator: string, value: string | null) => Q;
  eq: (column: string, value: string) => Q;
  neq: (column: string, value: string) => Q;
  or: (filter: string) => Q;
  filter: (column: string, operator: string, value: string) => Q;
};

/**
 * Applies the lifecycle and queue predicates.
 *
 * Used by BOTH the row query and the count query. The classic way a paginated
 * list lies is a count computed over a filter that differs slightly from the
 * rows, so there is deliberately only one place the filter is built.
 */
export function applyCustomerQueueFilters<Q extends FilterableQuery<Q>>(
  query: Q,
  request: CustomerQueueRequest,
): Q {
  const { queue, pastLifecycle } = request;

  if (queue === "past") {
    if (pastLifecycle === "deleted") {
      return query.not("deleted_at", "is", null);
    }
    if (pastLifecycle === "archived") {
      return query.is("deleted_at", null).not("archived_at", "is", null);
    }
    return query.or("deleted_at.not.is.null,archived_at.not.is.null");
  }

  // Every remaining queue is lifecycle-active.
  let scoped = query.is("deleted_at", null).is("archived_at", null);

  if (queue === "inactive") {
    return scoped.eq("status", "inactive");
  }

  // needs-info and active both exclude inactive.
  scoped = scoped.neq("status", "inactive");

  const blank = escapeFilterValue(BLANK_SQL_PATTERN);

  if (queue === "needs-info") {
    // Any required field blank after trimming, OR an email present but invalid.
    const missingRequired = REQUIRED_CONTACT_COLUMNS.map(
      (column) => `${column}.is.null,${column}.imatch.${blank}`,
    ).join(",");

    return scoped.or(
      `${missingRequired},` +
        `and(email.not.imatch.${blank},email.not.imatch.${escapeFilterValue(EMAIL_SQL_PATTERN)})`,
    );
  }

  // active: not inactive, every required field present, email well formed.
  //
  // NOT `status = 'active'`. The customer_status enum has three values —
  // active, inactive, lead — but the domain has two: normalizeCustomerStatus
  // maps anything that is not 'inactive' to 'active'. So a customer stored as
  // 'lead' is Active to the application, and filtering on the literal would
  // hide those rows from the queue they belong to. `scoped` already carries
  // .neq("status", "inactive"), which is the correct expression of it.
  let complete = scoped;
  for (const column of REQUIRED_CONTACT_COLUMNS) {
    complete = complete.not(column, "is", null).not(column, "imatch", BLANK_SQL_PATTERN);
  }
  return complete.filter("email", "imatch", EMAIL_SQL_PATTERN);
}
