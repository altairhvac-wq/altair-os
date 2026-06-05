"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { createCustomer } from "@/lib/database/queries/customers";
import { listLeadActivitiesForLead } from "@/lib/database/queries/lead-activities";
import {
  createLead,
  getLeadById,
  updateLead,
} from "@/lib/database/queries/leads";
import type { LeadActivity } from "@/shared/types/lead-activity";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  recordCustomerCreatedActivity,
} from "@/lib/database/services/customer-activity";
import {
  recordLeadCallLoggedActivity,
  recordLeadConvertedActivity,
  recordLeadCreatedActivity,
  recordLeadEmailLoggedActivity,
  recordLeadEstimateCreatedActivity,
  recordLeadLostActivity,
  recordLeadNoteAddedActivity,
  recordLeadStatusChangedActivity,
  recordLeadWonActivity,
} from "@/lib/database/services/lead-activity";
import { buildCustomerFormDataFromLead } from "@/shared/lib/leads/lead-conversion";
import {
  formatLeadName,
  normalizeLeadFormData,
  validateLeadFormData,
  type Lead,
  type LeadFormData,
  type LeadStatus,
} from "@/shared/types/lead";
import {
  normalizeCustomerFormData,
  validateCustomerFormData,
} from "@/shared/types/customer";

export type LeadActionResult = {
  error?: string;
  lead?: Lead;
  customerId?: string;
};

function revalidateLeadPaths() {
  revalidatePath("/leads");
  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath("/estimates");
}

async function assertLeadManager() {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE } as const;
  }

  if (!context.permissions.manageCustomers) {
    return { error: "You do not have permission to manage leads." } as const;
  }

  return { context } as const;
}

export async function createLeadAction(
  data: LeadFormData,
): Promise<LeadActionResult> {
  const permission = await assertLeadManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const normalized = normalizeLeadFormData(data);
  const validationError = validateLeadFormData(normalized);
  if (validationError) {
    return { error: validationError };
  }

  const { lead, error } = await createLead(
    permission.context.company.id,
    normalized,
    permission.context.user.id,
  );

  if (error || !lead) {
    return { error: error ?? "We couldn't save this lead. Check the details and try again." };
  }

  await recordLeadCreatedActivity({
    companyId: permission.context.company.id,
    leadId: lead.id,
    actorId: permission.context.user.id,
    leadName: formatLeadName(lead),
  });

  revalidateLeadPaths();
  return { lead };
}

export async function updateLeadAction(
  leadId: string,
  data: LeadFormData,
): Promise<LeadActionResult> {
  const permission = await assertLeadManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const existing = await getLeadById(permission.context.company.id, leadId);
  if (!existing) {
    return { error: "Lead not found." };
  }

  const normalized = normalizeLeadFormData(data);
  const validationError = validateLeadFormData(normalized);
  if (validationError) {
    return { error: validationError };
  }

  const { lead, error } = await updateLead(
    permission.context.company.id,
    leadId,
    normalized,
  );

  if (error || !lead) {
    return { error: error ?? "We couldn't update this lead." };
  }

  if (existing.status !== lead.status) {
    await recordLeadStatusChangedActivity({
      companyId: permission.context.company.id,
      leadId: lead.id,
      actorId: permission.context.user.id,
      previousStatus: existing.status,
      nextStatus: lead.status,
    });
  }

  revalidateLeadPaths();
  return { lead };
}

export async function logLeadCallAction(
  leadId: string,
  note?: string,
): Promise<LeadActionResult> {
  const permission = await assertLeadManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const existing = await getLeadById(permission.context.company.id, leadId);
  if (!existing) {
    return { error: "Lead not found." };
  }

  const now = new Date().toISOString();
  const nextStatus: LeadStatus =
    existing.status === "new" ? "contacted" : existing.status;

  const { lead, error } = await updateLead(permission.context.company.id, leadId, {
    lastContactedAt: now,
    status: nextStatus,
  });

  if (error || !lead) {
    return { error: error ?? "We couldn't log this call." };
  }

  await recordLeadCallLoggedActivity({
    companyId: permission.context.company.id,
    leadId,
    actorId: permission.context.user.id,
    note,
  });

  if (existing.status !== nextStatus) {
    await recordLeadStatusChangedActivity({
      companyId: permission.context.company.id,
      leadId,
      actorId: permission.context.user.id,
      previousStatus: existing.status,
      nextStatus,
    });
  }

  revalidateLeadPaths();
  return { lead };
}

export async function logLeadEmailAction(
  leadId: string,
  note?: string,
): Promise<LeadActionResult> {
  const permission = await assertLeadManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const existing = await getLeadById(permission.context.company.id, leadId);
  if (!existing) {
    return { error: "Lead not found." };
  }

  const now = new Date().toISOString();
  const nextStatus: LeadStatus =
    existing.status === "new" ? "contacted" : existing.status;

  const { lead, error } = await updateLead(permission.context.company.id, leadId, {
    lastContactedAt: now,
    status: nextStatus,
  });

  if (error || !lead) {
    return { error: error ?? "We couldn't log this email." };
  }

  await recordLeadEmailLoggedActivity({
    companyId: permission.context.company.id,
    leadId,
    actorId: permission.context.user.id,
    note,
  });

  if (existing.status !== nextStatus) {
    await recordLeadStatusChangedActivity({
      companyId: permission.context.company.id,
      leadId,
      actorId: permission.context.user.id,
      previousStatus: existing.status,
      nextStatus,
    });
  }

  revalidateLeadPaths();
  return { lead };
}

export async function addLeadNoteAction(
  leadId: string,
  note: string,
): Promise<LeadActionResult> {
  const permission = await assertLeadManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const trimmedNote = note.trim();
  if (!trimmedNote) {
    return { error: "Enter a note before saving." };
  }

  const existing = await getLeadById(permission.context.company.id, leadId);
  if (!existing) {
    return { error: "Lead not found." };
  }

  await recordLeadNoteAddedActivity({
    companyId: permission.context.company.id,
    leadId,
    actorId: permission.context.user.id,
    note: trimmedNote,
  });

  revalidateLeadPaths();
  return { lead: existing };
}

export async function updateLeadFollowUpAction(
  leadId: string,
  nextFollowUpAt: string | null,
): Promise<LeadActionResult> {
  const permission = await assertLeadManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const { lead, error } = await updateLead(permission.context.company.id, leadId, {
    nextFollowUpAt: nextFollowUpAt ?? "",
  });

  if (error || !lead) {
    return { error: error ?? "We couldn't update the follow-up date." };
  }

  revalidateLeadPaths();
  return { lead };
}

async function ensureLeadCustomerRecord(
  companyId: string,
  actorId: string,
  lead: Lead,
  customerStatus: "lead" | "active",
): Promise<{ customerId?: string; error?: string }> {
  if (lead.convertedCustomerId) {
    return { customerId: lead.convertedCustomerId };
  }

  const customerData = normalizeCustomerFormData({
    ...buildCustomerFormDataFromLead(lead),
    status: customerStatus,
  });
  const validationError = validateCustomerFormData(customerData, {
    requireAddress: false,
    requireContact: true,
  });

  if (validationError) {
    return { error: validationError };
  }

  const { customer, error: customerError } = await createCustomer(
    companyId,
    customerData,
  );

  if (customerError || !customer) {
    return {
      error:
        customerError ??
        "We couldn't create the customer record from this lead.",
    };
  }

  await recordCustomerCreatedActivity({
    companyId,
    customerId: customer.id,
    actorId,
    customerName: customer.name,
    status: customer.status,
  });

  const { error } = await updateLead(companyId, lead.id, {
    convertedCustomerId: customer.id,
  });

  if (error) {
    return { error };
  }

  return { customerId: customer.id };
}

export async function convertLeadToCustomerAction(
  leadId: string,
): Promise<LeadActionResult> {
  const permission = await assertLeadManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const existing = await getLeadById(permission.context.company.id, leadId);
  if (!existing) {
    return { error: "Lead not found." };
  }

  const ensured = await ensureLeadCustomerRecord(
    permission.context.company.id,
    permission.context.user.id,
    existing,
    "active",
  );

  if (ensured.error || !ensured.customerId) {
    return { error: ensured.error };
  }

  if (existing.convertedCustomerId && existing.status === "won") {
    return { lead: existing, customerId: ensured.customerId };
  }

  const now = new Date().toISOString();
  const { lead, error } = await updateLead(permission.context.company.id, leadId, {
    convertedCustomerId: ensured.customerId,
    status: "won",
    wonAt: now,
    lostAt: null,
    lostReason: null,
  });

  if (error || !lead) {
    return { error: error ?? "Customer created, but lead conversion failed." };
  }

  if (!existing.convertedCustomerId) {
    await recordLeadConvertedActivity({
      companyId: permission.context.company.id,
      leadId,
      actorId: permission.context.user.id,
      customerId: ensured.customerId,
      customerName: formatLeadName(lead),
    });
  }

  await recordLeadWonActivity({
    companyId: permission.context.company.id,
    leadId,
    actorId: permission.context.user.id,
  });

  revalidateLeadPaths();
  return { lead, customerId: ensured.customerId };
}

export async function prepareLeadEstimateAction(
  leadId: string,
): Promise<LeadActionResult> {
  const permission = await assertLeadManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const existing = await getLeadById(permission.context.company.id, leadId);
  if (!existing) {
    return { error: "Lead not found." };
  }

  const ensured = await ensureLeadCustomerRecord(
    permission.context.company.id,
    permission.context.user.id,
    existing,
    "lead",
  );

  if (ensured.error || !ensured.customerId) {
    return { error: ensured.error };
  }

  const lead = await getLeadById(permission.context.company.id, leadId);
  revalidateLeadPaths();
  return { lead: lead ?? existing, customerId: ensured.customerId };
}

export async function markLeadWonAction(
  leadId: string,
  convertIfNeeded = false,
): Promise<LeadActionResult> {
  const permission = await assertLeadManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const existing = await getLeadById(permission.context.company.id, leadId);
  if (!existing) {
    return { error: "Lead not found." };
  }

  if (!existing.convertedCustomerId && convertIfNeeded) {
    return convertLeadToCustomerAction(leadId);
  }

  const now = new Date().toISOString();
  const { lead, error } = await updateLead(permission.context.company.id, leadId, {
    status: "won",
    wonAt: now,
    lostAt: null,
    lostReason: null,
  });

  if (error || !lead) {
    return { error: error ?? "We couldn't mark this lead as won." };
  }

  await recordLeadWonActivity({
    companyId: permission.context.company.id,
    leadId,
    actorId: permission.context.user.id,
  });

  revalidateLeadPaths();
  return { lead, customerId: lead.convertedCustomerId };
}

export async function markLeadLostAction(
  leadId: string,
  lostReason?: string,
): Promise<LeadActionResult> {
  const permission = await assertLeadManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const existing = await getLeadById(permission.context.company.id, leadId);
  if (!existing) {
    return { error: "Lead not found." };
  }

  const now = new Date().toISOString();
  const { lead, error } = await updateLead(permission.context.company.id, leadId, {
    status: "lost",
    lostAt: now,
    lostReason: lostReason?.trim() || null,
    wonAt: null,
  });

  if (error || !lead) {
    return { error: error ?? "We couldn't mark this lead as lost." };
  }

  await recordLeadLostActivity({
    companyId: permission.context.company.id,
    leadId,
    actorId: permission.context.user.id,
    lostReason: lostReason?.trim() || undefined,
  });

  revalidateLeadPaths();
  return { lead };
}

export async function getLeadActivitiesAction(
  leadId: string,
): Promise<{ error?: string; activities?: LeadActivity[] }> {
  const permission = await assertLeadManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const lead = await getLeadById(permission.context.company.id, leadId);
  if (!lead) {
    return { error: "Lead not found." };
  }

  const activities = await listLeadActivitiesForLead(
    permission.context.company.id,
    leadId,
  );

  return { activities };
}

export async function recordLeadEstimateCreatedFromLeadAction(input: {
  leadId: string;
  estimateId: string;
  estimateNumber: string;
}): Promise<LeadActionResult> {
  const permission = await assertLeadManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const existing = await getLeadById(
    permission.context.company.id,
    input.leadId.trim(),
  );

  if (!existing) {
    return { error: "Lead not found." };
  }

  const { lead, error } = await updateLead(
    permission.context.company.id,
    existing.id,
    {
      status: "estimate_sent",
    },
  );

  if (error || !lead) {
    return { error: error ?? "Estimate created, but lead update failed." };
  }

  await recordLeadEstimateCreatedActivity({
    companyId: permission.context.company.id,
    leadId: existing.id,
    actorId: permission.context.user.id,
    estimateId: input.estimateId,
    estimateNumber: input.estimateNumber,
  });

  revalidateLeadPaths();
  return { lead };
}
