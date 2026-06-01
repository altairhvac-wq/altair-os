export const TECHNICIAN_SPECIALTY_OPTIONS = [
  "HVAC",
  "Plumbing",
  "Electrical",
  "Refrigeration",
  "Controls",
  "Maintenance",
  "Install",
  "Service",
  "General Service",
] as const;

export type TechnicianSpecialty = (typeof TECHNICIAN_SPECIALTY_OPTIONS)[number];

const TECHNICIAN_SPECIALTY_SET = new Set<string>(TECHNICIAN_SPECIALTY_OPTIONS);

export const JOB_ELIGIBLE_TEAM_ROLES = [
  "technician",
  "dispatcher",
  "subcontractor",
] as const;

export type JobEligibleTeamRole = (typeof JOB_ELIGIBLE_TEAM_ROLES)[number];

export function isJobEligibleTeamRole(role: string): role is JobEligibleTeamRole {
  return (JOB_ELIGIBLE_TEAM_ROLES as readonly string[]).includes(role);
}

export function isTechnicianSpecialty(value: string): value is TechnicianSpecialty {
  return TECHNICIAN_SPECIALTY_SET.has(value);
}

export function normalizeTechnicianSpecialties(
  values: readonly string[] | null | undefined,
): TechnicianSpecialty[] {
  if (!values?.length) {
    return [];
  }

  const normalized: TechnicianSpecialty[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (isTechnicianSpecialty(trimmed) && !normalized.includes(trimmed)) {
      normalized.push(trimmed);
    }
  }

  return normalized;
}

export function validateTechnicianSpecialties(values: readonly string[]): string | null {
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    if (!isTechnicianSpecialty(trimmed)) {
      return "One or more specialties are not allowed.";
    }
  }

  return null;
}

export function formatPrimaryTechnicianSpecialty(
  specialties: readonly string[],
): string {
  const normalized = normalizeTechnicianSpecialties(specialties);
  return normalized[0] ?? "General Service";
}

export function formatTechnicianSpecialtyLabels(
  specialties: readonly string[],
): string[] {
  const normalized = normalizeTechnicianSpecialties(specialties);
  return normalized.length > 0 ? normalized : ["General Service"];
}
