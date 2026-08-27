import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  buildKeysetFilter,
  buildPage,
  buildSearchFilter,
  clampPageSize,
  decodeCursor,
  normalizeSearchTerm,
  resolveDirection,
  resolveSort,
  type PageRequest,
  type PaginatedResult,
} from "@/lib/database/queries/pagination";
import { mapCustomerRowToCustomer } from "@/lib/database/mappers/customer";
import {
  applyCustomerQueueFilters,
  type FilterableQuery,
  type CustomerQueueRequest,
} from "@/lib/database/queries/customer-queue-filters";
import type { CustomerRow } from "@/lib/database/types/core-tables";
import type { Customer } from "@/shared/types/customer";
import type { CustomerWorkQueue } from "@/shared/components/customers/customer-work-queues";

/**
 * Server-paged customers, with the work queues evaluated in the database.
 *
 * ============================== THE PREDICATES MOVED ==============================
 * These queues used to be JavaScript predicates run over whatever rows had been
 * shipped to the browser. That is why they were wrong at scale: a queue counted
 * "needs info" across 1,000 of 5,000 customers and presented the answer as the
 * whole book.
 *
 * They are reproduced here as SQL. The translation is exact, and the mapping is
 * written out so the two can be compared without inferring anything:
 *
 *   shared/components/customers/customer-work-queues.ts
 *     isCustomerPastQueue      = lifecycle is archived or deleted
 *     isCustomerInactiveQueue  = lifecycle active AND status = 'inactive'
 *     isCustomerNeedsInfoQueue = lifecycle active AND status <> 'inactive'
 *                                AND validateCustomerFormData(...) !== null
 *     isCustomerActiveQueue    = lifecycle active AND status = 'active'
 *                                AND NOT needs-info
 *
 * ============================== THE ONE THAT LOOKED IMPOSSIBLE ==============================
 * needs-info runs validateCustomerFormData with requireContact and
 * requireAddress, which reads as arbitrary application logic. Expanded, it is
 * six emptiness tests plus one regex:
 *
 *     email, phone, address_line1, city, state, postal_code all non-blank
 *     and, if email is present, it matches /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 *
 * Every part of that is expressible in SQL. The JS regex maps to the POSIX
 * class form directly. "Blank" means empty after trimming, because
 * normalizeCustomerFormData trims before testing — so a column holding a single
 * space counts as missing in the UI and must count as missing here too, which a
 * plain `= ''` comparison would get wrong.
 */

/** Columns offered for sorting. Each has a (company_id, column, id) index from migration 150. */
const SORTABLE = ["created_at", "name"] as const;
export type CustomerSortColumn = (typeof SORTABLE)[number];

const SEARCH_COLUMNS = [
  "name",
  "email",
  "phone",
  "company_name",
  "city",
  "state",
  "postal_code",
] as const;

export type CustomersPageRequest = PageRequest & CustomerQueueRequest;

export async function listCustomersPage(
  companyId: string,
  request: CustomersPageRequest,
): Promise<PaginatedResult<Customer>> {
  const supabase = await createClient();

  const pageSize = clampPageSize(request.pageSize);
  const sortColumn = resolveSort<CustomerSortColumn>(
    request.sortColumn,
    SORTABLE,
    "created_at",
  );
  const direction = resolveDirection(request.sortDirection, "desc");
  const term = normalizeSearchTerm(request.search);
  const cursor = decodeCursor(request.cursor);

  const applyShared = <Q extends FilterableQuery<Q>>(query: Q): Q => {
    let scoped = applyCustomerQueueFilters(query, request);
    if (term) {
      scoped = scoped.or(buildSearchFilter(SEARCH_COLUMNS, term));
    }
    return scoped;
  };

  // Rows and count run concurrently; both go through applyShared so they cannot
  // disagree about what is being paged.
  const rowsQuery = (() => {
    let query = applyShared(
      supabase.from("customers").select("*").eq("company_id", companyId),
    );
    if (cursor) {
      query = query.or(buildKeysetFilter(sortColumn, direction, cursor));
    }
    return query
      .order(sortColumn, { ascending: direction === "asc" })
      .order("id", { ascending: direction === "asc" })
      .limit(pageSize + 1);
  })();

  const countQuery = applyShared(
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
  );

  const [rowsResult, countResult] = await Promise.all([rowsQuery, countQuery]);

  if (rowsResult.error) {
    console.error("[listCustomersPage] rows query failed:", {
      companyId,
      queue: request.queue,
      code: rowsResult.error.code,
      message: rowsResult.error.message,
    });
    return { rows: [], nextCursor: null, totalCount: 0, hasMore: false };
  }

  if (countResult.error) {
    console.error("[listCustomersPage] count query failed:", {
      companyId,
      queue: request.queue,
      code: countResult.error.code,
      message: countResult.error.message,
    });
  }

  const page = buildPage(
    (rowsResult.data ?? []) as CustomerRow[],
    pageSize,
    countResult.count ?? 0,
    (row) => (sortColumn === "name" ? row.name : row.created_at),
  );

  return { ...page, rows: page.rows.map(mapCustomerRowToCustomer) };
}

/**
 * Counts for every queue in one pass, for the tab strip.
 *
 * These were previously derived by filtering the in-memory array, which is why
 * they were wrong for exactly the tenants where they mattered. Five head
 * requests are cheap (~170 ms each, run together) and, unlike the array, they
 * count the whole book.
 */
export async function getCustomerQueueCounts(
  companyId: string,
): Promise<Record<CustomerWorkQueue, number>> {
  const supabase = await createClient();
  const queues: CustomerWorkQueue[] = ["active", "needs-info", "inactive", "past"];

  const results = await Promise.all(
    queues.map(async (queue) => {
      const { count, error } = await applyCustomerQueueFilters(
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        { queue, pageSize: 0 } as CustomersPageRequest,
      );
      if (error) {
        console.error("[getCustomerQueueCounts] count failed:", {
          companyId,
          queue,
          code: error.code,
          message: error.message,
        });
        return [queue, 0] as const;
      }
      return [queue, count ?? 0] as const;
    }),
  );

  return Object.fromEntries(results) as Record<CustomerWorkQueue, number>;
}
