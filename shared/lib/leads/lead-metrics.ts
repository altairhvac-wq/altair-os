import { getCompanyTimeZone } from "@/shared/lib/datetime";
import {
  compareLeadsByField,
  isLeadFollowUpDue,
} from "@/shared/lib/leads/lead-status";
import {
  formatLeadSource,
  isLeadClosed,
  type Lead,
  type LeadSource,
  type LeadSourcePerformanceInput,
} from "@/shared/types/lead";
import {
  isDateWithinReportBounds,
  type ProfitabilityReportDateBounds,
} from "@/shared/types/reports";

export type LeadSourcePerformance = {
  source: LeadSource;
  total: number;
  won: number;
  lost: number;
  conversionRate: number | null;
};

export type LeadPipelineMetrics = {
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  openLeads: number;
  followUpsDue: number;
  conversionRate: number | null;
  sourcePerformance: LeadSourcePerformance[];
  topSourceInsight: string | null;
};

export const EMPTY_LEAD_PIPELINE_METRICS: LeadPipelineMetrics = {
  totalLeads: 0,
  wonLeads: 0,
  lostLeads: 0,
  openLeads: 0,
  followUpsDue: 0,
  conversionRate: null,
  sourcePerformance: [],
  topSourceInsight: null,
};

function isLeadWon(lead: Lead): boolean {
  if (lead.status === "won") {
    return true;
  }

  if (!isLeadClosed(lead.status)) {
    return false;
  }

  return lead.wonAt != null;
}

function isLeadLost(lead: Lead): boolean {
  if (lead.status === "lost") {
    return true;
  }

  if (!isLeadClosed(lead.status)) {
    return false;
  }

  return lead.lostAt != null;
}

function toCloseRate(won: number, total: number): number | null {
  if (total <= 0) {
    return null;
  }

  return Math.round((won / total) * 1000) / 10;
}

function buildTopSourceInsight(
  sourcePerformance: LeadSourcePerformance[],
): string | null {
  const activeSources = sourcePerformance.filter((entry) => entry.total > 0);

  if (activeSources.length < 2) {
    return null;
  }

  const qualified = activeSources.filter((entry) => entry.total >= 2);

  if (qualified.length === 0) {
    return null;
  }

  const ranked = [...qualified].sort((left, right) => {
    const rateLeft = left.conversionRate ?? -1;
    const rateRight = right.conversionRate ?? -1;

    if (rateRight !== rateLeft) {
      return rateRight - rateLeft;
    }

    if (right.won !== left.won) {
      return right.won - left.won;
    }

    return right.total - left.total;
  });

  const best = ranked[0];

  if (!best || best.conversionRate == null || best.won === 0) {
    return null;
  }

  const tiedAtTop = ranked.filter(
    (entry) => entry.conversionRate === best.conversionRate,
  );

  if (tiedAtTop.length !== 1) {
    return null;
  }

  return `${formatLeadSource(best.source)} leads converted best this period.`;
}

function isActiveLeadRecord(lead: Lead): boolean {
  return !lead.deletedAt && !lead.archivedAt;
}

function countFollowUpsDue(leads: Lead[], timeZone: string): number {
  return selectLeadsNeedingFollowUp(leads, { timeZone }).length;
}

export function selectLeadsNeedingFollowUp(
  leads: Lead[],
  options?: { limit?: number; reference?: Date; timeZone?: string },
): Lead[] {
  const reference = options?.reference ?? new Date();
  const timeZone = options?.timeZone ?? getCompanyTimeZone();
  const limit = options?.limit ?? leads.length;

  return leads
    .filter(
      (lead) =>
        isActiveLeadRecord(lead) &&
        isLeadFollowUpDue(lead, reference, timeZone),
    )
    .sort((left, right) => compareLeadsByField(left, right, "nextFollowUpAt"))
    .slice(0, limit);
}

export function buildLeadPipelineMetrics(
  leads: Lead[],
  dateBounds?: ProfitabilityReportDateBounds,
  timeZone: string = getCompanyTimeZone(),
): LeadPipelineMetrics {
  const followUpsDue = countFollowUpsDue(leads, timeZone);

  const activeLeads = leads.filter((lead) => {
    if (!isActiveLeadRecord(lead)) {
      return false;
    }

    if (dateBounds && !isDateWithinReportBounds(lead.createdAt, dateBounds)) {
      return false;
    }

    return true;
  });

  const wonLeads = activeLeads.filter(isLeadWon).length;
  const lostLeads = activeLeads.filter(
    (lead) => isLeadLost(lead) && !isLeadWon(lead),
  ).length;
  const closedLeads = wonLeads + lostLeads;
  const sourceMap = new Map<LeadSource, LeadSourcePerformance>();

  for (const lead of activeLeads) {
    const current = sourceMap.get(lead.source) ?? {
      source: lead.source,
      total: 0,
      won: 0,
      lost: 0,
      conversionRate: null,
    };

    current.total += 1;

    if (isLeadWon(lead)) {
      current.won += 1;
    }

    if (isLeadLost(lead)) {
      current.lost += 1;
    }

    sourceMap.set(lead.source, current);
  }

  const sourcePerformance = [...sourceMap.values()]
    .map((entry) => ({
      ...entry,
      conversionRate: toCloseRate(entry.won, entry.total),
    }))
    .filter((entry) => entry.total > 0)
    .sort((left, right) => {
      if (right.won !== left.won) {
        return right.won - left.won;
      }

      if (right.total !== left.total) {
        return right.total - left.total;
      }

      // Sources genuinely tie — same wins, same volume — and without a final
      // key the order is whatever the input order happened to be. That made
      // the strip reorder itself between renders, and made the array path and
      // the SQL path disagree about a list they had both computed correctly.
      return left.source.localeCompare(right.source);
    });

  return {
    totalLeads: activeLeads.length,
    wonLeads,
    lostLeads,
    openLeads: activeLeads.length - closedLeads,
    followUpsDue,
    conversionRate: toCloseRate(wonLeads, activeLeads.length),
    sourcePerformance,
    topSourceInsight: buildTopSourceInsight(sourcePerformance),
  };
}

/**
 * The same metrics, assembled from database counts instead of an array.
 *
 * ============================== WHY THIS EXISTS ==============================
 * buildLeadPipelineMetrics above reduces over every lead. That was only ever
 * possible because the page loaded every lead, and it was only ever CORRECT
 * while a tenant had fewer than PostgREST's 1,000-row ceiling. Past that the
 * conversion rate described the newest thousand leads and said "pipeline".
 *
 * So the counting moved to SQL (migration 160) and this function does the rest.
 * Everything below the counts — the rate, the open figure, the ordering, the
 * insight — is computed by the SAME code paths as before, from the same
 * helpers, so there is exactly one definition of what a conversion rate is and
 * one definition of which source is "best". Only the summation changed venue.
 *
 * The array version stays: reports still call it over a bounded, date-filtered
 * set where loading the rows is the point.
 */
export function buildLeadPipelineMetricsFromAggregates(input: {
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  followUpsDue: number;
  sources: LeadSourcePerformanceInput[];
}): LeadPipelineMetrics {
  const sourcePerformance = input.sources
    .map((entry) => ({
      source: entry.source,
      total: entry.total,
      won: entry.won,
      lost: entry.lost,
      conversionRate: toCloseRate(entry.won, entry.total),
    }))
    .filter((entry) => entry.total > 0)
    .sort((left, right) => {
      if (right.won !== left.won) {
        return right.won - left.won;
      }

      if (right.total !== left.total) {
        return right.total - left.total;
      }

      // Sources genuinely tie — same wins, same volume — and without a final
      // key the order is whatever the input order happened to be. That made
      // the strip reorder itself between renders, and made the array path and
      // the SQL path disagree about a list they had both computed correctly.
      return left.source.localeCompare(right.source);
    });

  const closedLeads = input.wonLeads + input.lostLeads;

  return {
    totalLeads: input.totalLeads,
    wonLeads: input.wonLeads,
    lostLeads: input.lostLeads,
    openLeads: input.totalLeads - closedLeads,
    followUpsDue: input.followUpsDue,
    conversionRate: toCloseRate(input.wonLeads, input.totalLeads),
    sourcePerformance,
    topSourceInsight: buildTopSourceInsight(sourcePerformance),
  };
}
