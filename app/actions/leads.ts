"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  createCustomer,
  findCustomerByContact,
  getCustomerById,
  promoteLegacyLeadCustomerStatus,
  updateCustomer,
} from "@/lib/database/queries/customers";
import {
  hasLeadEstimateActivity,
  listLeadActivitiesForLead,
} from "@/lib/database/queries/lead-activities";
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
  recordLeadFollowUpChangedActivity,
  recordLeadLostActivity,
  recordLeadNoteAddedActivity,
  recordLeadStatusChangedActivity,
  recordLeadWonActivity,
} from "@/lib/database/services/lead-activity";
import {
  resolveReferralOutcomeFromLead,
  syncNetworkReferralOutcomeForLead,
  syncNetworkReferralOutcomeFromLeadState,
  type ReferralOutcomeStatus,
} from "@/lib/database/services/network-referral-outcome-sync";
import { buildCustomerFormDataFromLead } from "@/shared/lib/leads/lead-conversion";
import { validateLeadStatusTransition } from "@/shared/lib/leads/lead-status-transitions";
import {
  formatLeadName,
  normalizeLeadFormData,
  validateLeadFormData,
  isLeadClosed,
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
  warning?: string;
  lead?: Lead;
  customerId?: string;
};

function revalidateLeadPaths() {
  revalidatePath("/leads");
  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath("/estimates");
  revalidatePath("/network");
}

async function syncReferralOutcomeForNetworkLead(
  companyId: string,
  lead: Lead,
  actorUserId: string,
  statusOrOutcome: ReferralOutcomeStatus,
) {
  if (lead.source !== "network_referral") {
    return;
  }

  await syncNetworkReferralOutcomeForLead({
    leadId: lead.id,
    companyId,
    statusOrOutcome,
    actorUserId,
    lead,
  });
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

  if (lead.nextFollowUpAt) {
    await recordLeadFollowUpChangedActivity({
      companyId: permission.context.company.id,
      leadId: lead.id,
      actorId: permission.context.user.id,
      nextFollowUpAt: lead.nextFollowUpAt,
    });
  }

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

  const statusError = validateLeadStatusTransition(
    existing.status,
    normalized.status,
  );
  if (statusError) {
    return { error: statusError };
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

  if (lead.source === "network_referral") {
    const previousOutcome = resolveReferralOutcomeFromLead(existing);
    const nextOutcome = resolveReferralOutcomeFromLead(lead);
    if (nextOutcome && previousOutcome !== nextOutcome) {
      await syncNetworkReferralOutcomeFromLeadState({
        lead,
        companyId: permission.context.company.id,
        actorUserId: permission.context.user.id,
      });
    }
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
    existing.status === "new" && !isLeadClosed(existing.status)
      ? "contacted"
      : existing.status;

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
    existing.status === "new" && !isLeadClosed(existing.status)
      ? "contacted"
      : existing.status;

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

  const existing = await getLeadById(permission.context.company.id, leadId);
  if (!existing) {
    return { error: "Lead not found." };
  }

  const normalizedFollowUp = nextFollowUpAt?.trim()
    ? `${nextFollowUpAt.trim()}T12:00:00.000Z`
    : null;
  const previousFollowUpAt = existing.nextFollowUpAt;

  if (previousFollowUpAt === normalizedFollowUp) {
    return { lead: existing };
  }

  const { lead, error } = await updateLead(permission.context.company.id, leadId, {
    nextFollowUpAt: nextFollowUpAt ?? "",
  });

  if (error || !lead) {
    return { error: error ?? "We couldn't update the follow-up date." };
  }

  await recordLeadFollowUpChangedActivity({
    companyId: permission.context.company.id,
    leadId,
    actorId: permission.context.user.id,
    previousFollowUpAt,
    nextFollowUpAt: lead.nextFollowUpAt,
  });

  revalidateLeadPaths();
  return { lead };
}

async function ensureLinkedCustomerIsActive(
  companyId: string,
  customerId: string,
): Promise<{ error?: string }> {
  const promoted = await promoteLegacyLeadCustomerStatus(companyId, customerId);
  if (promoted.error) {
    return { error: promoted.error };
  }

  const customer = await getCustomerById(companyId, customerId);
  if (!customer || customer.status === "active") {
    return {};
  }

  const { error } = await updateCustomer(companyId, customerId, {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    company: customer.company ?? "",
    status: "active",
    address: customer.address,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    notes: customer.notes ?? "",
  });

  if (error) {
    return { error };
  }

  return {};
}

async function linkLeadToCustomer(
  companyId: string,
  leadId: string,
  customerId: string,
): Promise<{ error?: string }> {
  const { error } = await updateLead(companyId, leadId, {
    convertedCustomerId: customerId,
  });

  return error ? { error } : {};
}

async function ensureLeadCustomerRecord(
  companyId: string,
  actorId: string,
  lead: Lead,
): Promise<{ customerId?: string; error?: string; warning?: string }> {
  const latestLead = await getLeadById(companyId, lead.id);
  if (!latestLead) {
    return { error: "Lead not found." };
  }

  if (latestLead.convertedCustomerId) {
    const ensured = await ensureLinkedCustomerIsActive(
      companyId,
      latestLead.convertedCustomerId,
    );

    if (ensured.error) {
      return { error: ensured.error };
    }

    return { customerId: latestLead.convertedCustomerId };
  }

  const customerData = normalizeCustomerFormData(
    buildCustomerFormDataFromLead(latestLead),
  );
  const validationError = validateCustomerFormData(customerData, {
    requireAddress: false,
    requireContact: true,
  });

  if (validationError) {
    return { error: validationError };
  }

  const existingMatch = await findCustomerByContact(companyId, {
    email: latestLead.email,
    phone: latestLead.phone,
  });

  if (existingMatch.error) {
    return { error: existingMatch.error };
  }

  if (existingMatch.conflict) {
    return { error: existingMatch.conflict };
  }

  if (existingMatch.customer) {
    const linked = await linkLeadToCustomer(
      companyId,
      latestLead.id,
      existingMatch.customer.id,
    );

    if (linked.error) {
      return { error: linked.error };
    }

    const ensured = await ensureLinkedCustomerIsActive(
      companyId,
      existingMatch.customer.id,
    );

    if (ensured.error) {
      return { error: ensured.error };
    }

    return {
      customerId: existingMatch.customer.id,
      warning: `Linked to existing customer ${existingMatch.customer.name}.`,
    };
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

  const linked = await linkLeadToCustomer(companyId, latestLead.id, customer.id);
  if (linked.error) {
    return { error: linked.error };
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

  if (existing.status === "won") {
    if (existing.convertedCustomerId) {
      const ensured = await ensureLinkedCustomerIsActive(
        permission.context.company.id,
        existing.convertedCustomerId,
      );

      if (ensured.error) {
        return { error: ensured.error };
      }
    }

    return {
      lead: existing,
      customerId: existing.convertedCustomerId,
    };
  }

  const ensured = await ensureLeadCustomerRecord(
    permission.context.company.id,
    permission.context.user.id,
    existing,
  );

  if (ensured.error || !ensured.customerId) {
    return { error: ensured.error };
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

  await syncReferralOutcomeForNetworkLead(
    permission.context.company.id,
    lead,
    permission.context.user.id,
    "won",
  );

  revalidateLeadPaths();
  return {
    lead,
    customerId: ensured.customerId,
    warning: ensured.warning,
  };
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

  if (isLeadClosed(existing.status)) {
    return { error: "Closed leads cannot start a new estimate." };
  }

  const ensured = await ensureLeadCustomerRecord(
    permission.context.company.id,
    permission.context.user.id,
    existing,
  );

  if (ensured.error || !ensured.customerId) {
    return { error: ensured.error };
  }

  const lead = await getLeadById(permission.context.company.id, leadId);

  if (lead?.source === "network_referral" && lead.convertedCustomerId) {
    await syncReferralOutcomeForNetworkLead(
      permission.context.company.id,
      lead,
      permission.context.user.id,
      "converted",
    );
  }

  revalidateLeadPaths();
  return {
    lead: lead ?? existing,
    customerId: ensured.customerId,
    warning: ensured.warning,
  };
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

  if (existing.status === "won") {
    return { lead: existing, customerId: existing.convertedCustomerId };
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

  await syncReferralOutcomeForNetworkLead(
    permission.context.company.id,
    lead,
    permission.context.user.id,
    "won",
  );

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

  if (existing.status === "lost") {
    return { lead: existing };
  }

  const now = new Date().toISOString();
  const normalizedReason = lostReason?.trim() || null;
  const { lead, error } = await updateLead(permission.context.company.id, leadId, {
    status: "lost",
    lostAt: now,
    lostReason: normalizedReason,
    wonAt: null,
  });

  if (error || !lead) {
    return { error: error ?? "We couldn't mark this lead as lost." };
  }

  await recordLeadLostActivity({
    companyId: permission.context.company.id,
    leadId,
    actorId: permission.context.user.id,
    lostReason: normalizedReason ?? undefined,
  });

  await syncReferralOutcomeForNetworkLead(
    permission.context.company.id,
    lead,
    permission.context.user.id,
    "lost",
  );

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

  const alreadyRecorded = await hasLeadEstimateActivity(
    permission.context.company.id,
    existing.id,
    input.estimateId,
  );

  if (alreadyRecorded) {
    return { lead: existing };
  }

  const previousStatus = existing.status;
  const shouldUpdateStatus =
    !isLeadClosed(previousStatus) && previousStatus !== "estimate_sent";

  const { lead, error } = shouldUpdateStatus
    ? await updateLead(permission.context.company.id, existing.id, {
        status: "estimate_sent",
      })
    : { lead: existing, error: null };

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

  if (shouldUpdateStatus) {
    await recordLeadStatusChangedActivity({
      companyId: permission.context.company.id,
      leadId: existing.id,
      actorId: permission.context.user.id,
      previousStatus,
      nextStatus: "estimate_sent",
    });
  }

  revalidateLeadPaths();
  return { lead };
}
