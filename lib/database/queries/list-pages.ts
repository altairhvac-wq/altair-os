import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  fetchPagedList,
  type FilterableQuery,
  type PagedClient,
  type PageRequest,
  type PaginatedResult,
} from "@/lib/database/queries/paged-list";
import { escapeFilterValue, normalizeSearchTerm } from "@/lib/database/queries/pagination";
import { mapInvoiceRowToInvoice } from "@/lib/database/queries/invoices";
import { mapEstimateRowToEstimate } from "@/lib/database/queries/estimates";
import {
  mapJobRowToJob,
  type JobRowWithTechnician,
} from "@/lib/database/mappers/job";
import { mapExpenseRow } from "@/lib/database/queries/expenses";
import {
  applyExpenseListFilters,
  applyExpenseQueueFilters,
  type ExpenseListFilterRequest,
} from "@/lib/database/queries/expense-list-filters";
import type { ExpenseWorkQueue } from "@/shared/components/expenses/expense-work-queues";
import { mapLeadRowToLead } from "@/lib/database/queries/leads";
import {
  applyJobPageFilters,
  JOB_SEARCH_COLUMNS,
  type JobPageFilterRequest,
} from "@/lib/database/queries/job-page-filters";

/**
 * Server-paged versions of the remaining list surfaces.
 *
 * Every one of these was previously an unbounded select, so every one of them
 * silently stopped at PostgREST's 1000-row response ceiling. The mechanics live
 * in paged-list.ts; this file is the per-entity configuration and the lifecycle
 * scoping each list needs.
 */

/**
 * Which lifecycle slice a list is showing. Every one of these surfaces has the
 * same three, spelled differently in each page today.
 */
export type LifecycleScope = "active" | "archived" | "deleted";

export type ListPageRequest = PageRequest & {
  scope?: LifecycleScope;
  /** Entity status filter, already validated against that entity's enum. */
  status?: string | null;
};

function applyLifecycle<Q extends FilterableQuery<Q>>(
  query: Q,
  request: ListPageRequest,
): Q {
  const scope = request.scope ?? "active";

  if (scope === "deleted") {
    return query.not("deleted_at", "is", null);
  }
  if (scope === "archived") {
    return query.is("deleted_at", null).not("archived_at", "is", null);
  }
  return query.is("deleted_at", null).is("archived_at", null);
}

function applyStatus<Q extends FilterableQuery<Q>>(
  query: Q,
  request: ListPageRequest,
): Q {
  if (!request.status || request.status === "all") return query;
  return query.eq("status", request.status);
}

function applyScopeAndStatus<Q extends FilterableQuery<Q>>(
  query: Q,
  request: ListPageRequest,
): Q {
  return applyStatus(applyLifecycle(query, request), request);
}

/**
 * Resolves a customer-name search into ids, so document lists can be searched
 * by who the document is for.
 *
 * PostgREST cannot OR a filter on an embedded resource together with filters on
 * the parent, so "invoice number OR customer name" has to become two queries.
 *
 * The id list is capped at 200 deliberately. Those ids are inlined into the
 * request line, where the measured ceiling is 396 uuids (see chunked-in.ts), and
 * this clause shares that line with everything else. 200 leaves real margin. The
 * cap is reported rather than silently applied — a search that matches more than
 * 200 distinct customers is not a search anyone is reading results from, but it
 * should still not pretend to be exhaustive.
 */
const CUSTOMER_MATCH_CAP = 200;

async function resolveCustomerIdsForSearch(
  supabase: PagedClient,
  companyId: string,
  term: string,
): Promise<string[]> {
  const escaped = escapeFilterValue(`%${term}%`);
  const { data, error } = await supabase
    .from("customers")
    .select<{ id: string }>("id")
    .eq("company_id", companyId)
    .or(`name.ilike.${escaped},company_name.ilike.${escaped}`)
    .limit(CUSTOMER_MATCH_CAP);

  if (error) {
    console.error("[resolveCustomerIdsForSearch] failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  const ids = (data ?? []).map((row) => row.id);
  if (ids.length === CUSTOMER_MATCH_CAP) {
    console.warn(
      `[resolveCustomerIdsForSearch] search matched at least ${CUSTOMER_MATCH_CAP} ` +
        `customers; document results are limited to those.`,
      { companyId },
    );
  }
  return ids;
}

/**
 * Builds the extra `or` term that widens a document search to the customer.
 * Returns null when there is nothing to add.
 */
function customerIdFilter(customerIds: readonly string[]): string | null {
  if (customerIds.length === 0) return null;
  return `customer_id.in.(${customerIds.join(",")})`;
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

const INVOICE_SELECT = `
  *,
  customers(name, email),
  jobs(job_number),
  estimates(estimate_number),
  invoice_line_items(id)
`;

export async function listInvoicesPage(
  companyId: string,
  request: ListPageRequest,
): Promise<PaginatedResult<ReturnType<typeof mapInvoiceRowToInvoice>>> {
  const supabase = (await createClient()) as unknown as PagedClient;
  const term = normalizeSearchTerm(request.search);
  const customerIds = term
    ? await resolveCustomerIdsForSearch(supabase, companyId, term)
    : [];

  return fetchPagedList(supabase, companyId, {
    label: "listInvoicesPage",
    table: "invoices",
    select: INVOICE_SELECT,
    // due_date is nullable in principle, so it is not offered as a sort — a
    // null sort value makes a keyset cursor ambiguous.
    sortable: ["created_at", "issue_date", "total"],
    defaultSort: "created_at",
    searchColumns: ["invoice_number", "notes"],
    applyFilters: (query, req) => {
      const scoped = applyScopeAndStatus(query, req);
      const byCustomer = customerIdFilter(customerIds);
      // Widen the search to documents belonging to matching customers. Adding
      // it as its own `or` keeps it ANDed with the scope filters above.
      return byCustomer && term
        ? scoped.or(
            `invoice_number.ilike.${escapeFilterValue(`%${term}%`)},${byCustomer}`,
          )
        : scoped;
    },
    map: mapInvoiceRowToInvoice,
    sortValue: (row, column) =>
      column === "total"
        ? Number(row.total)
        : column === "issue_date"
          ? row.issue_date
          : row.created_at,
  }, request);
}

// ---------------------------------------------------------------------------
// Estimates
// ---------------------------------------------------------------------------

const ESTIMATE_SELECT = `
  *,
  customers(name, email),
  jobs(job_number),
  estimate_line_items(id)
`;

export async function listEstimatesPage(
  companyId: string,
  request: ListPageRequest,
): Promise<PaginatedResult<ReturnType<typeof mapEstimateRowToEstimate>>> {
  const supabase = (await createClient()) as unknown as PagedClient;
  const term = normalizeSearchTerm(request.search);
  const customerIds = term
    ? await resolveCustomerIdsForSearch(supabase, companyId, term)
    : [];

  return fetchPagedList(supabase, companyId, {
    label: "listEstimatesPage",
    table: "estimates",
    select: ESTIMATE_SELECT,
    sortable: ["created_at", "total"],
    defaultSort: "created_at",
    searchColumns: ["estimate_number", "notes"],
    applyFilters: (query, req) => {
      const scoped = applyScopeAndStatus(query, req);
      const byCustomer = customerIdFilter(customerIds);
      return byCustomer && term
        ? scoped.or(
            `estimate_number.ilike.${escapeFilterValue(`%${term}%`)},${byCustomer}`,
          )
        : scoped;
    },
    map: mapEstimateRowToEstimate,
    sortValue: (row, column) =>
      column === "total" ? Number(row.total) : row.created_at,
  }, request);
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

const JOB_SELECT = `
  *,
  customers(name),
  assigned_technician:profiles!jobs_assigned_technician_id_fkey(full_name, email)
`;

export type JobsPageRequest = ListPageRequest &
  JobPageFilterRequest & {
    /** Technicians see only their own work; this is enforced here, not in the UI. */
    assignedTechnicianId?: string | null;
  };

export async function listJobsPage(
  companyId: string,
  request: JobsPageRequest,
): Promise<PaginatedResult<ReturnType<typeof mapJobRowToJob>>> {
  const supabase = (await createClient()) as unknown as PagedClient;
  const term = normalizeSearchTerm(request.search);
  const customerIds = term
    ? await resolveCustomerIdsForSearch(supabase, companyId, term)
    : [];

  return fetchPagedList(supabase, companyId, {
    label: "listJobsPage",
    table: "jobs",
    select: JOB_SELECT,
    sortable: ["created_at", "scheduled_at"],
    defaultSort: "scheduled_at",
    searchColumns: JOB_SEARCH_COLUMNS,
    applyFilters: (query, req) => {
      // applyLifecycle only — the status filter comes from applyJobPageFilters,
      // which knows about the dispatch board's two-status In Progress case.
      let scoped = applyJobPageFilters(applyLifecycle(query, req), req);
      if (req.assignedTechnicianId) {
        scoped = scoped.eq("assigned_technician_id", req.assignedTechnicianId);
      }
      const byCustomer = customerIdFilter(customerIds);
      return byCustomer && term
        ? scoped.or(`job_number.ilike.${escapeFilterValue(`%${term}%`)},${byCustomer}`)
        : scoped;
    },
    map: mapJobRowToJob,
    sortValue: (row, column) =>
      column === "created_at" ? row.created_at : row.scheduled_at,
  }, request);
}

/**
 * Candidate retrieval for a RANKED search.
 *
 * ============================== WHY TWO STAGES ==============================
 * The jobs list does not filter on a search term, it RANKS on one:
 * rankAndSortRecords scores exact, prefix, substring, token and typo matches
 * differently per field kind, and shows the user which field matched and why.
 * Reproducing that in SQL would mean reimplementing fuzzy matching and a scoring
 * table in a second language, then keeping the two in agreement forever — the
 * failure this codebase has already had twice.
 *
 * So the stages are split by what each is actually good at. The DATABASE decides
 * which rows could plausibly match, across the whole tenant. The EXISTING
 * ranking function decides how well each one matches, unchanged.
 *
 * That is not a simplification of the current behaviour, it is a correction of
 * it: ranking previously ran over whatever rows had survived PostgREST's
 * 1000-row ceiling, so a job that matched perfectly was invisible if it was not
 * among the most recent thousand. Now the candidates come from the whole book.
 *
 * ============================== THE CAP ==============================
 * A broad substring match can still be large, so the candidate set is bounded.
 * The bound is reported rather than silently applied — a search matching more
 * than this many jobs is not one anyone is reading results from, but it should
 * not claim to be exhaustive either.
 */
export const SEARCH_CANDIDATE_LIMIT = 500;

export type SearchCandidates<TRow> = {
  rows: TRow[];
  /** True when the candidate set hit the cap and may be incomplete. */
  truncated: boolean;
};

export async function searchJobCandidates(
  companyId: string,
  request: JobsPageRequest,
  db?: PagedClient,
): Promise<SearchCandidates<ReturnType<typeof mapJobRowToJob>>> {
  // Injectable so the scale verification can drive this exact function.
  const supabase = db ?? ((await createClient()) as unknown as PagedClient);
  const term = normalizeSearchTerm(request.search);
  if (!term) return { rows: [], truncated: false };

  const customerIds = await resolveCustomerIdsForSearch(supabase, companyId, term);
  const escaped = escapeFilterValue(`%${term}%`);
  const byCustomer = customerIdFilter(customerIds);

  const ownColumns = JOB_SEARCH_COLUMNS.map(
    (column) => `${column}.ilike.${escaped}`,
  ).join(",");

  let query = applyJobPageFilters(
    applyLifecycle(
      supabase
        .from("jobs")
        .select<JobRowWithTechnician>(JOB_SELECT)
        .eq("company_id", companyId),
      request,
    ),
    request,
  );

  if (request.assignedTechnicianId) {
    query = query.eq("assigned_technician_id", request.assignedTechnicianId);
  }

  const { data, error } = await query
    .or(byCustomer ? `${ownColumns},${byCustomer}` : ownColumns)
    .order("scheduled_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(SEARCH_CANDIDATE_LIMIT + 1);

  if (error) {
    console.error("[searchJobCandidates] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return { rows: [], truncated: false };
  }

  const rows = (data ?? []);
  const truncated = rows.length > SEARCH_CANDIDATE_LIMIT;
  if (truncated) {
    console.warn(
      `[searchJobCandidates] more than ${SEARCH_CANDIDATE_LIMIT} jobs match; ranking sees the first ${SEARCH_CANDIDATE_LIMIT}.`,
      { companyId },
    );
  }

  return {
    rows: (truncated ? rows.slice(0, SEARCH_CANDIDATE_LIMIT) : rows).map(mapJobRowToJob),
    truncated,
  };
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

const EXPENSE_SELECT_LIST = `
  *,
  technician:profiles!expenses_technician_id_fkey(full_name, email),
  job:jobs(job_number, customer_id)
`;

export type ExpensesPageRequest = ListPageRequest &
  ExpenseListFilterRequest & {
    /** Field staff see only their own expenses. Enforced here. */
    technicianId?: string | null;
  };

export async function listExpensesPage(
  companyId: string,
  request: ExpensesPageRequest,
): Promise<PaginatedResult<ReturnType<typeof mapExpenseRow>>> {
  const supabase = (await createClient()) as unknown as PagedClient;

  return fetchPagedList(supabase, companyId, {
    label: "listExpensesPage",
    table: "expenses",
    select: EXPENSE_SELECT_LIST,
    // purchase_date is NOT offered: it is the one nullable candidate among all
    // of these, and a null sort value makes a keyset cursor ambiguous — the walk
    // would skip rows rather than fail. Offering it would need a NOT NULL
    // backfill first.
    sortable: ["created_at", "amount"],
    defaultSort: "created_at",
    searchColumns: ["expense_number", "merchant", "notes"],
    applyFilters: (query, req) => {
      // The queue carries its own lifecycle rule — "past" deliberately includes
      // archived and deleted — so applyLifecycle is only used when no queue is
      // selected. Applying both would make "past" return nothing.
      const base = req.queue ? query : applyLifecycle(query, req);
      const scoped = applyExpenseListFilters(base, req);
      return req.technicianId ? scoped.eq("technician_id", req.technicianId) : scoped;
    },
    map: mapExpenseRow,
    sortValue: (row, column) =>
      column === "amount" ? Number(row.amount) : row.created_at,
  }, request);
}

/**
 * Options for the expenses page's technician and job dropdowns.
 *
 * These were previously derived from the loaded expense array, which is exactly
 * the pattern paging breaks: with 50 rows on screen the dropdowns would offer
 * whichever handful of technicians and jobs happened to appear, and a filter the
 * user needs would simply not be listed.
 *
 * Each now has its own bounded source. Technicians come from the membership
 * roster, which is bounded by the size of the company rather than by its
 * history. Jobs are the distinct jobs that actually have expenses, most recent
 * first and capped — an unbounded job picker is the same defect wearing a
 * different hat.
 */
export const EXPENSE_JOB_OPTION_LIMIT = 200;

/**
 * Queue counts over the whole tenant.
 *
 * Previously derived by filtering the loaded array, which meant the tab strip
 * described whatever had been shipped to the browser rather than the book. Four
 * head requests run together are cheap and, unlike the array, they count
 * everything.
 *
 * Scoped by technician when the caller may only see their own expenses, so the
 * counts match the list beneath them.
 *
 * ============================== WHY SERVICE-ROLE HERE ==============================
 * An exact count under RLS was measured at 1.4-1.7 SECONDS on this table, against
 * 139-177 ms for the same count with RLS bypassed. The expenses SELECT policy
 * evaluates is_active_company_member and can_view_company_expenses, and an exact
 * count makes the planner run that for every row it counts. Four of those put
 * roughly four seconds on the page.
 *
 * The caller has already been authorized — the page resolves the active company
 * context and its permissions before reaching here, and passes technicianId
 * precisely when the caller may only see their own. So the two things RLS would
 * enforce are enforced above, and enforced again below by the explicit
 * company_id and technician_id filters, which are not derived from user input.
 *
 * The ROW query deliberately keeps the user-scoped client. Rows are what a
 * mistake would actually leak, they are bounded to one page, and RLS staying in
 * that path is worth more than the milliseconds.
 */
export async function getExpenseQueueCounts(
  companyId: string,
  technicianId: string | null,
): Promise<Record<ExpenseWorkQueue, number>> {
  const supabase = createServiceRoleClient() as unknown as PagedClient;
  const queues: ExpenseWorkQueue[] = [
    "needs-review",
    "uncategorized",
    "approved",
    "past",
  ];

  const results = await Promise.all(
    queues.map(async (queue) => {
      let query = applyExpenseQueueFilters(
        supabase
          .from("expenses")
          .select<{ id: string }>("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        queue,
      );
      if (technicianId) query = query.eq("technician_id", technicianId);

      const { count, error } = await query;
      if (error) {
        console.error("[getExpenseQueueCounts] count failed:", {
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

  return Object.fromEntries(results) as Record<ExpenseWorkQueue, number>;
}

export async function listExpenseFilterOptions(
  companyId: string,
): Promise<{
  technicians: { id: string; name: string }[];
  jobs: { id: string; jobNumber: string }[];
}> {
  const supabase = (await createClient()) as unknown as PagedClient;

  const [members, expenseJobs] = await Promise.all([
    supabase
      .from("company_memberships")
      .select<{ user_id: string; profiles: { full_name: string | null; email: string } | null }>(
        "user_id, profiles:profiles!company_memberships_user_id_fkey(full_name, email)",
      )
      .eq("company_id", companyId)
      .eq("status", "active"),
    supabase
      .from("expenses")
      .select<{ job_id: string | null; job: { job_number: string } | null }>(
        "job_id, job:jobs(job_number)",
      )
      .eq("company_id", companyId)
      .not("job_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(EXPENSE_JOB_OPTION_LIMIT * 5),
  ]);

  const technicians = (members.data ?? [])
    .filter((row) => row.user_id)
    .map((row) => ({
      id: row.user_id,
      name: row.profiles?.full_name?.trim() || row.profiles?.email || "Unknown",
    }));

  const seen = new Set<string>();
  const jobs = [];
  for (const row of expenseJobs.data ?? []) {
    if (!row.job_id || seen.has(row.job_id) || !row.job?.job_number) continue;
    seen.add(row.job_id);
    jobs.push({ id: row.job_id, jobNumber: row.job.job_number });
    if (jobs.length >= EXPENSE_JOB_OPTION_LIMIT) break;
  }

  return { technicians, jobs };
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export async function listLeadsPage(
  companyId: string,
  request: ListPageRequest,
): Promise<PaginatedResult<ReturnType<typeof mapLeadRowToLead>>> {
  const supabase = (await createClient()) as unknown as PagedClient;

  return fetchPagedList(supabase, companyId, {
    label: "listLeadsPage",
    table: "leads",
    select: "*",
    sortable: ["created_at"],
    defaultSort: "created_at",
    searchColumns: ["first_name", "last_name", "email", "phone", "company_name"],
    applyFilters: applyScopeAndStatus,
    map: mapLeadRowToLead,
    // leads.created_at is NOT NULL in the database; the generated row type is
    // looser than the schema. The fallback is unreachable and exists only so a
    // future schema change cannot silently produce a null cursor.
    sortValue: (row) => row.created_at ?? "",
  }, request);
}
