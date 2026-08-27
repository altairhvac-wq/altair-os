/**
 * The Leads list search predicate, lifted out of LeadsPageView.
 *
 * It used to be a module-local function inside a "use client" component, which
 * meant the only way to search the whole tenant server-side was to write a
 * second copy of it. There is now one copy: the client still calls it, the
 * server calls it to re-check database candidates, and the differential test
 * imports this exact function rather than a paraphrase of it.
 *
 * The haystack is deliberately unchanged, including the parts that are not
 * columns — see lib/database/queries/leads-page.ts for what the database can
 * pre-filter on and the one field it cannot.
 */

import {
  formatLeadName,
  formatLeadSource,
  formatLeadStatus,
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_OPTIONS,
  type Lead,
  type LeadSource,
  type LeadStatus,
} from "@/shared/types/lead";

export function buildLeadSearchHaystack(lead: Lead): string {
  return [
    formatLeadName(lead),
    lead.phone,
    lead.email,
    formatLeadSource(lead.source),
    formatLeadStatus(lead.status),
    lead.assignedUserName,
    lead.lastActivityLabel,
  ]
    .join(" ")
    .toLowerCase();
}

export function matchesLeadSearch(lead: Lead, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }

  return buildLeadSearchHaystack(lead).includes(query);
}

export function filterLeadsBySearch(
  leads: Lead[],
  search: string,
  statusFilter: LeadStatus | "all",
): Lead[] {
  return leads.filter(
    (lead) =>
      (statusFilter === "all" || lead.status === statusFilter) &&
      matchesLeadSearch(lead, search),
  );
}

/**
 * Statuses and sources whose *labels* contain the query.
 *
 * Searching "estimate sent" has always matched leads by their rendered status,
 * and the status column stores `estimate_sent`, so an ilike over columns alone
 * would quietly lose that. Both option lists are small and fixed, so the labels
 * can be resolved to enum values exactly, in memory, and handed to the database
 * as an `in` filter. No label matching is duplicated in SQL.
 */
export function resolveLeadStatusesMatchingLabel(search: string): LeadStatus[] {
  const query = search.trim().toLowerCase();
  if (!query) return [];
  return LEAD_STATUS_OPTIONS.filter(
    (option): option is { value: LeadStatus; label: string } =>
      option.value !== "all" && option.label.toLowerCase().includes(query),
  ).map((option) => option.value);
}

export function resolveLeadSourcesMatchingLabel(search: string): LeadSource[] {
  const query = search.trim().toLowerCase();
  if (!query) return [];
  return LEAD_SOURCE_OPTIONS.filter((option) =>
    option.label.toLowerCase().includes(query),
  ).map((option) => option.value);
}
