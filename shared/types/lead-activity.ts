import type { LeadStatus } from "@/shared/types/lead";

export type LeadActivityType =
  | "lead_created"
  | "call_logged"
  | "email_logged"
  | "note_added"
  | "status_changed"
  | "follow_up_changed"
  | "estimate_created"
  | "converted"
  | "won"
  | "lost";
import { formatLeadStatus } from "@/shared/types/lead";

export type LeadActivityMetadata = {
  previousStatus?: LeadStatus;
  nextStatus?: LeadStatus;
  previousFollowUpAt?: string;
  nextFollowUpAt?: string;
  lostReason?: string;
  customerId?: string;
  customerName?: string;
  estimateId?: string;
  estimateNumber?: string;
  actorName?: string;
};

export type LeadActivity = {
  id: string;
  leadId: string;
  activityType: LeadActivityType;
  note?: string;
  metadata: LeadActivityMetadata;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
};

export function formatLeadActivityLabel(activity: LeadActivity): string {
  switch (activity.activityType) {
    case "lead_created":
      return "Lead created";
    case "call_logged":
      return "Call logged";
    case "email_logged":
      return "Email logged";
    case "note_added":
      return "Note added";
    case "status_changed":
      if (activity.metadata.previousStatus && activity.metadata.nextStatus) {
        return `Status changed to ${formatLeadStatus(activity.metadata.nextStatus)}`;
      }
      return "Status changed";
    case "follow_up_changed":
      return "Follow-up date changed";
    case "estimate_created":
      return "Estimate created";
    case "converted":
      return "Converted to customer";
    case "won":
      return "Marked won";
    case "lost":
      return "Marked lost";
    default:
      return "Activity";
  }
}

export function formatLeadActivityDetails(activity: LeadActivity): string | undefined {
  if (activity.note?.trim()) {
    return activity.note.trim();
  }

  switch (activity.activityType) {
    case "converted":
      return activity.metadata.customerName
        ? `Customer: ${activity.metadata.customerName}`
        : undefined;
    case "estimate_created":
      return activity.metadata.estimateNumber
        ? `Estimate ${activity.metadata.estimateNumber}`
        : undefined;
    case "lost":
      return activity.metadata.lostReason
        ? `Reason: ${activity.metadata.lostReason}`
        : undefined;
    case "follow_up_changed":
      return activity.metadata.nextFollowUpAt
        ? `Next follow-up: ${activity.metadata.nextFollowUpAt.slice(0, 10)}`
        : "Follow-up cleared";
    default:
      return undefined;
  }
}
