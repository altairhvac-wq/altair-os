/**
 * Bridges accepted `network_referrals` into the lead pipeline (`leads` table).
 *
 * This is referral → lead conversion only. It does not touch `network_partners`
 * (private CRM) or mutate `network_profiles` (directory). See README in
 * `shared/components/network/README.md`.
 */

import { createServiceRoleClient } from "@/lib/supabase/service";
import { mapDatabaseError } from "@/lib/database/errors";
import type { LeadInsert, LeadUpdate } from "@/lib/database/types/core-tables";
import type { Lead } from "@/shared/types/lead";
import type { NetworkReferralUrgency } from "@/lib/database/types/enums";
import {
  buildPendingReferralLeadNotes,
  buildRevealedReferralLeadNotes,
  maskCustomerNameForLead,
  splitCustomerName,
} from "@/shared/types/network-referral";

type CreateReferralTargetLeadInput = {
  targetCompanyId: string;
  referralId: string;
  sourceCompanyId: string;
  sourceCompanyName: string;
  sourceUserName?: string;
  sourceNetworkProfileId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
  requestedService: string;
  urgency: NetworkReferralUrgency;
  notes?: string;
  incentiveNote?: string;
};

function mapInsertedLeadRow(row: {
  id: string;
  company_id: string;
  created_by: string | null;
  assigned_user_id: string | null;
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string;
  phone: string;
  source: Lead["source"];
  status: Lead["status"];
  notes: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  converted_customer_id: string | null;
  won_at: string | null;
  lost_at: string | null;
  lost_reason: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  delete_after: string | null;
  created_at: string;
  updated_at: string;
}): Lead {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    companyName: row.company_name ?? undefined,
    email: row.email,
    phone: row.phone,
    source: row.source,
    status: row.status,
    notes: row.notes ?? undefined,
    lastContactedAt: row.last_contacted_at ?? undefined,
    nextFollowUpAt: row.next_follow_up_at ?? undefined,
    convertedCustomerId: row.converted_customer_id ?? undefined,
    wonAt: row.won_at ?? undefined,
    lostAt: row.lost_at ?? undefined,
    lostReason: row.lost_reason ?? undefined,
    assignedUserId: row.assigned_user_id ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    deleteAfter: row.delete_after ?? undefined,
  };
}

/**
 * Creates the auto-linked lead in the receiving company's workspace WITHOUT
 * the customer's contact PII — name reduced to first-name + last-initial,
 * email/phone left blank, street address omitted from notes. The referral
 * row (inserted separately, RLS-protected to source/target companies only)
 * remains the sole holder of the full customer details until the receiving
 * company accepts. See revealReferralLeadContact for the accept-time reveal.
 */
export async function createReferralTargetLead(
  input: CreateReferralTargetLeadInput,
): Promise<{ lead: Lead | null; error: string | null }> {
  const { firstName, lastName } = maskCustomerNameForLead(input.customerName);
  const notes = buildPendingReferralLeadNotes({
    referralId: input.referralId,
    sourceCompanyName: input.sourceCompanyName,
    sourceUserName: input.sourceUserName,
    sourceCompanyId: input.sourceCompanyId,
    sourceNetworkProfileId: input.sourceNetworkProfileId,
    serviceAddress: input.serviceAddress,
    city: input.city,
    state: input.state,
    zip: input.zip,
    requestedService: input.requestedService,
    urgency: input.urgency,
    notes: input.notes,
    incentiveNote: input.incentiveNote,
  });

  const row: LeadInsert = {
    company_id: input.targetCompanyId,
    created_by: null,
    first_name: firstName,
    last_name: lastName,
    company_name: null,
    email: "",
    phone: "",
    source: "network_referral",
    status: "new",
    notes,
  };

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("leads")
    .insert(row)
    .select("*")
    .single();

  if (error || !data) {
    return {
      lead: null,
      error: mapDatabaseError(error),
    };
  }

  const activityError = await supabase.from("lead_activities").insert({
    company_id: input.targetCompanyId,
    lead_id: data.id,
    activity_type: "lead_created",
    created_by: null,
    note: null,
    metadata: {
      networkReferralId: input.referralId,
      sourceCompanyName: input.sourceCompanyName,
      source: "network_referral",
    },
  });

  if (activityError.error) {
    console.error(
      "[createReferralTargetLead] lead activity insert failed:",
      activityError.error,
    );
  }

  return {
    lead: mapInsertedLeadRow(data),
    error: null,
  };
}

type ReferralHandoffRow = {
  id: string;
  source_company_id: string;
  target_company_id: string;
  status: string;
  target_lead_id: string | null;
};

async function getReferralHandoffRow(
  referralId: string,
): Promise<{ row: ReferralHandoffRow | null; error: string | null }> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("network_referrals")
    .select("id, source_company_id, target_company_id, status, target_lead_id")
    .eq("id", referralId)
    .maybeSingle();

  if (error || !data) {
    return {
      row: null,
      error: error ? mapDatabaseError(error) : "Referral not found.",
    };
  }

  return { row: data, error: null };
}

export async function linkNetworkReferralTargetLead(input: {
  referralId: string;
  sourceCompanyId: string;
  targetCompanyId: string;
  targetLeadId: string;
}): Promise<{ error: string | null }> {
  const { row, error: loadError } = await getReferralHandoffRow(input.referralId);
  if (loadError || !row) {
    return { error: loadError ?? "Referral not found." };
  }

  if (row.source_company_id !== input.sourceCompanyId) {
    return { error: "Referral not found." };
  }

  if (row.target_company_id !== input.targetCompanyId) {
    return { error: "Referral target company mismatch." };
  }

  if (row.status !== "sent") {
    return { error: "This referral can no longer be linked to a lead." };
  }

  if (row.target_lead_id) {
    return { error: null };
  }

  const supabase = createServiceRoleClient();
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, company_id")
    .eq("id", input.targetLeadId)
    .maybeSingle();

  if (leadError || !lead || lead.company_id !== input.targetCompanyId) {
    return {
      error: leadError
        ? mapDatabaseError(leadError)
        : "Target lead not found for this referral.",
    };
  }

  const { error: updateError } = await supabase
    .from("network_referrals")
    .update({ target_lead_id: input.targetLeadId })
    .eq("id", input.referralId)
    .eq("source_company_id", input.sourceCompanyId)
    .is("target_lead_id", null);

  return { error: updateError ? mapDatabaseError(updateError) : null };
}

type ReferralFullRow = {
  id: string;
  source_company_id: string;
  target_company_id: string;
  source_user_id: string;
  target_lead_id: string | null;
  source_network_profile_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  service_address: string;
  city: string;
  state: string;
  zip: string;
  requested_service: string;
  urgency: NetworkReferralUrgency;
  notes: string | null;
  incentive_note: string | null;
};

/**
 * Reveals the customer's full contact PII on the lead once the receiving
 * company has ACCEPTED the referral — restores the real name, fills in
 * email/phone, and rewrites notes to include the street address. Best-effort:
 * called after acceptance already succeeded, so a failure here never blocks
 * accepting the referral itself (it just leaves the lead masked, which is
 * safe — never a "declined by default" outcome).
 */
export async function revealReferralLeadContact(input: {
  referralId: string;
  targetCompanyId: string;
}): Promise<{ error: string | null }> {
  const supabase = createServiceRoleClient();

  const { data: referral, error: referralError } = await supabase
    .from("network_referrals")
    .select(
      "id, source_company_id, target_company_id, source_user_id, target_lead_id, source_network_profile_id, customer_name, customer_phone, customer_email, service_address, city, state, zip, requested_service, urgency, notes, incentive_note",
    )
    .eq("id", input.referralId)
    .maybeSingle();

  if (referralError || !referral) {
    return {
      error: referralError ? mapDatabaseError(referralError) : "Referral not found.",
    };
  }

  const row = referral as ReferralFullRow;

  if (row.target_company_id !== input.targetCompanyId || !row.target_lead_id) {
    return { error: null };
  }

  const [{ data: sourceCompany }, { data: sourceProfile }] = await Promise.all([
    supabase
      .from("companies")
      .select("name")
      .eq("id", row.source_company_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", row.source_user_id)
      .maybeSingle(),
  ]);

  const { firstName, lastName } = splitCustomerName(row.customer_name);
  const notes = buildRevealedReferralLeadNotes({
    referralId: row.id,
    sourceCompanyName: sourceCompany?.name ?? "Network partner",
    sourceUserName: sourceProfile?.full_name ?? undefined,
    sourceCompanyId: row.source_company_id,
    sourceNetworkProfileId: row.source_network_profile_id ?? undefined,
    serviceAddress: row.service_address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    requestedService: row.requested_service,
    urgency: row.urgency,
    notes: row.notes ?? undefined,
    incentiveNote: row.incentive_note ?? undefined,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
  });

  const update: LeadUpdate = {
    first_name: firstName,
    last_name: lastName,
    email: row.customer_email,
    phone: row.customer_phone,
    notes,
  };

  const { error: updateError } = await supabase
    .from("leads")
    .update(update)
    .eq("id", row.target_lead_id)
    .eq("company_id", input.targetCompanyId);

  return { error: updateError ? mapDatabaseError(updateError) : null };
}

export async function cancelNetworkReferralHandoff(input: {
  referralId: string;
  sourceCompanyId: string;
  declineReason: string;
}): Promise<{ error: string | null }> {
  const { row, error: loadError } = await getReferralHandoffRow(input.referralId);
  if (loadError || !row) {
    return { error: loadError ?? "Referral not found." };
  }

  if (row.source_company_id !== input.sourceCompanyId) {
    return { error: "Referral not found." };
  }

  if (row.status !== "sent" || row.target_lead_id) {
    return { error: null };
  }

  const supabase = createServiceRoleClient();
  const { error: updateError } = await supabase
    .from("network_referrals")
    .update({
      status: "cancelled",
      decline_reason: input.declineReason,
    })
    .eq("id", input.referralId)
    .eq("source_company_id", input.sourceCompanyId)
    .eq("status", "sent")
    .is("target_lead_id", null);

  return {
    error: updateError ? mapDatabaseError(updateError) : null,
  };
}
