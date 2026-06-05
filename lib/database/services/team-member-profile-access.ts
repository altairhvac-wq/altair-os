import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import { assertMatchingCompanyScope } from "@/lib/database/access-control";

type TeamMemberProfileSubject = {
  membershipId: string;
  userId: string | null;
  companyId: string;
};

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
