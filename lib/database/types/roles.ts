import type { CompanyRole } from "./enums";

export const COMPANY_ROLE_LABELS: Record<CompanyRole, string> = {
  owner: "Owner",
  admin: "Admin",
  dispatcher: "Dispatcher",
  technician: "Technician",
  office_staff: "Office Staff",
  subcontractor: "Subcontractor",
  customer: "Customer",
};

const ROLE_RANK: Record<CompanyRole, number> = {
  owner: 100,
  admin: 80,
  dispatcher: 60,
  office_staff: 50,
  technician: 40,
  subcontractor: 30,
  customer: 10,
};

export const COMPANY_ROLE_PERMISSIONS = {
  manageCompany: ["owner", "admin"] as const satisfies readonly CompanyRole[],
  manageUsers: ["owner", "admin"] as const satisfies readonly CompanyRole[],
  dispatchJobs: [
    "owner",
    "admin",
    "dispatcher",
  ] as const satisfies readonly CompanyRole[],
  manageCustomers: [
    "owner",
    "admin",
    "dispatcher",
    "office_staff",
  ] as const satisfies readonly CompanyRole[],
  viewAssignedJobs: [
    "owner",
    "admin",
    "dispatcher",
    "technician",
  ] as const satisfies readonly CompanyRole[],
  manageBilling: [
    "owner",
    "admin",
    "office_staff",
  ] as const satisfies readonly CompanyRole[],
} as const;

export type CompanyPermission = keyof typeof COMPANY_ROLE_PERMISSIONS;

export function hasCompanyRole(
  role: CompanyRole,
  allowedRoles: readonly CompanyRole[],
): boolean {
  return allowedRoles.includes(role);
}

export function hasCompanyPermission(
  role: CompanyRole,
  permission: CompanyPermission,
): boolean {
  return hasCompanyRole(role, COMPANY_ROLE_PERMISSIONS[permission]);
}

export function compareCompanyRoles(
  role: CompanyRole,
  minimumRole: CompanyRole,
): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimumRole];
}
