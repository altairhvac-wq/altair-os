import type { Lead, LeadSource } from "@/shared/types/lead";

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
  conversionRate: number | null;
  sourcePerformance: LeadSourcePerformance[];
};

export function buildLeadPipelineMetrics(leads: Lead[]): LeadPipelineMetrics {
  const activeLeads = leads.filter((lead) => !lead.deletedAt);
  const wonLeads = activeLeads.filter((lead) => lead.status === "won").length;
  const lostLeads = activeLeads.filter((lead) => lead.status === "lost").length;
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

    if (lead.status === "won") {
      current.won += 1;
    }

    if (lead.status === "lost") {
      current.lost += 1;
    }

    sourceMap.set(lead.source, current);
  }

  const sourcePerformance = [...sourceMap.values()]
    .map((entry) => {
      const closed = entry.won + entry.lost;
      return {
        ...entry,
        conversionRate:
          closed > 0 ? Math.round((entry.won / closed) * 1000) / 10 : null,
      };
    })
    .sort((left, right) => right.total - left.total);

  return {
    totalLeads: activeLeads.length,
    wonLeads,
    lostLeads,
    openLeads: activeLeads.length - closedLeads,
    conversionRate:
      closedLeads > 0
        ? Math.round((wonLeads / closedLeads) * 1000) / 10
        : null,
    sourcePerformance,
  };
}
