import { isLeadFollowUpDue } from "@/shared/lib/leads/lead-status";
import {
  getLeadLifecycleState,
  isLeadClosed,
  type Lead,
  type LeadStatus,
} from "@/shared/types/lead";

export type LeadWorkQueue =
  | "needs-contact"
  | "qualified"
  | "estimate-ready"
  | "past";

export const LEAD_WORK_QUEUE_ORDER: readonly LeadWorkQueue[] = [
  "needs-contact",
  "qualified",
  "estimate-ready",
  "past",
];

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

export function filterLeadsForWorkQueue(
  leads: Lead[],
  queue: LeadWorkQueue,
  timeZone: string,
  reference?: Date,
): Lead[] {
  const predicate = {
    "needs-contact": (lead: Lead) =>
      isLeadNeedsContactQueue(lead, timeZone, reference),
    qualified: (lead: Lead) => isLeadQualifiedQueue(lead, timeZone, reference),
    "estimate-ready": (lead: Lead) =>
      isLeadEstimateReadyQueue(lead, timeZone, reference),
    past: isLeadPastQueue,
  }[queue];

  return leads.filter(predicate);
}

export function countLeadsForWorkQueue(
  leads: Lead[],
  queue: LeadWorkQueue,
  timeZone: string,
  reference?: Date,
): number {
  return filterLeadsForWorkQueue(leads, queue, timeZone, reference).length;
}

export function resolveInitialLeadWorkQueue(
  initialStatusFilter?: LeadStatus,
  initialFollowUpDue = false,
): LeadWorkQueue {
  if (initialFollowUpDue) {
    return "needs-contact";
  }

  if (initialStatusFilter === "won" || initialStatusFilter === "lost") {
    return "past";
  }

  if (initialStatusFilter === "new") {
    return "needs-contact";
  }

  if (initialStatusFilter === "estimate_sent") {
    return "estimate-ready";
  }

  if (
    initialStatusFilter === "contacted" ||
    initialStatusFilter === "scheduled"
  ) {
    return "qualified";
  }

  return "needs-contact";
}
