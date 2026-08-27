import "server-only";

import { createClient } from "@/lib/supabase/server";
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
import { mapJobRowToJob } from "@/lib/database/queries/jobs";
import { mapExpenseRow } from "@/lib/database/queries/expenses";
import { mapLeadRowToLead } from "@/lib/database/queries/leads";

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

export type JobsPageRequest = ListPageRequest & {
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
    searchColumns: ["job_number", "service_address", "city", "job_type", "description"],
    applyFilters: (query, req) => {
      let scoped = applyScopeAndStatus(query, req);
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

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

const EXPENSE_SELECT_LIST = `
  *,
  technician:profiles!expenses_technician_id_fkey(full_name, email),
  job:jobs(job_number, customer_id)
`;

export type ExpensesPageRequest = ListPageRequest & {
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
      const scoped = applyScopeAndStatus(query, req);
      return req.technicianId ? scoped.eq("technician_id", req.technicianId) : scoped;
    },
    map: mapExpenseRow,
    sortValue: (row, column) =>
      column === "amount" ? Number(row.amount) : row.created_at,
  }, request);
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
