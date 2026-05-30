import { isAlphaHiddenAdminNavHref } from "@/lib/beta/alpha-hardening";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import type { CompanyRole } from "@/lib/database/types/enums";
import { hasCompanyRole } from "@/lib/database/types/roles";

export type CompanyAccessScope = {
  canViewBilling: boolean;
  canViewOperationalReports: boolean;
  canViewAllJobs: boolean;
  canViewAssignedJobs: boolean;
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
    canViewAssignedJobs: permissions.viewAssignedJobs,
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

export function canViewTechnicianRoster(context: ActiveCompanyContext): boolean {
  return getCompanyAccessScope(context).canViewTechnicianRoster;
}

export function assertMatchingCompanyScope(
  context: ActiveCompanyContext,
  companyId: string,
): string | null {
  if (context.company.id !== companyId) {
    return "Company workspace mismatch.";
  }

  return null;
}

export function assertTeamRosterReadAccess(
  context: ActiveCompanyContext,
  companyId: string,
): string | null {
  const scopeError = assertMatchingCompanyScope(context, companyId);
  if (scopeError) {
    return scopeError;
  }

  if (!canManageTeamMembers(context)) {
    return "You do not have permission to view the team roster.";
  }

  return null;
}

export function assertTechnicianRosterReadAccess(
  context: ActiveCompanyContext,
  companyId: string,
): string | null {
  const scopeError = assertMatchingCompanyScope(context, companyId);
  if (scopeError) {
    return scopeError;
  }

  if (!canViewTechnicianRoster(context)) {
    return "You do not have permission to view the technician roster.";
  }

  return null;
}

export function canAccessCompanySettings(
  context: ActiveCompanyContext,
): boolean {
  return canAccessAdminNavItem(context, "/settings");
}

export function assertCompanySettingsAccess(
  context: ActiveCompanyContext,
): string | null {
  if (!canAccessCompanySettings(context)) {
    return "You do not have permission to access company settings.";
  }

  return null;
}

const DEMO_DATA_MANAGER_ROLES = ["owner", "admin"] as const satisfies readonly CompanyRole[];

export function canManageDemoData(context: ActiveCompanyContext): boolean {
  return (
    context.membership.status === "active" &&
    context.membership.company_id === context.company.id &&
    hasCompanyRole(context.role, DEMO_DATA_MANAGER_ROLES)
  );
}

export function assertDemoDataManagementAccess(
  context: ActiveCompanyContext,
  companyId?: string,
  action: "seed" | "clear" = "seed",
): string | null {
  if (companyId) {
    const scopeError = assertMatchingCompanyScope(context, companyId);
    if (scopeError) {
      return scopeError;
    }
  }

  if (context.membership.status !== "active") {
    return "Your company membership is not active.";
  }

  if (context.membership.company_id !== context.company.id) {
    return "Company workspace mismatch.";
  }

  if (!hasCompanyRole(context.role, DEMO_DATA_MANAGER_ROLES)) {
    return action === "clear"
      ? "Only company owners and admins can clear demo data."
      : "Only company owners and admins can load demo data.";
  }

  return null;
}

export function assertTeamManagementAccess(
  context: ActiveCompanyContext,
  companyId: string,
): string | null {
  const settingsError = assertCompanySettingsAccess(context);
  if (settingsError) {
    return settingsError;
  }

  const scopeError = assertMatchingCompanyScope(context, companyId);
  if (scopeError) {
    return scopeError;
  }

  if (!canManageTeamMembers(context)) {
    return "You do not have permission to manage team members.";
  }

  return null;
}

export function canAccessSystemCheck(context: ActiveCompanyContext): boolean {
  return hasCompanyRole(context.role, ["owner"]);
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

export function canAccessOperationalJobsArea(
  context: ActiveCompanyContext,
): boolean {
  const access = getCompanyAccessScope(context);
  return access.canViewAllJobs || context.permissions.viewAssignedJobs;
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

export function canUpdateJobWorkflowStatus(
  permissions: ActiveCompanyContext["permissions"],
  userId: string,
  job: { assignedTechnicianId?: string | null },
): boolean {
  if (permissions.dispatchJobs) {
    return true;
  }

  if (!permissions.viewAssignedJobs) {
    return false;
  }

  return job.assignedTechnicianId === userId;
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

export function canCreateFieldEstimate(
  context: ActiveCompanyContext,
  job: {
    customerId?: string | null;
    assignedTechnicianId?: string | null;
  },
): boolean {
  if (!job.customerId?.trim()) {
    return false;
  }

  if (context.permissions.manageBilling) {
    return true;
  }

  if (!context.permissions.createFieldEstimates) {
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
  | "/time-clock"
  | "/network"
  | "/reports"
  | "/alpha-tracker"
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
  "/time-clock",
  "/network",
  "/reports",
  "/alpha-tracker",
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

  switch (href) {
    case "/":
      return true;
    case "/dispatch":
    case "/jobs":
      return canAccessOperationalJobsArea(context);
    case "/customers":
      return access.canManageCustomers;
    case "/estimates":
    case "/price-book":
    case "/invoices":
      return access.canViewBilling;
    case "/expenses":
      return true;
    case "/time-clock":
      return canViewCompanyTimeEntries(context);
    case "/network":
      return permissions.dispatchJobs || permissions.manageCompany;
    case "/reports":
      return access.canViewOperationalReports;
    case "/alpha-tracker":
      return permissions.manageCompany;
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
    "/time-clock",
    "/network",
    "/reports",
    "/alpha-tracker",
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

export function canAccessAppRedirectPath(
  context: ActiveCompanyContext,
  path: string,
): boolean {
  if (
    path === "/" ||
    path.startsWith("/technician") ||
    path.startsWith("/tech/") ||
    path.startsWith("/setup") ||
    path.startsWith("/expenses") ||
    path.startsWith("/time")
  ) {
    return true;
  }

  if (path.startsWith("/time-clock")) {
    return canViewCompanyTimeEntries(context);
  }

  if (path.startsWith("/settings")) {
    if (
      path === "/settings/system-check" ||
      path.startsWith("/settings/system-check/")
    ) {
      return (
        canAccessCompanySettings(context) && canAccessSystemCheck(context)
      );
    }

    return canAccessCompanySettings(context);
  }

  if (path.startsWith("/dispatch") || path.startsWith("/jobs")) {
    return canAccessOperationalJobsArea(context);
  }

  if (path.startsWith("/customers")) {
    return context.permissions.manageCustomers;
  }

  if (
    path.startsWith("/estimates") ||
    path.startsWith("/price-book") ||
    path.startsWith("/invoices")
  ) {
    return canViewBilling(context);
  }

  if (path.startsWith("/reports")) {
    return canViewOperationalReports(context);
  }

  if (path.startsWith("/network")) {
    return (
      context.permissions.dispatchJobs || context.permissions.manageCompany
    );
  }

  if (path.startsWith("/alpha-tracker")) {
    return context.permissions.manageCompany;
  }

  return false;
}
