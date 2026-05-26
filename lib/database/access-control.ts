import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";

export type CompanyAccessScope = {
  canViewBilling: boolean;
  canViewOperationalReports: boolean;
  canViewAllJobs: boolean;
  canViewCompanyExpenses: boolean;
  canViewTechnicianRoster: boolean;
  canManageCustomers: boolean;
};

export function getCompanyAccessScope(
  context: ActiveCompanyContext,
): CompanyAccessScope {
  const permissions = context.permissions;

  return {
    canViewBilling: permissions.manageBilling,
    canViewOperationalReports:
      permissions.manageBilling ||
      permissions.dispatchJobs ||
      permissions.manageCompany,
    canViewAllJobs:
      permissions.dispatchJobs ||
      permissions.manageCustomers ||
      permissions.manageBilling ||
      permissions.manageCompany,
    canViewCompanyExpenses:
      permissions.manageBilling || permissions.dispatchJobs,
    canViewTechnicianRoster:
      permissions.dispatchJobs || permissions.manageCompany,
    canManageCustomers: permissions.manageCustomers,
  };
}

export function canViewBilling(context: ActiveCompanyContext): boolean {
  return getCompanyAccessScope(context).canViewBilling;
}

export function canViewOperationalReports(
  context: ActiveCompanyContext,
): boolean {
  return getCompanyAccessScope(context).canViewOperationalReports;
}

export function canViewAllJobs(context: ActiveCompanyContext): boolean {
  return getCompanyAccessScope(context).canViewAllJobs;
}

export function canViewCompanyExpenses(context: ActiveCompanyContext): boolean {
  return getCompanyAccessScope(context).canViewCompanyExpenses;
}

export function canViewCompanyTimeEntries(
  context: ActiveCompanyContext,
): boolean {
  const permissions = context.permissions;

  return (
    permissions.manageBilling ||
    permissions.dispatchJobs ||
    permissions.manageCompany
  );
}

export function canViewJob(
  context: ActiveCompanyContext,
  job: { assignedTechnicianId?: string | null },
): boolean {
  if (canViewAllJobs(context)) {
    return true;
  }

  if (!context.permissions.viewAssignedJobs) {
    return false;
  }

  return job.assignedTechnicianId === context.user.id;
}

export function canViewJobFinancials(context: ActiveCompanyContext): boolean {
  const permissions = context.permissions;

  return (
    permissions.manageBilling ||
    permissions.dispatchJobs ||
    permissions.manageCompany
  );
}

export function canManageExpenseReceipt(
  context: ActiveCompanyContext,
  expense: { technicianId: string },
): boolean {
  if (
    context.permissions.manageBilling ||
    context.permissions.dispatchJobs
  ) {
    return true;
  }

  return expense.technicianId === context.user.id;
}
