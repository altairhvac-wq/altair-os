import {
  formatLeadStatus,
  isLeadClosed,
  type LeadStatus,
} from "@/shared/types/lead";

const OPEN_STATUSES: LeadStatus[] = ["new", "contacted", "scheduled"];

const ACTION_ONLY_STATUSES: LeadStatus[] = ["estimate_sent", "won", "lost"];

export function validateLeadStatusTransition(
  current: LeadStatus,
  next: LeadStatus,
): string | null {
  if (current === next) {
    return null;
  }

  if (ACTION_ONLY_STATUSES.includes(next)) {
    return `Use the lead actions to set status to ${formatLeadStatus(next)}.`;
  }

  if (isLeadClosed(current) && isLeadClosed(next)) {
    return "Won and lost leads must be reopened before changing between closed statuses.";
  }

  return null;
}

export function getEditableLeadStatusOptions(current: LeadStatus): LeadStatus[] {
  if (isLeadClosed(current)) {
    return [...OPEN_STATUSES, current];
  }

  if (current === "estimate_sent") {
    return [...OPEN_STATUSES, "estimate_sent"];
  }

  return OPEN_STATUSES;
}
