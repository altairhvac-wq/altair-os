import type { CompanyRole } from "@/lib/database/types/enums";

export type TeamRoleDescription = {
  label: string;
  summary: string;
  access: string;
};

export const TEAM_ROLE_DESCRIPTIONS: Record<
  Exclude<CompanyRole, "customer">,
  TeamRoleDescription
> = {
  owner: {
    label: "Owner",
    summary: "Full workspace control including billing, team, and settings.",
    access: "All areas · Can invite owners · Cannot be removed if last owner",
  },
  admin: {
    label: "Admin",
    summary: "Manage operations, team members, and company settings.",
    access: "Settings · Dispatch · Customers · Billing · Reports",
  },
  dispatcher: {
    label: "Dispatcher",
    summary: "Schedule jobs, assign technicians, and manage the dispatch board.",
    access: "Dispatch · Jobs · Customers · No settings access",
  },
  technician: {
    label: "Technician",
    summary: "Field crew access to assigned jobs and mobile workflows.",
    access: "Technician home · Assigned jobs · Time clock · No admin nav",
  },
  office_staff: {
    label: "Office Staff",
    summary: "Handle customers, estimates, invoices, and office review queues.",
    access: "Customers · Estimates · Invoices · Expenses · No settings",
  },
  subcontractor: {
    label: "Subcontractor",
    summary: "Limited partner access for assigned work.",
    access: "Assigned jobs only · No team or settings access",
  },
};

export function getTeamRoleDescription(
  role: CompanyRole,
): TeamRoleDescription | null {
  if (role === "customer") {
    return null;
  }

  return TEAM_ROLE_DESCRIPTIONS[role];
}

/** Roles that require explicit confirmation before assignment. */
export const SENSITIVE_TEAM_ROLES = new Set<CompanyRole>(["owner", "admin"]);

export function isSensitiveTeamRole(role: CompanyRole): boolean {
  return SENSITIVE_TEAM_ROLES.has(role);
}
