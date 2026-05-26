import type { CompanyRole, MembershipStatus } from "@/lib/database/types/enums";
import type { MembershipWithProfile } from "@/lib/database/types/core-tables";
import { COMPANY_ROLE_LABELS } from "@/lib/database/types/roles";

export type TeamMember = {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  role: CompanyRole;
  status: MembershipStatus;
  joinedAt: string | null;
  createdAt: string;
};

export type CompanyProfileSummary = {
  id: string;
  name: string;
  status: string;
  timezone: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  memberCount: number;
  currentUserRole: CompanyRole;
};

export const MANAGEABLE_TEAM_ROLES = [
  "owner",
  "admin",
  "dispatcher",
  "technician",
  "office_staff",
  "subcontractor",
] as const satisfies readonly CompanyRole[];

export type ManageableTeamRole = (typeof MANAGEABLE_TEAM_ROLES)[number];

export function isManageableTeamRole(role: string): role is ManageableTeamRole {
  return (MANAGEABLE_TEAM_ROLES as readonly string[]).includes(role);
}

export const INVITABLE_TEAM_ROLES = [
  "owner",
  "admin",
  "dispatcher",
  "technician",
  "office_staff",
] as const satisfies readonly CompanyRole[];

export type InvitableTeamRole = (typeof INVITABLE_TEAM_ROLES)[number];

export function isInvitableTeamRole(role: string): role is InvitableTeamRole {
  return (INVITABLE_TEAM_ROLES as readonly string[]).includes(role);
}

export function formatMembershipStatus(status: MembershipStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "invited":
      return "Invited";
    case "suspended":
      return "Suspended";
    default:
      return status;
  }
}

export function formatCompanyStatus(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "trial":
      return "Trial";
    case "suspended":
      return "Suspended";
    default:
      return status;
  }
}

export function getTeamMemberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function mapMembershipToTeamMember(
  membership: Pick<
    MembershipWithProfile,
    | "id"
    | "user_id"
    | "role"
    | "status"
    | "joined_at"
    | "created_at"
  > & {
    profile: MembershipWithProfile["profile"] | null;
    invite_email?: string | null;
  },
): TeamMember | null {
  if (membership.profile) {
    const name =
      membership.profile.full_name?.trim() || membership.profile.email;

    return {
      id: membership.id,
      userId: membership.user_id,
      name,
      email: membership.profile.email,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joined_at,
      createdAt: membership.created_at,
    };
  }

  const inviteEmail = membership.invite_email?.trim();
  if (membership.status === "invited" && inviteEmail) {
    return {
      id: membership.id,
      userId: membership.user_id,
      name: inviteEmail,
      email: inviteEmail,
      role: membership.role,
      status: membership.status,
      joinedAt: membership.joined_at,
      createdAt: membership.created_at,
    };
  }

  return null;
}

export function formatTeamMemberRole(role: CompanyRole): string {
  return COMPANY_ROLE_LABELS[role] ?? role;
}
