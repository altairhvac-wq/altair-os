import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
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

  // The COUNT runs with RLS bypassed; the rows above do not. Safe for the same
  // structural reason as fetchPagedList: applyShared builds both, so the count
  // cannot be scoped more broadly than the rows beside it. An exact count under
  // RLS was measured at over two seconds on a large table.
  const countQuery = applyShared(
    createServiceRoleClient()
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
 * they were wrong for exactly the tenants where they mattered. Six head
 * requests run together are cheap and, unlike the array, they count the whole
 * book.
 */
export type CustomerCounts = {
  byQueue: Record<CustomerWorkQueue, number>;
  total: number;
  newThisMonth: number;
};

/**
 * ============================== WHY THE COUNTS BYPASS RLS ==============================
 * Measured on the scale-seeded scratch tenant (5,000 customers), as a real
 * signed-in owner against the same query with the policy bypassed:
 *
 *     four queue counts, concurrently    3,536 ms   vs   187 ms
 *     one unfiltered count               1,439 ms   vs   146 ms
 *
 * An exact count makes the planner evaluate the SELECT policy — is_active_company_member
 * and friends — once per row it counts. Six of those put roughly five seconds on
 * the Customers page, which is where the 6.3-second render came from after the
 * lead book was removed from it.
 *
 * The two things RLS would enforce here are enforced above and below it: the
 * page resolves the active company context and checks canManageCustomers before
 * calling, and every query below is pinned to that company id and to a queue
 * predicate, neither of which comes from user input. The ROW queries keep the
 * user-scoped client — rows are what a mistake would actually leak, they are
 * bounded to one page, and RLS staying in that path is worth the milliseconds.
 *
 * Same call, same reasoning, as getExpenseQueueCounts.
 */
export async function getCustomerQueueCounts(
  companyId: string,
  options?: { monthStartIso?: string },
): Promise<CustomerCounts> {
  const supabase = createServiceRoleClient();
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

  // Total and New This Month are the two summary figures on the strip. They are
  // counted over the lifecycle-active book, matching what "Total Customers"
  // meant when it was array.length before the list was paged.
  const totalPromise = supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .is("archived_at", null);

  const monthStart = options?.monthStartIso;
  const newThisMonthPromise = monthStart
    ? supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .is("archived_at", null)
        .gte("created_at", monthStart)
    : Promise.resolve({ count: 0, error: null });

  const [totalResult, newResult] = await Promise.all([
    totalPromise,
    newThisMonthPromise,
  ]);

  return {
    byQueue: Object.fromEntries(results) as Record<CustomerWorkQueue, number>,
    total: totalResult.count ?? 0,
    newThisMonth: newResult.count ?? 0,
  };
}
