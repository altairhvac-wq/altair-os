import {
  filterLeadsForWorkQueue,
  isLeadPastQueue,
} from "@/shared/components/leads/lead-work-queues";
import { compareLeadsByField } from "@/shared/lib/leads/lead-status";
import {
  formatLeadName,
  formatLeadSource,
  type Lead,
} from "@/shared/types/lead";

export type LeadDashboardAttentionPreview = {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  phone: string;
  email: string;
  status: string;
  createdAt: string;
  sourceLabel: string;
  nextFollowUpAt?: string;
  openHref: string;
};

export const LEADS_NEEDS_CONTACT_QUEUE_HREF = "/leads?queue=needs-contact";
export const LEADS_QUALIFIED_QUEUE_HREF = "/leads?queue=qualified";

/** Active leads that have not been contacted yet. */
export function isLeadNewNeedingFirstContact(lead: Lead): boolean {
  if (isLeadPastQueue(lead)) {
    return false;
  }

  return lead.status === "new";
}

/** Contacted or scheduled leads ready for an estimate to be prepared. */
export function isLeadReadyForEstimatePreparation(
  lead: Lead,
  timeZone: string,
  reference?: Date,
): boolean {
  const qualified = filterLeadsForWorkQueue(
    [lead],
    "qualified",
    timeZone,
    reference,
  );
  return qualified.length > 0;
}

export function selectLeadsNewNeedingFirstContact(
  leads: Lead[],
  options?: { limit?: number; reference?: Date; timeZone: string },
): Lead[] {
  const limit = options?.limit ?? leads.length;

  return leads
    .filter(isLeadNewNeedingFirstContact)
    .sort((left, right) => compareLeadsByField(left, right, "createdAt"))
    .slice(0, limit);
}

export function selectLeadsReadyForEstimatePreparation(
  leads: Lead[],
  options?: { limit?: number; reference?: Date; timeZone: string },
): Lead[] {
  const timeZone = options?.timeZone;
  if (!timeZone) {
    throw new Error("timeZone is required");
  }

  const limit = options?.limit ?? leads.length;

  return filterLeadsForWorkQueue(leads, "qualified", timeZone, options?.reference)
    .sort((left, right) => compareLeadsByField(left, right, "createdAt"))
    .slice(0, limit);
}

export function buildLeadDashboardAttentionPreview(
  lead: Lead,
): LeadDashboardAttentionPreview {
  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    companyName: lead.companyName,
    phone: lead.phone,
    email: lead.email,
    status: lead.status,
    createdAt: lead.createdAt,
    sourceLabel: formatLeadSource(lead.source),
    nextFollowUpAt: lead.nextFollowUpAt,
    openHref: `/leads?selected=${lead.id}`,
  };
}

function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}

export function formatNewLeadContactTitle(count: number): string {
  if (count <= 1) {
    return "New lead — make first contact";
  }

  return "New leads need first contact";
}

export function formatNewLeadContactDescription(count: number): string {
  if (count <= 0) {
    return "New leads are waiting for first contact";
  }

  if (count === 1) {
    return "Speed-to-lead — open the lead and make first contact";
  }

  return `${count} new ${pluralize(count, "lead")} waiting for first contact`;
}

export function formatLeadEstimateReadyTitle(count: number): string {
  if (count <= 1) {
    return "Lead ready — prepare estimate";
  }

  return "Leads ready for estimates";
}

export function formatLeadEstimateReadyDescription(count: number): string {
  if (count <= 0) {
    return "Qualified leads are ready for estimates";
  }

  if (count === 1) {
    return "Lead is qualified — prepare and send an estimate";
  }

  return `${count} qualified ${pluralize(count, "lead")} need estimates prepared`;
}

export function formatNewLeadContactQueueTitle(
  lead: Pick<Lead, "firstName" | "lastName" | "companyName">,
): string {
  const name = formatLeadName(lead as Lead);
  return name ? `Contact ${name}` : "Contact lead";
}

export function formatLeadEstimateReadyQueueTitle(
  lead: Pick<Lead, "firstName" | "lastName" | "companyName">,
): string {
  const name = formatLeadName(lead as Lead);
  return name ? `Prepare estimate for ${name}` : "Prepare estimate";
}
