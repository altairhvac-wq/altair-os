import { recordLeadActivity } from "@/lib/database/queries/lead-activities";
import type { LeadActivityType } from "@/lib/database/types/enums";
import type { LeadStatus } from "@/shared/types/lead";
import type { LeadActivityMetadata } from "@/shared/types/lead-activity";

type RecordLeadActivityInput = {
  companyId: string;
  leadId: string;
  actorId: string;
  activityType: LeadActivityType;
  note?: string;
  metadata?: LeadActivityMetadata;
};

async function record(input: RecordLeadActivityInput) {
  return recordLeadActivity({
    company_id: input.companyId,
    lead_id: input.leadId,
    created_by: input.actorId,
    activity_type: input.activityType,
    note: input.note ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function recordLeadCreatedActivity(input: {
  companyId: string;
  leadId: string;
  actorId: string;
  leadName: string;
}) {
  return record({
    companyId: input.companyId,
    leadId: input.leadId,
    actorId: input.actorId,
    activityType: "lead_created",
    metadata: { actorName: input.leadName },
  });
}

export async function recordLeadCallLoggedActivity(input: {
  companyId: string;
  leadId: string;
  actorId: string;
  note?: string;
}) {
  return record({
    companyId: input.companyId,
    leadId: input.leadId,
    actorId: input.actorId,
    activityType: "call_logged",
    note: input.note,
  });
}

export async function recordLeadEmailLoggedActivity(input: {
  companyId: string;
  leadId: string;
  actorId: string;
  note?: string;
}) {
  return record({
    companyId: input.companyId,
    leadId: input.leadId,
    actorId: input.actorId,
    activityType: "email_logged",
    note: input.note,
  });
}

export async function recordLeadNoteAddedActivity(input: {
  companyId: string;
  leadId: string;
  actorId: string;
  note: string;
}) {
  return record({
    companyId: input.companyId,
    leadId: input.leadId,
    actorId: input.actorId,
    activityType: "note_added",
    note: input.note,
  });
}

export async function recordLeadFollowUpChangedActivity(input: {
  companyId: string;
  leadId: string;
  actorId: string;
  previousFollowUpAt?: string;
  nextFollowUpAt?: string;
}) {
  return record({
    companyId: input.companyId,
    leadId: input.leadId,
    actorId: input.actorId,
    activityType: "follow_up_changed",
    metadata: {
      previousFollowUpAt: input.previousFollowUpAt,
      nextFollowUpAt: input.nextFollowUpAt,
    },
  });
}

export async function recordLeadStatusChangedActivity(input: {
  companyId: string;
  leadId: string;
  actorId: string;
  previousStatus: LeadStatus;
  nextStatus: LeadStatus;
}) {
  return record({
    companyId: input.companyId,
    leadId: input.leadId,
    actorId: input.actorId,
    activityType: "status_changed",
    metadata: {
      previousStatus: input.previousStatus,
      nextStatus: input.nextStatus,
    },
  });
}

export async function recordLeadEstimateCreatedActivity(input: {
  companyId: string;
  leadId: string;
  actorId: string;
  estimateId: string;
  estimateNumber: string;
}) {
  return record({
    companyId: input.companyId,
    leadId: input.leadId,
    actorId: input.actorId,
    activityType: "estimate_created",
    metadata: {
      estimateId: input.estimateId,
      estimateNumber: input.estimateNumber,
    },
  });
}

export async function recordLeadConvertedActivity(input: {
  companyId: string;
  leadId: string;
  actorId: string;
  customerId: string;
  customerName: string;
}) {
  return record({
    companyId: input.companyId,
    leadId: input.leadId,
    actorId: input.actorId,
    activityType: "converted",
    metadata: {
      customerId: input.customerId,
      customerName: input.customerName,
    },
  });
}

export async function recordLeadWonActivity(input: {
  companyId: string;
  leadId: string;
  actorId: string;
}) {
  return record({
    companyId: input.companyId,
    leadId: input.leadId,
    actorId: input.actorId,
    activityType: "won",
  });
}

export async function recordLeadLostActivity(input: {
  companyId: string;
  leadId: string;
  actorId: string;
  lostReason?: string;
}) {
  return record({
    companyId: input.companyId,
    leadId: input.leadId,
    actorId: input.actorId,
    activityType: "lost",
    metadata: input.lostReason ? { lostReason: input.lostReason } : {},
  });
}
