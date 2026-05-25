import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/database/types/core-tables";
import type { DispatchJob, Technician } from "@/shared/types/dispatch";

type TechnicianMembershipRow = {
  user_id: string;
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

  if (assignedJobs.some((job) => job.status === "in_progress")) {
    return "on_job";
  }

  return "available";
}

export function mapProfileToTechnician(
  profile: ProfileRow,
  jobs: DispatchJob[] = [],
): Technician {
  const name = profile.full_name?.trim() || profile.email;

  return {
    id: profile.id,
    name,
    role: "Field Technician",
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
    .select("user_id, profile:profiles(*)")
    .eq("company_id", companyId)
    .eq("role", "technician")
    .eq("status", "active")
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

  return ((data ?? []) as TechnicianMembershipRow[])
    .map((row) => row.profile)
    .filter((profile): profile is ProfileRow => Boolean(profile))
    .map((profile) => mapProfileToTechnician(profile, jobs));
}
