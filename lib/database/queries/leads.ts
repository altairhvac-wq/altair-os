import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import { getLatestLeadActivityForLeads } from "@/lib/database/queries/lead-activities";
import { getNetworkReferralsByLeadIds } from "@/lib/database/queries/network-referrals";
import type {
  LeadInsert,
  LeadRow,
  LeadUpdate,
} from "@/lib/database/types/core-tables";
import type { CompanyRole } from "@/lib/database/types/enums";
import { formatLeadActivityLabel } from "@/shared/types/lead-activity";
import { getLeadFollowUpDueCutoff } from "@/shared/lib/leads/lead-status";
import { getMonthBoundsInTimeZone } from "@/shared/lib/datetime";
import type { Lead, LeadFormData, LeadStatus } from "@/shared/types/lead";

const LEAD_MANAGER_ROLES: CompanyRole[] = [
  "owner",
  "admin",
  "dispatcher",
  "office_staff",
];

type LeadRowWithRelations = LeadRow & {
  assigned_user?: { id: string; full_name: string | null; email: string } | null;
  created_by_profile?: { id: string; full_name: string | null; email: string } | null;
};

export type LeadAssignableMember = {
  id: string;
  name: string;
};

function resolveProfileName(
  profile?: { full_name: string | null; email: string } | null,
): string | undefined {
  if (!profile) {
    return undefined;
  }

  return profile.full_name?.trim() || profile.email;
}

function mapLeadRowToLead(
  row: LeadRowWithRelations,
  latestActivity?: { createdAt: string; label: string },
): Lead {
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
    assignedUserName: resolveProfileName(row.assigned_user),
    createdBy: row.created_by ?? undefined,
    createdByName: resolveProfileName(row.created_by_profile),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    deleteAfter: row.delete_after ?? undefined,
    lastActivityAt: latestActivity?.createdAt,
    lastActivityLabel: latestActivity?.label,
  };
}

function mapLeadFormDataToRowFields(
  data: LeadFormData,
): Pick<
  LeadInsert,
  | "first_name"
  | "last_name"
  | "company_name"
  | "email"
  | "phone"
  | "source"
  | "status"
  | "notes"
  | "assigned_user_id"
  | "next_follow_up_at"
> {
  return {
    first_name: data.firstName.trim(),
    last_name: data.lastName.trim(),
    company_name: data.companyName.trim() || null,
    email: data.email.trim(),
    phone: data.phone.trim(),
    source: data.source,
    status: data.status,
    notes: data.notes.trim() || null,
    assigned_user_id: data.assignedUserId.trim() || null,
    next_follow_up_at: data.nextFollowUpAt.trim()
      ? `${data.nextFollowUpAt.trim()}T12:00:00.000Z`
      : null,
  };
}

async function attachLatestActivity(
  companyId: string,
  rows: LeadRowWithRelations[],
): Promise<Lead[]> {
  const latestActivities = await getLatestLeadActivityForLeads(
    companyId,
    rows.map((row) => row.id),
  );

  return rows.map((row) => {
    const latest = latestActivities.get(row.id);
    return mapLeadRowToLead(
      row,
      latest
        ? {
            createdAt: latest.createdAt,
            label: formatLeadActivityLabel(latest),
          }
        : undefined,
    );
  });
}

export type ListLeadsOptions = {
  includeArchived?: boolean;
  includeDeleted?: boolean;
  includeLatestActivity?: boolean;
};

export async function listLeads(
  companyId: string,
  options?: ListLeadsOptions,
): Promise<Lead[]> {
  const supabase = await createClient();
  const includeArchived = options?.includeArchived ?? false;
  const includeDeleted = options?.includeDeleted ?? false;
  const includeLatestActivity = options?.includeLatestActivity ?? true;

  let query = supabase
    .from("leads")
    .select(
      `
      *,
      assigned_user:profiles!leads_assigned_user_id_fkey (
        id,
        full_name,
        email
      ),
      created_by_profile:profiles!leads_created_by_fkey (
        id,
        full_name,
        email
      )
    `,
    )
    .eq("company_id", companyId);

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("[listLeads] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  const rows = (data ?? []) as LeadRowWithRelations[];

  if (!includeLatestActivity) {
    return rows.map((row) => mapLeadRowToLead(row));
  }

  return attachLatestActivity(companyId, rows);
}

async function attachNetworkReferrals(
  companyId: string,
  leads: Lead[],
): Promise<Lead[]> {
  const referralMap = await getNetworkReferralsByLeadIds(
    companyId,
    leads.map((lead) => lead.id),
  );

  if (referralMap.size === 0) {
    return leads;
  }

  return leads.map((lead) => {
    const networkReferral = referralMap.get(lead.id);
    return networkReferral ? { ...lead, networkReferral } : lead;
  });
}

export async function listLeadsWithReferrals(
  companyId: string,
  options?: ListLeadsOptions,
): Promise<Lead[]> {
  const leads = await listLeads(companyId, options);
  return attachNetworkReferrals(companyId, leads);
}

export async function getLeadById(
  companyId: string,
  leadId: string,
): Promise<Lead | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      `
      *,
      assigned_user:profiles!leads_assigned_user_id_fkey (
        id,
        full_name,
        email
      ),
      created_by_profile:profiles!leads_created_by_fkey (
        id,
        full_name,
        email
      )
    `,
    )
    .eq("company_id", companyId)
    .eq("id", leadId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[getLeadById] query failed:", {
        companyId,
        leadId,
        code: error.code,
        message: error.message,
      });
    }
    return null;
  }

  const [lead] = await attachLatestActivity(companyId, [
    data as LeadRowWithRelations,
  ]);
  return lead ?? null;
}

export async function listLeadsNeedingFollowUp(
  companyId: string,
  options?: { limit?: number; reference?: Date; timeZone?: string },
): Promise<Lead[]> {
  const supabase = await createClient();
  const reference = options?.reference ?? new Date();
  const limit = options?.limit ?? 10;
  const followUpDueCutoff = getLeadFollowUpDueCutoff(
    reference,
    options?.timeZone,
  );

  const { data, error } = await supabase
    .from("leads")
    .select(
      `
      *,
      assigned_user:profiles!leads_assigned_user_id_fkey (
        id,
        full_name,
        email
      ),
      created_by_profile:profiles!leads_created_by_fkey (
        id,
        full_name,
        email
      )
    `,
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .not("status", "in", '("won","lost")')
    .not("next_follow_up_at", "is", null)
    .lte("next_follow_up_at", followUpDueCutoff)
    .order("next_follow_up_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[listLeadsNeedingFollowUp] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return attachLatestActivity(companyId, (data ?? []) as LeadRowWithRelations[]);
}

function activeLeadCountQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
) {
  return supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .is("archived_at", null);
}

export async function countActiveLeads(companyId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await activeLeadCountQuery(supabase, companyId);

  if (error) {
    console.error("[countActiveLeads] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

export async function countLeadsByStatus(
  companyId: string,
  status: LeadStatus,
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await activeLeadCountQuery(supabase, companyId).eq(
    "status",
    status,
  );

  if (error) {
    console.error("[countLeadsByStatus] query failed:", {
      companyId,
      status,
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

export async function countLeadsWonThisMonth(
  companyId: string,
  timeZone: string,
  reference = new Date(),
): Promise<number> {
  const supabase = await createClient();
  const { start, end } = getMonthBoundsInTimeZone(timeZone, reference);

  const { count, error } = await activeLeadCountQuery(supabase, companyId)
    .eq("status", "won")
    .gte("won_at", start)
    .lte("won_at", end);

  if (error) {
    console.error("[countLeadsWonThisMonth] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

export async function countLeadsLostThisMonth(
  companyId: string,
  timeZone: string,
  reference = new Date(),
): Promise<number> {
  const supabase = await createClient();
  const { start, end } = getMonthBoundsInTimeZone(timeZone, reference);

  const { count, error } = await activeLeadCountQuery(supabase, companyId)
    .eq("status", "lost")
    .gte("lost_at", start)
    .lte("lost_at", end);

  if (error) {
    console.error("[countLeadsLostThisMonth] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

export async function countLeadsNeedingFollowUp(
  companyId: string,
  options?: { reference?: Date; timeZone?: string },
): Promise<number> {
  const supabase = await createClient();
  const reference = options?.reference ?? new Date();
  const followUpDueCutoff = getLeadFollowUpDueCutoff(
    reference,
    options?.timeZone,
  );

  const { count, error } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .not("status", "in", '("won","lost")')
    .not("next_follow_up_at", "is", null)
    .lte("next_follow_up_at", followUpDueCutoff);

  if (error) {
    console.error("[countLeadsNeedingFollowUp] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

export async function listLeadAssignableMembers(
  companyId: string,
): Promise<LeadAssignableMember[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .select(
      `
      user_id,
      role,
      profile:profiles!company_memberships_user_id_fkey (
        id,
        full_name,
        email
      )
    `,
    )
    .eq("company_id", companyId)
    .eq("status", "active")
    .not("user_id", "is", null)
    .in("role", LEAD_MANAGER_ROLES);

  if (error) {
    console.error("[listLeadAssignableMembers] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? [])
    .map((row) => {
      const profile = row.profile as {
        id: string;
        full_name: string | null;
        email: string;
      } | null;

      if (!profile) {
        return null;
      }

      return {
        id: profile.id,
        name: profile.full_name?.trim() || profile.email,
      };
    })
    .filter((member): member is LeadAssignableMember => member !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function createLead(
  companyId: string,
  data: LeadFormData,
  createdBy: string,
): Promise<{ lead: Lead | null; error: string | null }> {
  const supabase = await createClient();
  const row: LeadInsert = {
    company_id: companyId,
    created_by: createdBy,
    ...mapLeadFormDataToRowFields(data),
    status: data.status || "new",
  };

  const { data: inserted, error } = await supabase
    .from("leads")
    .insert(row)
    .select(
      `
      *,
      assigned_user:profiles!leads_assigned_user_id_fkey (
        id,
        full_name,
        email
      ),
      created_by_profile:profiles!leads_created_by_fkey (
        id,
        full_name,
        email
      )
    `,
    )
    .single();

  if (error || !inserted) {
    return {
      lead: null,
      error: mapDatabaseError(error),
    };
  }

  const [lead] = await attachLatestActivity(companyId, [
    inserted as LeadRowWithRelations,
  ]);

  return { lead: lead ?? null, error: null };
}

export async function updateLead(
  companyId: string,
  leadId: string,
  data: Partial<LeadFormData> & {
    lastContactedAt?: string | null;
    nextFollowUpAt?: string | null;
    convertedCustomerId?: string | null;
    wonAt?: string | null;
    lostAt?: string | null;
    lostReason?: string | null;
    status?: Lead["status"];
  },
): Promise<{ lead: Lead | null; error: string | null }> {
  const supabase = await createClient();
  const update: LeadUpdate = {};

  if (data.firstName !== undefined) update.first_name = data.firstName.trim();
  if (data.lastName !== undefined) update.last_name = data.lastName.trim();
  if (data.companyName !== undefined) {
    update.company_name = data.companyName.trim() || null;
  }
  if (data.email !== undefined) update.email = data.email.trim();
  if (data.phone !== undefined) update.phone = data.phone.trim();
  if (data.source !== undefined) update.source = data.source;
  if (data.status !== undefined) update.status = data.status;
  if (data.notes !== undefined) update.notes = data.notes.trim() || null;
  if (data.assignedUserId !== undefined) {
    update.assigned_user_id = data.assignedUserId.trim() || null;
  }
  if (data.nextFollowUpAt !== undefined) {
    update.next_follow_up_at = data.nextFollowUpAt.trim()
      ? `${data.nextFollowUpAt.trim()}T12:00:00.000Z`
      : null;
  }
  if (data.lastContactedAt !== undefined) {
    update.last_contacted_at = data.lastContactedAt;
  }
  if (data.nextFollowUpAt === null) {
    update.next_follow_up_at = null;
  }
  if (data.convertedCustomerId !== undefined) {
    update.converted_customer_id = data.convertedCustomerId;
  }
  if (data.wonAt !== undefined) update.won_at = data.wonAt;
  if (data.lostAt !== undefined) update.lost_at = data.lostAt;
  if (data.lostReason !== undefined) {
    update.lost_reason = data.lostReason?.trim() || null;
  }

  const { data: updated, error } = await supabase
    .from("leads")
    .update(update)
    .eq("company_id", companyId)
    .eq("id", leadId)
    .select(
      `
      *,
      assigned_user:profiles!leads_assigned_user_id_fkey (
        id,
        full_name,
        email
      ),
      created_by_profile:profiles!leads_created_by_fkey (
        id,
        full_name,
        email
      )
    `,
    )
    .single();

  if (error || !updated) {
    return {
      lead: null,
      error: mapDatabaseError(error),
    };
  }

  const [lead] = await attachLatestActivity(companyId, [
    updated as LeadRowWithRelations,
  ]);

  return { lead: lead ?? null, error: null };
}
