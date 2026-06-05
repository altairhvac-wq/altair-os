import type { CompanyRole, MembershipStatus } from "@/lib/database/types/enums";
import type { MembershipWithProfile } from "@/lib/database/types/core-tables";
import {
  mapMembershipToTeamMember,
  type TeamMember,
} from "@/shared/types/team-member";
import { normalizeTechnicianSpecialties } from "@/shared/types/technician-specialties";

export type TeamMemberProfile = TeamMember & {
  phone: string | null;
  avatarUrl: string | null;
  laborCostRateCents: number | null;
  memberNotes: string | null;
  availableForDispatch: boolean;
  emergencyOnCall: boolean;
  certifications: string[];
};

export type TeamMemberActivityItem = {
  id: string;
  type: "assigned_job" | "completed_job" | "estimate" | "time_entry";
  label: string;
  detail?: string;
  href?: string;
  occurredAt: string;
};

export type TeamMemberWorkSummary = {
  periodLabel: string;
  jobsCompleted: number;
  revenue: number;
  laborHours: number;
  laborCost: number | null;
  grossProfit: number | null;
  margin: number | null;
  profitAvailable: boolean;
};

export function formatProfileMembershipStatus(status: MembershipStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "invited":
      return "Pending Invite";
    case "suspended":
      return "Inactive";
    default:
      return status;
  }
}

export function normalizeCertificationsFromInput(
  values: string[] | null | undefined,
): string[] {
  return normalizeCertifications(values);
}

function normalizeCertifications(values: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values ?? []) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized;
}

export function mapMembershipToTeamMemberProfile(
  membership: Pick<
    MembershipWithProfile,
    | "id"
    | "user_id"
    | "role"
    | "status"
    | "joined_at"
    | "created_at"
    | "reports_to_member_id"
    | "technician_specialties"
    | "labor_cost_rate_cents"
    | "member_notes"
    | "available_for_dispatch"
    | "emergency_on_call"
    | "certifications"
  > & {
    profile:
      | Pick<
          MembershipWithProfile["profile"],
          "email" | "full_name" | "phone" | "avatar_url"
        >
      | null;
    invite_email?: string | null;
  },
  options?: { includeLaborCostRate?: boolean },
): TeamMemberProfile | null {
  const base = mapMembershipToTeamMember(membership);
  if (!base) {
    return null;
  }

  const includeLaborCostRate = options?.includeLaborCostRate ?? false;

  return {
    ...base,
    phone: membership.profile?.phone?.trim() || null,
    avatarUrl: membership.profile?.avatar_url?.trim() || null,
    laborCostRateCents: includeLaborCostRate
      ? membership.labor_cost_rate_cents
      : null,
    memberNotes: membership.member_notes?.trim() || null,
    availableForDispatch: membership.available_for_dispatch ?? true,
    emergencyOnCall: membership.emergency_on_call ?? false,
    certifications: normalizeCertifications(membership.certifications),
  };
}

export function formatLaborCostRate(cents: number | null): string {
  if (cents == null || cents < 0) {
    return "";
  }

  const dollars = cents / 100;
  return dollars % 1 === 0 ? String(dollars) : dollars.toFixed(2);
}

export function parseLaborCostRateInput(
  value: string,
): { cents: number | null } | { error: string } {
  const trimmed = value.trim();

  if (!trimmed) {
    return { cents: null };
  }

  const parsed = Number(trimmed.replace(/[$,\s]/g, ""));

  if (!Number.isFinite(parsed) || parsed < 0) {
    return { error: "Enter a valid hourly rate (0 or greater)." };
  }

  return { cents: Math.round(parsed * 100) };
}
