/**
 * The Leads list pills, expressed as database filters.
 *
 * ============================== WHY THIS FILE EXISTS ==============================
 * The pills used to be JavaScript predicates run over whatever leads had already
 * been shipped to the browser, and listLeads has no .limit(). PostgREST caps an
 * unfiltered response at 1,000 rows and reports the truncation in a header
 * nothing reads, so on a tenant with more leads than that the pipeline pills,
 * the glance strip and the pipeline metrics were all computed over the newest
 * 1,000 leads and presented as the whole book.
 *
 * ============================== THE MAPPING, WRITTEN OUT ==============================
 * Source of truth: shared/components/leads/lead-work-queues.ts
 *
 *   past           lifecycle is archived/deleted, OR status in (won, lost)
 *   new            status = 'new'
 *   contacted      status = 'contacted'
 *   converted      status = 'won'
 *   needs-contact  NOT past AND (status = 'new' OR follow-up due)
 *   qualified      NOT past AND NOT needs-contact AND status in (contacted, scheduled)
 *   estimate-ready NOT past AND NOT needs-contact AND status = 'estimate_sent'
 *
 * Note what the status pills do NOT check: `new`, `contacted` and `converted`
 * test status alone. That is not an oversight to be corrected here — the array
 * they run over is already lifecycle-scoped by listLeads, so adding a lifecycle
 * term would be a behaviour change dressed up as a translation. The caller
 * applies the same lifecycle scope it always did, and these builders reproduce
 * the predicate as written.
 *
 * ============================== THE TIME ZONE ==============================
 * "Follow-up due" is the only part that depends on the company's time zone:
 *
 *   isLeadFollowUpDue = status not closed
 *                       AND nextFollowUpAt is set
 *                       AND date(nextFollowUpAt in tz) <= date(now in tz)
 *
 * A date-in-zone comparison is the same thing as an instant comparison against
 * the last instant of today in that zone, which is exactly what
 * getLeadFollowUpDueCutoff already computes (getDayBoundsInTimeZone(...).end).
 * So the cutoff is computed once, in TypeScript, by the shipped helper, and
 * handed to SQL as an instant. The zone rule is never re-implemented here —
 * there is no second copy of it to drift.
 *
 * listLeadsNeedingFollowUp has compared `next_follow_up_at <= cutoff` in SQL
 * since long before this file; this is the same comparison, and
 * verify-lead-filters-live asserts it against the real predicate rather than
 * trusting the resemblance.
 */

import type { LeadListFilter } from "@/shared/components/leads/lead-work-queues";

/** The slice of a PostgREST builder these filters need. Structural, so both the
 *  cookie client and the service-role client satisfy it without an `any`. */
export type FilterableQuery<Q> = {
  eq: (column: string, value: string) => Q;
  in: (column: string, values: readonly string[]) => Q;
  is: (column: string, value: null) => Q;
  or: (filter: string) => Q;
  not: (column: string, operator: string, value: string) => Q;
};

export type LeadFilterRequest = {
  filter?: LeadListFilter | null;
  /** ISO instant: the last moment of "today" in the company's time zone. */
  followUpCutoff: string;
};

const CLOSED_STATUSES = ["won", "lost"] as const;

/** `isLeadFollowUpDue`, as an OR-group that can be ANDed into a query. */
function followUpDueClause(cutoff: string): string {
  return `and(status.not.in.("won","lost"),next_follow_up_at.not.is.null,next_follow_up_at.lte.${cutoff})`;
}

/** The negation. Written as its own string rather than derived, because
 *  PostgREST has no NOT over an and() group that also survives an .or(). */
function followUpNotDueClause(cutoff: string): string {
  return `next_follow_up_at.is.null,next_follow_up_at.gt.${cutoff}`;
}

export function applyLeadListFilter<Q extends FilterableQuery<Q>>(
  query: Q,
  request: LeadFilterRequest,
): Q {
  const filter = request.filter;
  if (!filter) {
    return query;
  }

  const cutoff = request.followUpCutoff;

  switch (filter) {
    case "new":
      return query.eq("status", "new");

    case "contacted":
      return query.eq("status", "contacted");

    case "converted":
      return query.eq("status", "won");

    case "past":
      // isLeadPastQueue: not lifecycle-active, OR closed. The caller's own
      // lifecycle scope may already exclude the first two disjuncts; leaving
      // them in keeps this a faithful translation either way.
      return query.or(
        `deleted_at.not.is.null,archived_at.not.is.null,status.in.("won","lost")`,
      );

    case "needs-contact":
      // NOT past, then (new OR follow-up due).
      return query
        .is("deleted_at", null)
        .is("archived_at", null)
        .not("status", "in", '("won","lost")')
        .or(`status.eq.new,${followUpDueClause(cutoff)}`);

    case "qualified":
      // NOT past, NOT needs-contact, status in (contacted, scheduled).
      // status is neither closed nor 'new' here, so "NOT needs-contact"
      // reduces to "follow-up not due" — but it is still written as the
      // negation of the same clause, not as a shortcut.
      return query
        .is("deleted_at", null)
        .is("archived_at", null)
        .in("status", ["contacted", "scheduled"])
        .or(followUpNotDueClause(cutoff));

    case "estimate-ready":
      return query
        .is("deleted_at", null)
        .is("archived_at", null)
        .eq("status", "estimate_sent")
        .or(followUpNotDueClause(cutoff));
  }
}

export { CLOSED_STATUSES };
