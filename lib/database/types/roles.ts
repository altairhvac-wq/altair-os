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

const COMPANY_ROLES = new Set<string>(
  Object.keys(COMPANY_ROLE_LABELS) as CompanyRole[],
);

export function normalizeCompanyRole(
  role: string | null | undefined,
): CompanyRole | null {
  if (role == null) {
    return null;
  }

  const raw = String(role).trim().toLowerCase();
  const normalized = raw.includes(".") ? (raw.split(".").pop() ?? raw) : raw;

  return COMPANY_ROLES.has(normalized) ? (normalized as CompanyRole) : null;
}

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
    "subcontractor",
  ] as const satisfies readonly CompanyRole[],
  manageBilling: [
    "owner",
    "admin",
    "office_staff",
  ] as const satisfies readonly CompanyRole[],
  createFieldEstimates: [
    "technician",
    "subcontractor",
  ] as const satisfies readonly CompanyRole[],
  /**
   * Connecting, disconnecting and re-probing publishing integrations.
   *
   * Owner/admin only, matching the write policies migration 089 already put
   * on `marketing_connected_accounts` — the RLS and the permission agree, so
   * neither is the surprise. Deliberately NARROWER than `dispatchJobs`,
   * which grants the READ of connection status: a dispatcher should be able
   * to see that Facebook needs reconnecting without being able to hand a
   * third party a new grant on the company's behalf.
   */
  manageIntegrations: ["owner", "admin"] as const satisfies readonly CompanyRole[],
} as const;

export type CompanyPermission = keyof typeof COMPANY_ROLE_PERMISSIONS;

export function hasCompanyRole(
  role: CompanyRole | string | null | undefined,
  allowedRoles: readonly CompanyRole[],
): boolean {
  const normalized = normalizeCompanyRole(role);
  if (!normalized) {
    return false;
  }

  return (allowedRoles as readonly string[]).includes(normalized);
}

export function hasCompanyPermission(
  role: CompanyRole | string | null | undefined,
  permission: CompanyPermission,
): boolean {
  const normalized = normalizeCompanyRole(role);
  if (!normalized) {
    return false;
  }

  return (COMPANY_ROLE_PERMISSIONS[permission] as readonly string[]).includes(
    normalized,
  );
}

export function compareCompanyRoles(
  role: CompanyRole | string | null | undefined,
  minimumRole: CompanyRole,
): boolean {
  const normalized = normalizeCompanyRole(role);
  if (!normalized) {
    return false;
  }

  return ROLE_RANK[normalized] >= ROLE_RANK[minimumRole];
}
