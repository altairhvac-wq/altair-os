import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/database/types/core-tables";
import type { CompanyRole } from "@/lib/database/types/enums";
import { COMPANY_ROLE_LABELS } from "@/lib/database/types/roles";
import type { DispatchJob, Technician } from "@/shared/types/dispatch";

type AssignableMembershipRow = {
  user_id: string;
  role: CompanyRole;
  profile: ProfileRow | null;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function deriveTechnicianStatus(
  technicianId: string,
  jobs: DispatchJob[],
): Technician["status"] {
  const assignedJobs = jobs.filter((job) => job.technicianId === technicianId);

  if (
    assignedJobs.some(
      (job) => job.status === "in_progress" || job.status === "arrived",
    )
  ) {
    return "on_job";
  }

  return "available";
}

export function mapProfileToTechnician(
  profile: ProfileRow,
  membershipRole: CompanyRole = "technician",
  jobs: DispatchJob[] = [],
): Technician {
  const name = profile.full_name?.trim() || profile.email;

  return {
    id: profile.id,
    name,
    role: COMPANY_ROLE_LABELS[membershipRole] ?? "Team Member",
    initials: getInitials(name),
    status: deriveTechnicianStatus(profile.id, jobs),
    specialty: "General Service",
    phone: profile.phone?.trim() || "—",
  };
}

export async function listTechnicians(
  companyId: string,
  jobs: DispatchJob[] = [],
): Promise<Technician[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .select("user_id, role, profile:profiles!company_memberships_user_id_fkey(*)")
    .eq("company_id", companyId)
    .eq("status", "active")
    .neq("role", "customer")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[listTechnicians] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return ((data ?? []) as AssignableMembershipRow[])
    .map((row) => {
      if (!row.profile) {
        return null;
      }

      return mapProfileToTechnician(row.profile, row.role, jobs);
    })
    .filter((technician): technician is Technician => Boolean(technician));
}
