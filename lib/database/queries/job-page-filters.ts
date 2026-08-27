import { escapeFilterValue } from "@/lib/database/queries/pagination";
import type { FilterableQuery } from "@/lib/database/queries/paged-list";
import type { JobPriority, JobStatus } from "@/shared/types/job";

/**
 * The jobs list filters, expressed as database filters.
 *
 * ============================== WHY A SEPARATE, PURE MODULE ==============================
 * Same reason as the customer queues: re-expressing a rule in SQL creates two
 * implementations of it, and nothing compares them unless something is built to.
 * This module imports nothing from the Supabase server client, so
 * scripts/verify-job-filters-live.mjs can import BOTH this and the original
 * predicate in shared/lib/jobs-page-filters.ts and run them over the same rows.
 *
 * ============================== THE TRANSLATION ==============================
 * From filterJobsByPageFilters:
 *
 *   status "all"          -> no filter
 *   status X              -> status = X
 *   priority "all"        -> no filter
 *   priority X            -> priority = X
 *   unassignedOnly        -> assigned_technician_id is null
 *
 * With one special case worth spelling out, because it is easy to translate as
 * plain equality and be subtly wrong: when the caller arrives from the dispatch
 * board's "In Progress" card, that card counts a job as in progress if the
 * technician has ARRIVED or is actively working. So the status filter widens to
 * two values rather than one. Getting this wrong would silently drop every
 * arrived-but-not-started job from a view whose whole purpose is to show them.
 */

/** Mirrors IN_PROGRESS_DISPATCH_STATUSES in shared/lib/jobs-page-filters.ts. */
export const IN_PROGRESS_DISPATCH_STATUSES: readonly JobStatus[] = [
  "arrived",
  "in_progress",
];

export type JobPageFilterRequest = {
  statusFilter?: JobStatus | "all" | null;
  priorityFilter?: JobPriority | "all" | null;
  unassignedOnly?: boolean;
  /** Set when the caller came from the dispatch board's In Progress card. */
  matchDispatchInProgressCard?: boolean;
};

export function applyJobPageFilters<Q extends FilterableQuery<Q>>(
  query: Q,
  request: JobPageFilterRequest,
): Q {
  let scoped = query;

  const status = request.statusFilter;
  if (status && status !== "all") {
    if (status === "in_progress" && request.matchDispatchInProgressCard) {
      scoped = scoped.in("status", IN_PROGRESS_DISPATCH_STATUSES);
    } else {
      scoped = scoped.eq("status", status);
    }
  }

  const priority = request.priorityFilter;
  if (priority && priority !== "all") {
    scoped = scoped.eq("priority", priority);
  }

  if (request.unassignedOnly) {
    scoped = scoped.is("assigned_technician_id", null);
  }

  return scoped;
}

/**
 * Search columns for jobs. `customer_id.in.(…)` is added separately by the
 * caller, because a customer-name match cannot be ORed with parent-table filters
 * in PostgREST and has to be resolved to ids first.
 */
export const JOB_SEARCH_COLUMNS = [
  "job_number",
  "service_address",
  "city",
  "job_type",
  "description",
] as const;

/** Exported for the differential test, so both sides search the same fields. */
export function buildJobSearchTerm(term: string): string {
  return escapeFilterValue(`%${term}%`);
}
