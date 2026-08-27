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

/**
 * One implementation of "page a tenant-scoped list".
 *
 * Six list surfaces need identical mechanics — keyset cursor, server-side
 * search, an exact count over the same filter, a stable (column, id) sort. Six
 * copies of that would be six chances for the count and the rows to be built
 * from subtly different filters, which is the classic way a paginated list
 * reports a total it cannot actually show you.
 *
 * So the mechanics live here once and each entity supplies only what is
 * genuinely different: its table, its select, which columns may be sorted and
 * searched, how a row becomes a domain object, and any entity-specific filter.
 */

export type FilterableQuery<Q> = {
  is: (column: string, value: null) => Q;
  not: (column: string, operator: string, value: string | null) => Q;
  eq: (column: string, value: string) => Q;
  neq: (column: string, value: string) => Q;
  in: (column: string, values: readonly string[]) => Q;
  or: (filter: string) => Q;
  filter: (column: string, operator: string, value: string) => Q;
  gt: (column: string, value: string | number) => Q;
};

export type PagedListConfig<TRow, TDomain, TRequest extends PageRequest> = {
  /** Used only in log lines, so a failure names the caller. */
  label: string;
  table: string;
  select: string;
  /**
   * Sortable columns. Each MUST have a (company_id, column, id) index —
   * migration 150 created them. Offering a sort without its index turns every
   * page into a sort of the whole tenant, which is the cost this module exists
   * to avoid, so adding one here is a decision to add the index too.
   */
  sortable: readonly string[];
  defaultSort: string;
  defaultDirection?: "asc" | "desc";
  searchColumns: readonly string[];
  /** Entity-specific scoping. Applied to the rows AND the count. */
  applyFilters?: <Q extends FilterableQuery<Q>>(query: Q, request: TRequest) => Q;
  map: (row: TRow) => TDomain;
  /** The cursor value for a row under the active sort. Must never be null. */
  sortValue: (row: TRow, column: string) => string | number;
};

type QueryError = { code?: string; message: string };

type QueryResult<TRow> = {
  data: TRow[] | null;
  error: QueryError | null;
  count?: number | null;
};

/**
 * The slice of the Supabase query builder this module uses.
 *
 * Written structurally rather than importing the real generic type, because
 * that type is keyed to the schema by table-name literal and cannot be
 * expressed for a table chosen at runtime. Typing the surface we actually touch
 * keeps this checked without an `any` — if the client ever stops offering one of
 * these, this fails to compile rather than at a customer.
 */
export interface PagedQuery<TRow>
  extends PromiseLike<QueryResult<TRow>>,
    FilterableQuery<PagedQuery<TRow>> {
  order(column: string, options: { ascending: boolean }): PagedQuery<TRow>;
  limit(count: number): PagedQuery<TRow>;
}

export type PagedClient = {
  from(table: string): {
    select<TRow>(
      columns: string,
      options?: { count?: "exact"; head?: boolean },
    ): PagedQuery<TRow>;
  };
};

/**
 * Runs one page plus its exact count.
 *
 * The two queries are built by the SAME closure and run concurrently. That is
 * deliberate: the failure mode worth designing against is not slowness, it is a
 * total that was computed over a different filter than the rows beneath it.
 */
export async function fetchPagedList<TRow extends { id: string }, TDomain, TRequest extends PageRequest>(
  supabase: PagedClient,
  companyId: string,
  config: PagedListConfig<TRow, TDomain, TRequest>,
  request: TRequest,
): Promise<PaginatedResult<TDomain>> {
  const pageSize = clampPageSize(request.pageSize);
  const sortColumn = resolveSort(request.sortColumn, config.sortable, config.defaultSort);
  const direction = resolveDirection(request.sortDirection, config.defaultDirection ?? "desc");
  const term = normalizeSearchTerm(request.search);
  const cursor = decodeCursor(request.cursor);

  const applyShared = <Q extends FilterableQuery<Q>>(query: Q): Q => {
    let scoped = config.applyFilters ? config.applyFilters(query, request) : query;
    if (term) {
      scoped = scoped.or(buildSearchFilter(config.searchColumns, term));
    }
    return scoped;
  };

  let rowsQuery = applyShared(
    supabase.from(config.table).select<TRow>(config.select).eq("company_id", companyId),
  );
  if (cursor) {
    rowsQuery = rowsQuery.or(buildKeysetFilter(sortColumn, direction, cursor));
  }
  rowsQuery = rowsQuery
    .order(sortColumn, { ascending: direction === "asc" })
    .order("id", { ascending: direction === "asc" })
    .limit(pageSize + 1);

  const countQuery = applyShared(
    supabase
      .from(config.table)
      .select<TRow>("id", { count: "exact", head: true })
      .eq("company_id", companyId),
  );

  const [rowsResult, countResult] = await Promise.all([rowsQuery, countQuery]);

  if (rowsResult.error) {
    console.error(`[${config.label}] rows query failed:`, {
      companyId,
      code: rowsResult.error.code,
      message: rowsResult.error.message,
    });
    return { rows: [], nextCursor: null, totalCount: 0, hasMore: false };
  }

  if (countResult.error) {
    // The rows are still good; only the total is unknown. Reporting zero rows
    // here would hide records the reader can legitimately see.
    console.error(`[${config.label}] count query failed:`, {
      companyId,
      code: countResult.error.code,
      message: countResult.error.message,
    });
  }

  const page = buildPage(
    (rowsResult.data ?? []) as TRow[],
    pageSize,
    countResult.count ?? 0,
    (row) => config.sortValue(row, sortColumn),
  );

  return { ...page, rows: page.rows.map(config.map) };
}

export type { PageRequest, PaginatedResult };
