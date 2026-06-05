import type {
  ActiveCompanyContext,
  CompanyMembershipRow,
} from "@/lib/database/types/core-tables";
import { assertMatchingCompanyScope } from "@/lib/database/access-control";

type TeamMemberProfileSubject = {
  membershipId: string;
  userId: string | null;
  companyId: string;
};

type ProfileFieldEditTarget = Pick<
  CompanyMembershipRow,
  "status" | "user_id"
>;

export function canViewTeamMemberProfiles(
  context: ActiveCompanyContext,
): boolean {
  const permissions = context.permissions;

  return (
    permissions.manageUsers ||
    permissions.manageCustomers ||
    permissions.dispatchJobs
  );
}

export function canViewTeamMemberProfile(
  context: ActiveCompanyContext,
  subject: TeamMemberProfileSubject,
): boolean {
  const scopeError = assertMatchingCompanyScope(context, subject.companyId);
  if (scopeError) {
    return false;
  }

  if (subject.userId && subject.userId === context.user.id) {
    return true;
  }

  return canViewTeamMemberProfiles(context);
}

export function canEditTeamMemberProfile(
  context: ActiveCompanyContext,
  subject: TeamMemberProfileSubject,
): boolean {
  const scopeError = assertMatchingCompanyScope(context, subject.companyId);
  if (scopeError) {
    return false;
  }

  return context.permissions.manageUsers;
}

export function canViewMemberProfitabilitySettings(
  context: ActiveCompanyContext,
): boolean {
  return (
    context.permissions.manageCompany || context.permissions.manageBilling
  );
}

export function canEditMemberProfitabilitySettings(
  context: ActiveCompanyContext,
): boolean {
  return context.permissions.manageCompany;
}

export function canViewMemberWorkSummary(
  context: ActiveCompanyContext,
): boolean {
  const permissions = context.permissions;

  return (
    permissions.manageCompany ||
    permissions.manageBilling ||
    permissions.dispatchJobs
  );
}

export function canViewMemberNotes(context: ActiveCompanyContext): boolean {
  return context.permissions.manageUsers;
}

export function validateProfileFieldEditTarget(
  member: ProfileFieldEditTarget,
): string | null {
  if (member.status === "invited" && !member.user_id) {
    return "Pending invitations cannot be edited.";
  }

  if (member.status === "suspended") {
    return "Inactive members cannot be edited.";
  }

  if (member.status !== "active") {
    return "Only active members can be edited.";
  }

  return null;
}

export function assertTeamMemberProfileReadAccess(
  context: ActiveCompanyContext,
  subject: TeamMemberProfileSubject,
): string | null {
  const scopeError = assertMatchingCompanyScope(context, subject.companyId);
  if (scopeError) {
    return scopeError;
  }

  if (!canViewTeamMemberProfile(context, subject)) {
    return "You do not have permission to view this team member profile.";
  }

  return null;
}

export function assertTeamMemberProfileEditAccess(
  context: ActiveCompanyContext,
  subject: TeamMemberProfileSubject,
): string | null {
  const readError = assertTeamMemberProfileReadAccess(context, subject);
  if (readError) {
    return readError;
  }

  if (!canEditTeamMemberProfile(context, subject)) {
    return "You do not have permission to edit this team member profile.";
  }

  return null;
}
