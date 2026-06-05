import { createClient } from "@/lib/supabase/server";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import { mapDatabaseError } from "@/lib/database/errors";
import { listEstimates } from "@/lib/database/queries/estimates";
import { listInvoicePayments } from "@/lib/database/queries/invoice-payments";
import { listInvoices } from "@/lib/database/queries/invoices";
import { listJobs } from "@/lib/database/queries/jobs";
import { listCompanyJobLaborEntries } from "@/lib/database/queries/time-entries";
import {
  assertTeamMemberProfileEditAccess,
  assertTeamMemberProfileReadAccess,
  canEditMemberProfitabilitySettings,
  canEditTeamMemberProfile,
  canViewMemberNotes,
  canViewMemberProfitabilitySettings,
  canViewMemberWorkSummary,
  validateProfileFieldEditTarget,
} from "@/lib/database/services/team-member-profile-access";
import { canActorEditMemberSpecialties } from "@/lib/database/services/member-role-guard";
import { hasCompanyPermission } from "@/lib/database/types/roles";
import type { CompanyMembershipRow } from "@/lib/database/types/core-tables";
import {
  buildMemberWorkSummary,
  type MemberWorkSummary,
} from "@/shared/lib/reports/report-metrics";
import {
  resolveProfitabilityReportDateBounds,
} from "@/shared/types/reports";
import type { ReportsPageDateRange } from "@/shared/types/reports-page";
import {
  mapMembershipToTeamMemberProfile,
  normalizeCertificationsFromInput,
  type TeamMemberActivityItem,
  type TeamMemberProfile,
  type TeamMemberWorkSummary,
} from "@/shared/types/team-member-profile";
import { formatJobStatus } from "@/shared/types/job";
import { formatEstimateStatus } from "@/shared/types/estimate";
import { listTimeEntries } from "@/lib/database/queries/time-entries";

type MembershipProfileRow = {
  id: string;
  user_id: string | null;
  role: CompanyMembershipRow["role"];
  status: CompanyMembershipRow["status"];
  invite_email: string | null;
  invited_by: string | null;
  invited_at: string | null;
  joined_at: string | null;
  reports_to_member_id: string | null;
  technician_specialties: string[];
  labor_cost_rate_cents: number | null;
  member_notes: string | null;
  available_for_dispatch: boolean;
  emergency_on_call: boolean;
  certifications: string[];
  created_at: string;
  updated_at: string;
  company_id: string;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
};

const TEAM_MEMBER_PROFILE_SELECT =
  "id, user_id, role, status, invite_email, invited_by, invited_at, joined_at, reports_to_member_id, technician_specialties, labor_cost_rate_cents, member_notes, available_for_dispatch, emergency_on_call, certifications, created_at, updated_at, company_id, profile:profiles!company_memberships_user_id_fkey(id, email, full_name, phone, avatar_url)";

type MemberRoleActor = {
  userId: string;
  role: CompanyMembershipRow["role"];
};

function assertTeamManagementActor(actor: MemberRoleActor): string | null {
  if (!hasCompanyPermission(actor.role, "manageUsers")) {
    return "You do not have permission to manage team members.";
  }

  return null;
}

async function fetchMembershipProfileRow(
  companyId: string,
  membershipId: string,
): Promise<MembershipProfileRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .select(TEAM_MEMBER_PROFILE_SELECT)
    .eq("company_id", companyId)
    .eq("id", membershipId)
    .maybeSingle();

  if (error) {
    console.error("[fetchMembershipProfileRow] query failed:", {
      companyId,
      membershipId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return (data as MembershipProfileRow | null) ?? null;
}

async function listTechnicianLaborCostRates(
  companyId: string,
): Promise<Map<string, number>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .select("user_id, labor_cost_rate_cents")
    .eq("company_id", companyId)
    .eq("status", "active")
    .not("user_id", "is", null);

  if (error) {
    console.error("[listTechnicianLaborCostRates] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return new Map();
  }

  const rates = new Map<string, number>();

  for (const row of data ?? []) {
    if (
      row.user_id &&
      row.labor_cost_rate_cents != null &&
      row.labor_cost_rate_cents >= 0
    ) {
      rates.set(row.user_id, row.labor_cost_rate_cents / 100);
    }
  }

  return rates;
}

function mapWorkSummary(
  summary: MemberWorkSummary,
  periodLabel: string,
  options?: { includeProfitability?: boolean },
): TeamMemberWorkSummary {
  const includeProfitability = options?.includeProfitability ?? false;

  return {
    periodLabel,
    jobsCompleted: summary.jobsCompleted,
    revenue: summary.revenue,
    laborHours: summary.laborHours,
    laborCost: includeProfitability ? summary.laborCost : null,
    grossProfit: includeProfitability ? summary.grossProfit : null,
    margin: includeProfitability ? summary.margin : null,
    profitAvailable: includeProfitability ? summary.profitAvailable : false,
  };
}

function createPendingInviteWorkSummary(
  periodLabel: string,
): TeamMemberWorkSummary {
  return {
    periodLabel,
    jobsCompleted: 0,
    revenue: 0,
    laborHours: 0,
    laborCost: null,
    grossProfit: null,
    margin: null,
    profitAvailable: false,
  };
}

async function buildTeamMemberActivity(
  companyId: string,
  userId: string,
): Promise<TeamMemberActivityItem[]> {
  const [jobs, estimates, laborEntries] = await Promise.all([
    listJobs(companyId, { assignedTechnicianId: userId }),
    listEstimates(companyId),
    listTimeEntries(companyId, {
      technicianId: userId,
      limit: 20,
    }),
  ]);

  const jobIds = new Set(jobs.map((job) => job.id));
  const items: TeamMemberActivityItem[] = [];

  for (const job of jobs.slice(0, 20)) {
    items.push({
      id: `assigned-${job.id}`,
      type: "assigned_job",
      label: job.jobNumber,
      detail: `${formatJobStatus(job.status)} · ${job.customerName}`,
      href: `/jobs/${job.id}`,
      occurredAt: job.scheduledDate,
    });
  }

  for (const job of jobs.filter((item) => item.status === "completed").slice(0, 20)) {
    items.push({
      id: `completed-${job.id}`,
      type: "completed_job",
      label: job.jobNumber,
      detail: `Completed · ${job.customerName}`,
      href: `/jobs/${job.id}`,
      occurredAt: job.completedAt ?? job.scheduledDate,
    });
  }

  for (const estimate of estimates) {
    if (!estimate.jobId || !jobIds.has(estimate.jobId)) {
      continue;
    }

    items.push({
      id: `estimate-${estimate.id}`,
      type: "estimate",
      label: estimate.estimateNumber,
      detail: `${formatEstimateStatus(estimate.status)} · ${estimate.customerName}`,
      href: `/estimates/${estimate.id}`,
      occurredAt: estimate.createdAt,
    });
  }

  for (const entry of laborEntries) {
    items.push({
      id: `time-${entry.id}`,
      type: "time_entry",
      label: entry.jobNumber ?? "Time entry",
      detail: `${entry.durationMinutes ?? 0} min labor`,
      href: entry.jobId ? `/jobs/${entry.jobId}` : undefined,
      occurredAt: entry.startedAt,
    });
  }

  return items
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime(),
    )
    .slice(0, 20);
}

export type TeamMemberProfilePageData = {
  profile: TeamMemberProfile;
  workSummary: TeamMemberWorkSummary | null;
  activity: TeamMemberActivityItem[];
  canEdit: boolean;
  canEditSpecialties: boolean;
  canViewNotes: boolean;
  canViewProfitability: boolean;
  canEditProfitability: boolean;
  canViewWorkSummary: boolean;
};

export async function getTeamMemberProfilePageData(
  companyId: string,
  membershipId: string,
  context: ActiveCompanyContext,
  options?: { workSummaryRange?: ReportsPageDateRange },
): Promise<TeamMemberProfilePageData | null> {
  const row = await fetchMembershipProfileRow(companyId, membershipId);
  if (!row) {
    return null;
  }

  const subject = {
    membershipId: row.id,
    userId: row.user_id,
    companyId,
  };

  const accessError = assertTeamMemberProfileReadAccess(context, subject);
  if (accessError) {
    return null;
  }

  const canViewProfitability = canViewMemberProfitabilitySettings(context);
  const canEditProfitability = canEditMemberProfitabilitySettings(context);
  const canEdit = canEditTeamMemberProfile(context, subject);
  const canViewNotes = canViewMemberNotes(context);
  const canViewWorkSummary = canViewMemberWorkSummary(context);
  const canEditSpecialties =
    canEdit &&
    canActorEditMemberSpecialties(context.role, context.user.id, {
      role: row.role,
      user_id: row.user_id,
      status: row.status,
    });

  const profile = mapMembershipToTeamMemberProfile(row, {
    includeLaborCostRate: canViewProfitability,
    includeMemberNotes: canViewNotes,
  });

  if (!profile) {
    return null;
  }

  const workSummaryRange = options?.workSummaryRange ?? "30d";
  const periodLabel =
    workSummaryRange === "ytd"
      ? "Year to date"
      : workSummaryRange === "7d"
        ? "Last 7 days"
        : workSummaryRange === "90d"
          ? "Last 90 days"
          : "Last 30 days";

  let workSummary: TeamMemberWorkSummary | null = null;
  if (canViewWorkSummary) {
    if (profile.userId) {
      workSummary = await buildWorkSummaryForTechnician(
        companyId,
        profile.userId,
        workSummaryRange,
        canViewProfitability,
      );
    } else if (profile.status === "invited") {
      workSummary = createPendingInviteWorkSummary(periodLabel);
    }
  }

  const activity = profile.userId
    ? await buildTeamMemberActivity(companyId, profile.userId)
    : [];

  return {
    profile,
    workSummary,
    activity,
    canEdit,
    canEditSpecialties,
    canViewNotes,
    canViewProfitability,
    canEditProfitability,
    canViewWorkSummary,
  };
}

async function buildWorkSummaryForTechnician(
  companyId: string,
  technicianId: string,
  dateRange: ReportsPageDateRange,
  includeProfitability: boolean,
): Promise<TeamMemberWorkSummary> {
  const dateBounds = resolveProfitabilityReportDateBounds(dateRange);
  const periodLabel =
    dateRange === "ytd"
      ? "Year to date"
      : dateRange === "7d"
        ? "Last 7 days"
        : dateRange === "90d"
          ? "Last 90 days"
          : "Last 30 days";

  const [jobs, payments, invoices, laborEntries, laborCostRates] =
    await Promise.all([
      listJobs(companyId, { assignedTechnicianId: technicianId }),
      listInvoicePayments(companyId),
      listInvoices(companyId),
      listCompanyJobLaborEntries(companyId),
      includeProfitability
        ? listTechnicianLaborCostRates(companyId)
        : Promise.resolve(new Map<string, number>()),
    ]);

  const summary = buildMemberWorkSummary(
    technicianId,
    { jobs, payments, invoices, laborEntries, laborCostRates },
    dateBounds,
  );

  return mapWorkSummary(summary, periodLabel, { includeProfitability });
}

export type UpdateMemberLaborCostRateResult = {
  profile?: TeamMemberProfile;
  error?: string;
};

export async function updateMemberLaborCostRate(
  companyId: string,
  membershipId: string,
  laborCostRateCents: number | null,
  actor: MemberRoleActor,
  context: ActiveCompanyContext,
): Promise<UpdateMemberLaborCostRateResult> {
  const actorError = assertTeamManagementActor(actor);
  if (actorError) {
    return { error: actorError };
  }

  if (!canEditMemberProfitabilitySettings(context)) {
    return { error: "You do not have permission to edit profitability settings." };
  }

  const row = await fetchMembershipProfileRow(companyId, membershipId);
  if (!row) {
    return { error: "Team member not found in this company." };
  }

  const editError = assertTeamMemberProfileEditAccess(context, {
    membershipId: row.id,
    userId: row.user_id,
    companyId,
  });
  if (editError) {
    return { error: editError };
  }

  const targetError = validateProfileFieldEditTarget(row);
  if (targetError) {
    return { error: targetError };
  }

  if (laborCostRateCents != null && laborCostRateCents < 0) {
    return { error: "Labor cost rate must be zero or greater." };
  }

  const includeLaborCostRate = canViewMemberProfitabilitySettings(context);

  if (row.labor_cost_rate_cents === laborCostRateCents) {
    const profile = mapMembershipToTeamMemberProfile(row, {
      includeLaborCostRate,
      includeMemberNotes: canViewMemberNotes(context),
    });
    return profile ? { profile } : { error: "Team member not found." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .update({ labor_cost_rate_cents: laborCostRateCents })
    .eq("company_id", companyId)
    .eq("id", membershipId)
    .select(TEAM_MEMBER_PROFILE_SELECT)
    .single();

  if (error) {
    console.error("[updateMemberLaborCostRate] update failed:", {
      companyId,
      membershipId,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  const profile = mapMembershipToTeamMemberProfile(data as MembershipProfileRow, {
    includeLaborCostRate: includeLaborCostRate,
    includeMemberNotes: canViewMemberNotes(context),
  });

  return profile ? { profile } : { error: "Updated membership could not be loaded." };
}

export type UpdateMemberProfileFieldsResult = {
  profile?: TeamMemberProfile;
  error?: string;
};

export async function updateMemberNotes(
  companyId: string,
  membershipId: string,
  notes: string | null,
  actor: MemberRoleActor,
  context: ActiveCompanyContext,
): Promise<UpdateMemberProfileFieldsResult> {
  const actorError = assertTeamManagementActor(actor);
  if (actorError) {
    return { error: actorError };
  }

  const row = await fetchMembershipProfileRow(companyId, membershipId);
  if (!row) {
    return { error: "Team member not found in this company." };
  }

  const editError = assertTeamMemberProfileEditAccess(context, {
    membershipId: row.id,
    userId: row.user_id,
    companyId,
  });
  if (editError) {
    return { error: editError };
  }

  const targetError = validateProfileFieldEditTarget(row);
  if (targetError) {
    return { error: targetError };
  }

  const normalizedNotes = notes?.trim() || null;

  if (normalizedNotes && normalizedNotes.length > 2000) {
    return { error: "Notes must be 2,000 characters or fewer." };
  }

  if (row.member_notes === normalizedNotes) {
    const profile = mapMembershipToTeamMemberProfile(row, {
      includeLaborCostRate: canViewMemberProfitabilitySettings(context),
      includeMemberNotes: canViewMemberNotes(context),
    });
    return profile ? { profile } : { error: "Team member not found." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .update({ member_notes: normalizedNotes })
    .eq("company_id", companyId)
    .eq("id", membershipId)
    .select(TEAM_MEMBER_PROFILE_SELECT)
    .single();

  if (error) {
    console.error("[updateMemberNotes] update failed:", {
      companyId,
      membershipId,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  const profile = mapMembershipToTeamMemberProfile(data as MembershipProfileRow, {
    includeLaborCostRate: canViewMemberProfitabilitySettings(context),
    includeMemberNotes: canViewMemberNotes(context),
  });

  return profile ? { profile } : { error: "Updated membership could not be loaded." };
}

export async function updateMemberAvailability(
  companyId: string,
  membershipId: string,
  input: {
    availableForDispatch: boolean;
    emergencyOnCall: boolean;
  },
  actor: MemberRoleActor,
  context: ActiveCompanyContext,
): Promise<UpdateMemberProfileFieldsResult> {
  const actorError = assertTeamManagementActor(actor);
  if (actorError) {
    return { error: actorError };
  }

  const row = await fetchMembershipProfileRow(companyId, membershipId);
  if (!row) {
    return { error: "Team member not found in this company." };
  }

  const editError = assertTeamMemberProfileEditAccess(context, {
    membershipId: row.id,
    userId: row.user_id,
    companyId,
  });
  if (editError) {
    return { error: editError };
  }

  const targetError = validateProfileFieldEditTarget(row);
  if (targetError) {
    return { error: targetError };
  }

  if (
    row.available_for_dispatch === input.availableForDispatch &&
    row.emergency_on_call === input.emergencyOnCall
  ) {
    const profile = mapMembershipToTeamMemberProfile(row, {
      includeLaborCostRate: canViewMemberProfitabilitySettings(context),
      includeMemberNotes: canViewMemberNotes(context),
    });
    return profile ? { profile } : { error: "Team member not found." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .update({
      available_for_dispatch: input.availableForDispatch,
      emergency_on_call: input.emergencyOnCall,
    })
    .eq("company_id", companyId)
    .eq("id", membershipId)
    .select(TEAM_MEMBER_PROFILE_SELECT)
    .single();

  if (error) {
    console.error("[updateMemberAvailability] update failed:", {
      companyId,
      membershipId,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  const profile = mapMembershipToTeamMemberProfile(data as MembershipProfileRow, {
    includeLaborCostRate: canViewMemberProfitabilitySettings(context),
    includeMemberNotes: canViewMemberNotes(context),
  });

  return profile ? { profile } : { error: "Updated membership could not be loaded." };
}

export async function updateMemberCertifications(
  companyId: string,
  membershipId: string,
  certifications: string[],
  actor: MemberRoleActor,
  context: ActiveCompanyContext,
): Promise<UpdateMemberProfileFieldsResult> {
  const actorError = assertTeamManagementActor(actor);
  if (actorError) {
    return { error: actorError };
  }

  const row = await fetchMembershipProfileRow(companyId, membershipId);
  if (!row) {
    return { error: "Team member not found in this company." };
  }

  const editError = assertTeamMemberProfileEditAccess(context, {
    membershipId: row.id,
    userId: row.user_id,
    companyId,
  });
  if (editError) {
    return { error: editError };
  }

  const targetError = validateProfileFieldEditTarget(row);
  if (targetError) {
    return { error: targetError };
  }

  const normalizedCertifications = normalizeCertificationsFromInput(certifications);

  if (normalizedCertifications.length > 50) {
    return { error: "A member can have at most 50 certifications." };
  }

  if (normalizedCertifications.some((value) => value.length > 100)) {
    return { error: "Each certification must be 100 characters or fewer." };
  }

  const current = row.certifications ?? [];
  if (
    current.length === normalizedCertifications.length &&
    current.every((value, index) => value === normalizedCertifications[index])
  ) {
    const profile = mapMembershipToTeamMemberProfile(row, {
      includeLaborCostRate: canViewMemberProfitabilitySettings(context),
      includeMemberNotes: canViewMemberNotes(context),
    });
    return profile ? { profile } : { error: "Team member not found." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .update({ certifications: normalizedCertifications })
    .eq("company_id", companyId)
    .eq("id", membershipId)
    .select(TEAM_MEMBER_PROFILE_SELECT)
    .single();

  if (error) {
    console.error("[updateMemberCertifications] update failed:", {
      companyId,
      membershipId,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  const profile = mapMembershipToTeamMemberProfile(data as MembershipProfileRow, {
    includeLaborCostRate: canViewMemberProfitabilitySettings(context),
    includeMemberNotes: canViewMemberNotes(context),
  });

  return profile ? { profile } : { error: "Updated membership could not be loaded." };
}
