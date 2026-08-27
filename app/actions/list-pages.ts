"use server";

import {
  canViewAllJobs,
  canViewBilling,
  canViewCompanyExpenses,
  getCompanyAccessScope,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listCustomersPage } from "@/lib/database/queries/customers-page";
import {
  listLeadsPage,
  type LeadsPageRequest,
} from "@/lib/database/queries/leads-page";
import {
  listEstimatesPage,
  listExpensesPage,
  listInvoicesPage,
  listJobsPage,
  searchJobCandidates,
  type EstimatesPageRequest,
  type ExpensesPageRequest,
  type InvoicesPageRequest,
  type ListPageRequest,
} from "@/lib/database/queries/list-pages";
import type { JobPageFilterRequest } from "@/lib/database/queries/job-page-filters";
import type { PaginatedResult } from "@/lib/database/queries/pagination";
import type { CustomerWorkQueue } from "@/shared/components/customers/customer-work-queues";
import type { Customer } from "@/shared/types/customer";
import type { Estimate } from "@/shared/types/estimate";
import type { Expense } from "@/shared/types/expense";
import type { Invoice } from "@/shared/types/invoice";
import type { Job } from "@/shared/types/job";
import type { Lead } from "@/shared/types/lead";
import { getLeadFollowUpDueCutoff } from "@/shared/lib/leads/lead-status";

/**
 * "Load the next page" for each paged list surface.
 *
 * ============================== WHY ACTIONS AND NOT URL CURSORS ==============================
 * Search, the queue tab and sort all belong in the URL: they are the state of
 * the page, they should survive a refresh, and they should be linkable. A
 * cursor is different. It is a position inside one scroll of one list, it
 * accumulates rather than replaces, and putting it in the URL produces links
 * that mean nothing to whoever receives them.
 *
 * ============================== EVERY ONE OF THESE IS A SECURITY BOUNDARY ==============================
 * A server action is reachable by anyone who can reach the application, so
 * hiding a list in the UI authorizes nothing. Each of these resolves the active
 * company itself, checks the permission its surface requires, and scopes the
 * query to that company — none of that is inherited from the page that rendered
 * the first page of results.
 *
 * The two narrowing cases matter most: a technician who cannot view all jobs is
 * pinned to their own assignments, and a field user who cannot view company
 * expenses is pinned to their own, both here rather than in the caller. RLS is
 * still the final boundary underneath.
 */

type PageResult<T> = { error?: string; page?: PaginatedResult<T> };

export type CustomersPageParams = {
  queue: CustomerWorkQueue;
  pastLifecycle?: "archived" | "deleted" | null;
  cursor?: string | null;
  search?: string | null;
  sortColumn?: string | null;
  sortDirection?: "asc" | "desc" | null;
};

export async function loadCustomersPageAction(
  params: CustomersPageParams,
): Promise<PageResult<Customer>> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: "No active company workspace." };

  if (!getCompanyAccessScope(context).canManageCustomers) {
    return { error: "You do not have permission to view customers." };
  }

  return { page: await listCustomersPage(context.company.id, params) };
}

export async function loadInvoicesPageAction(
  params: InvoicesPageRequest,
): Promise<PageResult<Invoice>> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: "No active company workspace." };

  if (!canViewBilling(context)) {
    return { error: "You do not have permission to view invoices." };
  }

  return { page: await listInvoicesPage(context.company.id, params) };
}

export async function loadEstimatesPageAction(
  params: EstimatesPageRequest,
): Promise<PageResult<Estimate>> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: "No active company workspace." };

  if (!canViewBilling(context)) {
    return { error: "You do not have permission to view estimates." };
  }

  return { page: await listEstimatesPage(context.company.id, params) };
}

export async function loadJobsPageAction(
  params: ListPageRequest & JobPageFilterRequest,
): Promise<PageResult<Job>> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: "No active company workspace." };

  const scope = getCompanyAccessScope(context);
  if (!scope.canViewAssignedJobs && !canViewAllJobs(context)) {
    return { error: "You do not have permission to view jobs." };
  }

  // A technician sees their own assignments only. Decided here, not by the
  // caller: the caller is a browser.
  const assignedTechnicianId = canViewAllJobs(context) ? null : context.user.id;

  return {
    page: await listJobsPage(context.company.id, { ...params, assignedTechnicianId }),
  };
}

/**
 * Candidates for a RANKED job search, drawn from the whole tenant.
 *
 * The ranking itself stays in the browser — see searchJobCandidates for why
 * splitting it that way preserves the existing behaviour rather than
 * approximating it. This action's job is only to make sure the rows being ranked
 * are the tenant's rows and not the most recent thousand.
 */
export async function searchJobsAction(
  params: ListPageRequest & JobPageFilterRequest,
): Promise<{ error?: string; jobs?: Job[]; truncated?: boolean }> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: "No active company workspace." };

  const scope = getCompanyAccessScope(context);
  if (!scope.canViewAssignedJobs && !canViewAllJobs(context)) {
    return { error: "You do not have permission to view jobs." };
  }

  const assignedTechnicianId = canViewAllJobs(context) ? null : context.user.id;
  const result = await searchJobCandidates(context.company.id, {
    ...params,
    assignedTechnicianId,
  });

  return { jobs: result.rows, truncated: result.truncated };
}

export async function loadExpensesPageAction(
  params: Omit<ExpensesPageRequest, "technicianId">,
): Promise<PageResult<Expense>> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: "No active company workspace." };

  // Same shape as jobs: everyone may see their own, only some may see all.
  const technicianId = canViewCompanyExpenses(context) ? null : context.user.id;

  return {
    page: await listExpensesPage(context.company.id, { ...params, technicianId }),
  };
}

export async function loadLeadsPageAction(
  params: Omit<LeadsPageRequest, "followUpCutoff">,
): Promise<PageResult<Lead>> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: "No active company workspace." };

  if (!getCompanyAccessScope(context).canManageCustomers) {
    return { error: "You do not have permission to view leads." };
  }

  // The follow-up cutoff is derived here, from the company's own time zone, and
  // never accepted from the caller. A client-supplied cutoff would let anyone
  // reachable by this action redefine which leads count as overdue.
  return {
    page: await listLeadsPage(context.company.id, {
      ...params,
      followUpCutoff: getLeadFollowUpDueCutoff(
        new Date(),
        context.company.timezone,
      ),
    }),
  };
}
