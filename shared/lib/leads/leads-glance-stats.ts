import {
  countLeadsForListFilter,
  LEAD_LIST_FILTER_LABELS,
  LEAD_LIST_FILTER_ORDER,
  type LeadListFilter,
} from "@/shared/components/leads/lead-work-queues";
import type { Lead } from "@/shared/types/lead";

export type LeadsGlanceStat = {
  id: string;
  label: string;
  value: string;
  detail: string;
  /** When set, clicking the stat activates this list filter. */
  filterQueue?: LeadListFilter;
};

const FILTER_DETAILS: Record<LeadListFilter, string> = {
  new: "Status is new",
  contacted: "Status is contacted",
  qualified: "Active contacted or scheduled, excluding needs-contact",
  "estimate-ready": "Estimate sent, not waiting on overdue follow-up",
  "needs-contact": "New, or follow-up due / overdue",
  converted: "Won leads",
  past: "Won, lost, archived, or deleted",
};

/**
 * Builds compact glance stats for the Leads list header.
 * Filter counts use the same predicates as the list pills / work queues.
 */
export function buildLeadsGlanceStats(input: {
  leads: ReadonlyArray<Lead>;
  timeZone: string;
  reference?: Date;
}): LeadsGlanceStat[] {
  const { leads, timeZone } = input;
  const reference = input.reference ?? new Date();

  return LEAD_LIST_FILTER_ORDER.map((filter) => {
    const count = countLeadsForListFilter(
      [...leads],
      filter,
      timeZone,
      reference,
    );
    const label = LEAD_LIST_FILTER_LABELS[filter];

    return {
      id: filter,
      label,
      value: String(count),
      detail:
        count === 0
          ? `No ${label.toLowerCase()} leads`
          : FILTER_DETAILS[filter],
      filterQueue: filter,
    };
  });
}

/**
 * The same strip, from database counts.
 *
 * countLeadsForListFilter above counts an array. That array was capped at
 * PostgREST's 1,000 rows, so on a large tenant every pill was a lower bound
 * wearing a total's clothes — and the pill a user clicks to find work is
 * exactly where an undercount hides the work.
 *
 * The labels, the order and the detail text are shared with the array version;
 * only the counting moved. See lib/database/queries/leads-page.ts.
 */
export function buildLeadsGlanceStatsFromCounts(
  counts: Record<LeadListFilter, number>,
): LeadsGlanceStat[] {
  return LEAD_LIST_FILTER_ORDER.map((filter) => {
    const count = counts[filter] ?? 0;
    const label = LEAD_LIST_FILTER_LABELS[filter];

    return {
      id: filter,
      label,
      value: String(count),
      detail:
        count === 0 ? `No ${label.toLowerCase()} leads` : FILTER_DETAILS[filter],
      filterQueue: filter,
    };
  });
}
