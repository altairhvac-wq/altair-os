import type { CustomerFormData } from "@/shared/types/customer";
import { formatLeadName, isLeadClosed, type Lead } from "@/shared/types/lead";

export function buildCustomerFormDataFromLead(lead: Lead): CustomerFormData {
  const name =
    `${lead.firstName} ${lead.lastName}`.trim() ||
    lead.companyName?.trim() ||
    "Lead customer";

  return {
    name,
    email: lead.email,
    phone: lead.phone,
    company: lead.companyName?.trim() ?? "",
    status: "lead",
    address: "",
    city: "",
    state: "",
    zip: "",
    notes: lead.notes?.trim()
      ? `Converted from lead on ${new Date().toISOString().slice(0, 10)}.\n\n${lead.notes.trim()}`
      : `Converted from lead on ${new Date().toISOString().slice(0, 10)}.`,
  };
}

export function canConvertLeadToCustomer(
  lead: Pick<Lead, "convertedCustomerId" | "status">,
): boolean {
  return !lead.convertedCustomerId && !isLeadClosed(lead.status);
}

export function shouldPromptConvertOnWon(
  lead: Pick<Lead, "convertedCustomerId">,
): boolean {
  return !lead.convertedCustomerId;
}

export function getLeadEstimateCustomerId(lead: Lead): string | undefined {
  return lead.convertedCustomerId;
}

export function getLeadEstimateHref(lead: Lead): string | null {
  if (!lead.convertedCustomerId) {
    return null;
  }

  const params = new URLSearchParams({
    customerId: lead.convertedCustomerId,
    create: "1",
    leadId: lead.id,
  });

  return `/estimates?${params.toString()}`;
}

export function summarizeLeadForConversion(lead: Lead): string {
  return formatLeadName(lead);
}
