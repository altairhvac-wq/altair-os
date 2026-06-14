import { createServiceRoleClient } from "@/lib/supabase/service";
import { mapDatabaseError } from "@/lib/database/errors";
import type { LeadInsert } from "@/lib/database/types/core-tables";
import type { Lead } from "@/shared/types/lead";
import type { NetworkReferralUrgency } from "@/lib/database/types/enums";
import {
  buildReferralLeadNotes,
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

export async function createReferralTargetLead(
  input: CreateReferralTargetLeadInput,
): Promise<{ lead: Lead | null; error: string | null }> {
  const { firstName, lastName } = splitCustomerName(input.customerName);
  const notes = buildReferralLeadNotes({
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
    email: input.customerEmail,
    phone: input.customerPhone,
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
