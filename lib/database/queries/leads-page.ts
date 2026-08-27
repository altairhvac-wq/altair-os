import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  buildKeysetFilter,
  buildPage,
  buildSearchFilter,
  clampPageSize,
  decodeCursor,
  escapeFilterValue,
  normalizeSearchTerm,
  resolveDirection,
  type PageRequest,
  type PaginatedResult,
} from "@/lib/database/queries/pagination";
import {
  applyLeadListFilter,
  type FilterableQuery,
  type LeadFilterRequest,
} from "@/lib/database/queries/lead-list-filters";
import {
  attachLatestActivity,
  attachNetworkReferrals,
  type LeadRowWithRelations,
} from "@/lib/database/queries/leads";
import {
  matchesLeadSearch,
  resolveLeadSourcesMatchingLabel,
  resolveLeadStatusesMatchingLabel,
} from "@/shared/lib/leads/lead-search";
import {
  LEAD_LIST_FILTER_ORDER,
  type LeadListFilter,
} from "@/shared/components/leads/lead-work-queues";
import type { Lead, LeadSourcePerformanceInput } from "@/shared/types/lead";

/**
 * Server-paged leads, with the pipeline aggregated in the database.
 *
 * ============================== WHAT WAS WRONG ==============================
 * The Customers hub loaded every lead in the tenant on every request — on the
 * Customers tab too, where no lead is ever rendered — and then derived the
 * pills, the glance strip and the pipeline metrics from that array in the
 * browser. listLeads has no .limit(), so PostgREST capped the response at 1,000
 * rows and reported the truncation in a header nothing reads.
 *
 * Three separate consequences, and only the first is a performance problem:
 *   - the request carried the whole lead book whatever tab you were on
 *   - leads past the first 1,000 could not be reached at all
 *   - every pipeline figure described the newest 1,000 leads while claiming to
 *     describe the tenant, and since the sort is created_at desc, the leads
 *     dropped were the oldest — which is where won and lost accumulate
 *
 * ============================== HOW SEARCH WORKS ==============================
 * The list search matches a contiguous substring of a haystack that includes
 * two things that are not columns: the *rendered* status and source labels, and
 * the assignee's name. An ilike over lead columns alone would silently stop
 * matching "estimate sent" or a technician's name, so the query is widened
 * before it is narrowed:
 *
 *   1. resolveLeadStatusesMatchingLabel / resolveLeadSourcesMatchingLabel turn
 *      the query into exact enum values. Both option lists are small and fixed,
 *      so this is a lookup, not a second copy of the label rules.
 *   2. assignee names resolve to profile ids with one bounded query.
 *   3. the database returns candidates matching ANY token in ANY of those.
 *   4. the REAL predicate — matchesLeadSearch, the same function the client
 *      calls — decides which candidates actually match.
 *
 * Step 3 is deliberately a superset and step 4 is exact, so the result is
 * exactly what the client would have produced given the whole book.
 *
 * THE ONE DOCUMENTED GAP: lastActivityLabel is also in the haystack, and it is
 * derived from a different table. A lead whose ONLY match is its last-activity
 * label is not returned as a candidate, so it will not appear. Candidates found
 * by any other means are still matched against their activity label in step 4.
 * Closing this properly means a search index over the activity join; it is not
 * worth a second unbounded read, and it is asserted as a known delta in
 * scripts/verify-lead-filters-live.mjs so it cannot widen unnoticed.
 *
 * ============================== SORTING ==============================
 * created_at only, because that is the only total order the database can
 * actually produce for this table: migration 150 indexes
 * (company_id, created_at desc, id desc) and nothing else. The list used to
 * offer next_follow_up_at and status as well, and both are unavailable for a
 * reason rather than an oversight — next_follow_up_at is nullable, so a keyset
 * cursor over it needs explicit null-region handling and a matching partial
 * index; status sorts by STATUS_RANK, which is not the enum's storage order and
 * would need a rank column. Offering either without those would sort one page
 * and present it as sorting the list, which is the class of bug this whole pass
 * exists to remove. Same call as expenses.purchase_date.
 */

const LEAD_SELECT = `
  *,
  assigned_user:profiles!leads_assigned_user_id_fkey (
    id,
    full_name,
    email
  ),
  created_by_profile:profiles!leads_created_by_fkey (
    id,
    full_name,
    email
  )
`;

/** Columns an ilike can reach. The rest of the haystack is handled above. */
const LEAD_SEARCH_COLUMNS = [
  "first_name",
  "last_name",
  "company_name",
  "email",
  "phone",
] as const;

/** Matches searchJobCandidates: enough to rank honestly, bounded so a
 *  one-character query cannot ask for the whole table. */
const SEARCH_CANDIDATE_LIMIT = 500;

export type LeadsPageRequest = PageRequest &
  LeadFilterRequest & {
    /** The secondary status dropdown, independent of the pill. */
    statusFilter?: string | null;
  };

interface LeadQuery extends FilterableQuery<LeadQuery> {
  order: (column: string, options: { ascending: boolean }) => LeadQuery;
  limit: (count: number) => LeadQuery;
}

/** Profile ids in this company whose name or email contains the term. Bounded
 *  by team size, which is the one list on this page that genuinely is small. */
async function resolveAssigneeIdsForSearch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  term: string,
): Promise<string[]> {
  const escaped = escapeFilterValue(`%${term}%`);

  const { data, error } = await supabase
    .from("company_memberships")
    .select("user_id, profiles!inner(full_name, email)")
    .eq("company_id", companyId)
    .or(`full_name.ilike.${escaped},email.ilike.${escaped}`, {
      referencedTable: "profiles",
    })
    .limit(200);

  if (error) {
    console.error("[resolveAssigneeIdsForSearch] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? [])
    .map((row) => (row as { user_id: string }).user_id)
    .filter(Boolean);
}

/**
 * The OR group that finds candidates, or null when the term can only be matched
 * by the parts of the haystack the database cannot see.
 */
function buildLeadCandidateFilter(term: string, assigneeIds: string[]): string {
  const clauses = [buildSearchFilter(LEAD_SEARCH_COLUMNS, term)];

  const statuses = resolveLeadStatusesMatchingLabel(term);
  if (statuses.length > 0) {
    clauses.push(`status.in.(${statuses.map((s) => `"${s}"`).join(",")})`);
  }

  const sources = resolveLeadSourcesMatchingLabel(term);
  if (sources.length > 0) {
    clauses.push(`source.in.(${sources.map((s) => `"${s}"`).join(",")})`);
  }

  if (assigneeIds.length > 0) {
    clauses.push(`assigned_user_id.in.(${assigneeIds.join(",")})`);
  }

  return clauses.join(",");
}

async function enrichLeads(
  companyId: string,
  rows: LeadRowWithRelations[],
): Promise<Lead[]> {
  if (rows.length === 0) return [];
  const withActivity = await attachLatestActivity(companyId, rows);
  return attachNetworkReferrals(companyId, withActivity);
}

/**
 * One page of leads.
 *
 * Lifecycle scope is fixed at active (deleted_at and archived_at both null),
 * which is exactly what listLeads applied before the list was paged. The pills
 * are then evaluated on top of it — see lead-list-filters.ts for why the status
 * pills do not re-check lifecycle.
 */
export async function listLeadsPage(
  companyId: string,
  request: LeadsPageRequest,
): Promise<PaginatedResult<Lead>> {
  const supabase = await createClient();
  const term = normalizeSearchTerm(request.search);

  if (term) {
    return searchLeadsPage(companyId, request, term);
  }

  const pageSize = clampPageSize(request.pageSize);
  const direction = resolveDirection(request.sortDirection, "desc");
  const cursor = decodeCursor(request.cursor);

  const applyShared = <Q extends FilterableQuery<Q>>(query: Q): Q => {
    let scoped = query.is("deleted_at", null).is("archived_at", null);
    scoped = applyLeadListFilter(scoped, request);
    if (request.statusFilter && request.statusFilter !== "all") {
      scoped = scoped.eq("status", request.statusFilter);
    }
    return scoped;
  };

  const rowsQuery = (() => {
    let query = applyShared(
      supabase
        .from("leads")
        .select(LEAD_SELECT)
        .eq("company_id", companyId) as unknown as LeadQuery,
    );
    if (cursor) {
      query = query.or(buildKeysetFilter("created_at", direction, cursor));
    }
    return query
      .order("created_at", { ascending: direction === "asc" })
      .order("id", { ascending: direction === "asc" })
      .limit(pageSize + 1);
  })();

  // Counted with the policy bypassed, for the reason set out in
  // fetchPagedList: the same applyShared closure builds both, so the count
  // cannot describe a wider set than the rows beside it, and the rows stay
  // under RLS.
  const countQuery = applyShared(
    createServiceRoleClient()
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId) as unknown as LeadQuery,
  );

  const [rowsResult, countResult] = await Promise.all([
    rowsQuery as unknown as Promise<{
      data: LeadRowWithRelations[] | null;
      error: { code?: string; message: string } | null;
    }>,
    countQuery as unknown as Promise<{
      count: number | null;
      error: { code?: string; message: string } | null;
    }>,
  ]);

  if (rowsResult.error) {
    console.error("[listLeadsPage] rows query failed:", {
      companyId,
      filter: request.filter,
      code: rowsResult.error.code,
      message: rowsResult.error.message,
    });
    return { rows: [], nextCursor: null, totalCount: 0, hasMore: false };
  }

  if (countResult.error) {
    console.error("[listLeadsPage] count query failed:", {
      companyId,
      filter: request.filter,
      code: countResult.error.code,
      message: countResult.error.message,
    });
  }

  const page = buildPage(
    rowsResult.data ?? [],
    pageSize,
    countResult.count ?? 0,
    (row) => row.created_at ?? "",
  );

  return { ...page, rows: await enrichLeads(companyId, page.rows) };
}

/**
 * The searching branch: candidates from the database, the shipped predicate on
 * top, then a page cut from the result.
 *
 * Paging happens after the exact predicate rather than in the database, because
 * the predicate is the thing that decides membership and it needs the enriched
 * record. The candidate set is capped, so this is bounded work — and when the
 * cap is reached the caller is told rather than shown a confident subset.
 */
async function searchLeadsPage(
  companyId: string,
  request: LeadsPageRequest,
  term: string,
): Promise<PaginatedResult<Lead>> {
  const supabase = await createClient();
  const pageSize = clampPageSize(request.pageSize);
  const cursor = decodeCursor(request.cursor);

  const assigneeIds = await resolveAssigneeIdsForSearch(supabase, companyId, term);

  let query = supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("company_id", companyId) as unknown as LeadQuery;

  query = query.is("deleted_at", null).is("archived_at", null);
  query = applyLeadListFilter(query, request);
  if (request.statusFilter && request.statusFilter !== "all") {
    query = query.eq("status", request.statusFilter);
  }

  const { data, error } = (await query
    .or(buildLeadCandidateFilter(term, assigneeIds))
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(SEARCH_CANDIDATE_LIMIT + 1)) as unknown as {
    data: LeadRowWithRelations[] | null;
    error: { code?: string; message: string } | null;
  };

  if (error) {
    console.error("[searchLeadsPage] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return { rows: [], nextCursor: null, totalCount: 0, hasMore: false };
  }

  const candidates = data ?? [];
  const truncated = candidates.length > SEARCH_CANDIDATE_LIMIT;
  if (truncated) {
    console.warn(
      `[searchLeadsPage] more than ${SEARCH_CANDIDATE_LIMIT} leads match; ` +
        `the search sees the first ${SEARCH_CANDIDATE_LIMIT}.`,
      { companyId },
    );
  }

  const enriched = await enrichLeads(
    companyId,
    truncated ? candidates.slice(0, SEARCH_CANDIDATE_LIMIT) : candidates,
  );
  const matched = enriched.filter((lead) => matchesLeadSearch(lead, term));

  // The cursor for a search page is an offset into the matched set: there is no
  // stable database order to key against once an in-memory predicate has run.
  const offset = cursor ? Number.parseInt(cursor.id, 10) || 0 : 0;
  const slice = matched.slice(offset, offset + pageSize);
  const hasMore = offset + pageSize < matched.length;

  return {
    rows: slice,
    totalCount: matched.length,
    hasMore,
    nextCursor: hasMore
      ? Buffer.from(
          JSON.stringify({ v: String(offset + pageSize), id: String(offset + pageSize) }),
        ).toString("base64url")
      : null,
  };
}

/**
 * A count for every list pill, over the whole book.
 *
 * Seven head requests, issued together. The array these replaced was capped at
 * 1,000 rows, so every pill on a large tenant was a lower bound presented as a
 * total.
 *
 * Counted with the policy bypassed, for the same measured reason as
 * getCustomerQueueCounts: an exact count under RLS re-evaluates the policy
 * per row, and seven of them is seconds rather than milliseconds. The caller
 * has already resolved the company and checked canManageCustomers, and every
 * query below is pinned to that company id and a queue predicate. The row
 * query keeps the user-scoped client.
 */
export async function getLeadFilterCounts(
  companyId: string,
  request: { followUpCutoff: string },
): Promise<Record<LeadListFilter, number>> {
  const supabase = createServiceRoleClient();

  const entries = await Promise.all(
    LEAD_LIST_FILTER_ORDER.map(async (filter) => {
      const { count, error } = (await (applyLeadListFilter(
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .is("deleted_at", null)
          .is("archived_at", null) as unknown as LeadQuery,
        { filter, followUpCutoff: request.followUpCutoff },
      ) as unknown as Promise<unknown>)) as {
        count: number | null;
        error: { code?: string; message: string } | null;
      };

      if (error) {
        console.error("[getLeadFilterCounts] count failed:", {
          companyId,
          filter,
          code: error.code,
          message: error.message,
        });
        return [filter, 0] as const;
      }

      return [filter, count ?? 0] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<LeadListFilter, number>;
}

export type LeadPipelineAggregates = {
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  followUpsDue: number;
  sources: LeadSourcePerformanceInput[];
};

export const EMPTY_LEAD_PIPELINE_AGGREGATES: LeadPipelineAggregates = {
  totalLeads: 0,
  wonLeads: 0,
  lostLeads: 0,
  followUpsDue: 0,
  sources: [],
};

/**
 * The tenant-wide pipeline figures, from migration 160.
 *
 * Only the counts come from SQL. conversionRate, openLeads, ordering and
 * topSourceInsight stay in buildLeadPipelineMetricsFromAggregates, because they
 * are pure functions of these counts and a second implementation of a rounding
 * rule is a second answer waiting to happen.
 */
export async function getLeadPipelineAggregates(
  companyId: string,
  request: { followUpCutoff: string },
): Promise<LeadPipelineAggregates> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_company_lead_pipeline_metrics",
    {
      p_company_id: companyId,
      p_follow_up_cutoff: request.followUpCutoff,
    },
  );

  if (error) {
    console.error("[getLeadPipelineAggregates] rpc failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return EMPTY_LEAD_PIPELINE_AGGREGATES;
  }

  const payload = (data ?? {}) as {
    totals?: Partial<Record<string, number>>;
    sources?: LeadSourcePerformanceInput[];
  };
  const totals = payload.totals ?? {};

  return {
    totalLeads: totals.totalLeads ?? 0,
    wonLeads: totals.wonLeads ?? 0,
    lostLeads: totals.lostLeads ?? 0,
    followUpsDue: totals.followUpsDue ?? 0,
    sources: payload.sources ?? [],
  };
}
