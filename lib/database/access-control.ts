import { isAlphaHiddenAdminNavHref } from "@/lib/beta/alpha-hardening";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";

export type CompanyAccessScope = {
  canViewBilling: boolean;
  canViewOperationalReports: boolean;
  canViewAllJobs: boolean;
  canViewCompanyExpenses: boolean;
  canViewTechnicianRoster: boolean;
  canManageCustomers: boolean;
  canManageTeamMembers: boolean;
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
    canManageTeamMembers: permissions.manageUsers,
  };
}

export function canManageTeamMembers(context: ActiveCompanyContext): boolean {
  return getCompanyAccessScope(context).canManageTeamMembers;
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

export type AdminNavHref =
  | "/"
  | "/dispatch"
  | "/customers"
  | "/jobs"
  | "/estimates"
  | "/price-book"
  | "/invoices"
  | "/expenses"
  | "/time"
  | "/network"
  | "/reports"
  | "/settings";

const ADMIN_NAV_HREF_SET = new Set<string>([
  "/",
  "/dispatch",
  "/customers",
  "/jobs",
  "/estimates",
  "/price-book",
  "/invoices",
  "/expenses",
  "/time",
  "/network",
  "/reports",
  "/settings",
]);

export function isAdminNavHref(href: string): href is AdminNavHref {
  return ADMIN_NAV_HREF_SET.has(href);
}

export function canAccessAdminNavItem(
  context: ActiveCompanyContext,
  href: AdminNavHref,
): boolean {
  const permissions = context.permissions;
  const access = getCompanyAccessScope(context);
  const canViewJobs =
    access.canViewAllJobs || permissions.viewAssignedJobs;

  switch (href) {
    case "/":
      return true;
    case "/dispatch":
      return canViewJobs;
    case "/customers":
      return access.canManageCustomers;
    case "/jobs":
      return canViewJobs;
    case "/estimates":
    case "/price-book":
    case "/invoices":
      return access.canViewBilling;
    case "/expenses":
      return true;
    case "/time":
      return canViewCompanyTimeEntries(context);
    case "/network":
      return permissions.dispatchJobs || permissions.manageCompany;
    case "/reports":
      return access.canViewOperationalReports;
    case "/settings":
      return permissions.manageCompany;
    default:
      return false;
  }
}

export function getAccessibleAdminNavHrefs(
  context: ActiveCompanyContext,
): AdminNavHref[] {
  const hrefs: AdminNavHref[] = [
    "/",
    "/dispatch",
    "/customers",
    "/jobs",
    "/estimates",
    "/price-book",
    "/invoices",
    "/expenses",
    "/time",
    "/network",
    "/reports",
    "/settings",
  ];

  const visible = hrefs.filter(
    (href) =>
      canAccessAdminNavItem(context, href) && !isAlphaHiddenAdminNavHref(href),
  );

  return visible.length > 0 ? visible : ["/"];
}

export type TechnicianNavId =
  | "today"
  | "jobs"
  | "time"
  | "receipts"
  | "notifications"
  | "profile";

export function canAccessTechnicianNavItem(
  context: ActiveCompanyContext,
  navId: TechnicianNavId,
): boolean {
  switch (navId) {
    case "today":
    case "time":
    case "receipts":
    case "notifications":
      return true;
    case "jobs":
      return context.permissions.viewAssignedJobs;
    case "profile":
      return false;
    default:
      return false;
  }
}
