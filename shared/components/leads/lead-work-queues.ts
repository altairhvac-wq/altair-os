import { isLeadFollowUpDue } from "@/shared/lib/leads/lead-status";
import {
  getLeadLifecycleState,
  isLeadClosed,
  type Lead,
  type LeadStatus,
} from "@/shared/types/lead";

/**
 * Header filter pills for the Leads list.
 * Mix of status filters (new / contacted / converted) and operational
 * work queues (qualified / estimate-ready / needs-contact / past).
 */
export type LeadListFilter =
  | "new"
  | "contacted"
  | "qualified"
  | "estimate-ready"
  | "needs-contact"
  | "converted"
  | "past";

/** @deprecated Prefer LeadListFilter — kept for dashboard deep-link typing. */
export type LeadWorkQueue =
  | "needs-contact"
  | "qualified"
  | "estimate-ready"
  | "past";

export const LEAD_LIST_FILTER_ORDER: readonly LeadListFilter[] = [
  "new",
  "contacted",
  "qualified",
  "estimate-ready",
  "needs-contact",
  "converted",
  "past",
];

/** Legacy tab order (pre–header-pill redesign). */
export const LEAD_WORK_QUEUE_ORDER: readonly LeadWorkQueue[] = [
  "needs-contact",
  "qualified",
  "estimate-ready",
  "past",
];

export const LEAD_LIST_FILTER_LABELS: Record<LeadListFilter, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  "estimate-ready": "Estimate ready",
  "needs-contact": "Needs contact",
  converted: "Converted",
  past: "Past",
};

export const LEAD_WORK_QUEUE_LABELS: Record<LeadWorkQueue, string> = {
  "needs-contact": "Needs contact",
  qualified: "Qualified",
  "estimate-ready": "Estimate ready",
  past: "Past",
};

function isActiveLeadRecord(lead: Lead): boolean {
  return getLeadLifecycleState(lead) === "active";
}

/** Won, lost, archived, deleted, and other closed lead records. */
export function isLeadPastQueue(lead: Lead): boolean {
  if (!isActiveLeadRecord(lead)) {
    return true;
  }

  return isLeadClosed(lead.status);
}

/** Status filter: brand-new leads. */
export function isLeadNewFilter(lead: Lead): boolean {
  return lead.status === "new";
}

/** Status filter: contacted (may also sit in needs-contact when follow-up is due). */
export function isLeadContactedFilter(lead: Lead): boolean {
  return lead.status === "contacted";
}

/**
 * Converted = won. Do not use convertedCustomerId alone — prepare-estimate
 * can link a customer while the lead stays open in the pipeline.
 */
export function isLeadConvertedFilter(lead: Lead): boolean {
  return lead.status === "won";
}

/** New or early-stage leads, plus active leads with follow-up due or overdue. */
export function isLeadNeedsContactQueue(
  lead: Lead,
  timeZone: string,
  reference?: Date,
): boolean {
  if (isLeadPastQueue(lead)) {
    return false;
  }

  if (lead.status === "new") {
    return true;
  }

  return isLeadFollowUpDue(lead, reference, timeZone);
}

/** Contacted or scheduled leads that are active but not yet at estimate stage. */
export function isLeadQualifiedQueue(
  lead: Lead,
  timeZone: string,
  reference?: Date,
): boolean {
  if (isLeadPastQueue(lead)) {
    return false;
  }

  if (isLeadNeedsContactQueue(lead, timeZone, reference)) {
    return false;
  }

  return lead.status === "contacted" || lead.status === "scheduled";
}

/** Leads with an estimate sent or awaiting customer decision. */
export function isLeadEstimateReadyQueue(
  lead: Lead,
  timeZone: string,
  reference?: Date,
): boolean {
  if (isLeadPastQueue(lead)) {
    return false;
  }

  if (isLeadNeedsContactQueue(lead, timeZone, reference)) {
    return false;
  }

  return lead.status === "estimate_sent";
}

export function matchesLeadListFilter(
  lead: Lead,
  filter: LeadListFilter,
  timeZone: string,
  reference?: Date,
): boolean {
  switch (filter) {
    case "new":
      return isLeadNewFilter(lead);
    case "contacted":
      return isLeadContactedFilter(lead);
    case "qualified":
      return isLeadQualifiedQueue(lead, timeZone, reference);
    case "estimate-ready":
      return isLeadEstimateReadyQueue(lead, timeZone, reference);
    case "needs-contact":
      return isLeadNeedsContactQueue(lead, timeZone, reference);
    case "converted":
      return isLeadConvertedFilter(lead);
    case "past":
      return isLeadPastQueue(lead);
  }
}

export function filterLeadsForListFilter(
  leads: Lead[],
  filter: LeadListFilter,
  timeZone: string,
  reference?: Date,
): Lead[] {
  return leads.filter((lead) =>
    matchesLeadListFilter(lead, filter, timeZone, reference),
  );
}

export function countLeadsForListFilter(
  leads: Lead[],
  filter: LeadListFilter,
  timeZone: string,
  reference?: Date,
): number {
  return filterLeadsForListFilter(leads, filter, timeZone, reference).length;
}

/** @deprecated Use filterLeadsForListFilter. */
export function filterLeadsForWorkQueue(
  leads: Lead[],
  queue: LeadWorkQueue,
  timeZone: string,
  reference?: Date,
): Lead[] {
  return filterLeadsForListFilter(leads, queue, timeZone, reference);
}

/** @deprecated Use countLeadsForListFilter. */
export function countLeadsForWorkQueue(
  leads: Lead[],
  queue: LeadWorkQueue,
  timeZone: string,
  reference?: Date,
): number {
  return countLeadsForListFilter(leads, queue, timeZone, reference);
}

const LEAD_LIST_FILTER_SET = new Set<LeadListFilter>(LEAD_LIST_FILTER_ORDER);
const LEAD_WORK_QUEUE_SET = new Set<LeadWorkQueue>(LEAD_WORK_QUEUE_ORDER);

export function isLeadListFilter(value: string): value is LeadListFilter {
  return LEAD_LIST_FILTER_SET.has(value as LeadListFilter);
}

export function isLeadWorkQueue(value: string): value is LeadWorkQueue {
  return LEAD_WORK_QUEUE_SET.has(value as LeadWorkQueue);
}

export function resolveInitialLeadListFilter(
  initialStatusFilter?: LeadStatus,
  initialFollowUpDue = false,
  initialQueue?: LeadListFilter,
): LeadListFilter {
  if (initialQueue && isLeadListFilter(initialQueue)) {
    return initialQueue;
  }

  if (initialFollowUpDue) {
    return "needs-contact";
  }

  if (initialStatusFilter === "won") {
    return "converted";
  }

  if (initialStatusFilter === "lost") {
    return "past";
  }

  if (initialStatusFilter === "new") {
    return "new";
  }

  if (initialStatusFilter === "estimate_sent") {
    return "estimate-ready";
  }

  if (initialStatusFilter === "contacted") {
    return "contacted";
  }

  if (initialStatusFilter === "scheduled") {
    return "qualified";
  }

  return "needs-contact";
}

/** @deprecated Use resolveInitialLeadListFilter. */
export function resolveInitialLeadWorkQueue(
  initialStatusFilter?: LeadStatus,
  initialFollowUpDue = false,
  initialQueue?: LeadWorkQueue,
): LeadWorkQueue {
  const resolved = resolveInitialLeadListFilter(
    initialStatusFilter,
    initialFollowUpDue,
    initialQueue,
  );

  if (isLeadWorkQueue(resolved)) {
    return resolved;
  }

  return "needs-contact";
}
