import { createClient } from "@/lib/supabase/server";
import type { JobRow } from "@/lib/database/types/core-tables";
import { getDayBoundsInTimeZone } from "@/shared/lib/datetime";
import type { TechnicianJob } from "@/shared/types/technician";

type ListAssignedJobsForTechnicianOptions = {
  reference?: Date;
  timeZone?: string;
};

type JobRowWithCustomer = JobRow & {
  customers: {
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
};

const TECHNICIAN_JOB_SELECT = `
  *,
  customers(name, email, phone)
`;

function mapJobRowToTechnicianJob(row: JobRowWithCustomer): TechnicianJob {
  return {
    id: row.id,
    customerId: row.customer_id,
    jobNumber: row.job_number,
    customerName: row.customers?.name ?? "Unknown customer",
    customerPhone: row.customers?.phone ?? undefined,
    customerEmail: row.customers?.email ?? undefined,
    serviceAddress: row.service_address,
    city: row.city,
    state: row.state,
    zip: row.postal_code,
    jobType: row.job_type,
    scheduledDate: row.scheduled_at,
    status: row.status,
    priority: row.priority,
    description: row.description ?? undefined,
    notes: row.notes ?? undefined,
    completedAt: row.completed_at ?? undefined,
  };
}

export async function listAssignedJobsForTechnician(
  companyId: string,
  technicianId: string,
  options?: ListAssignedJobsForTechnicianOptions,
): Promise<TechnicianJob[]> {
  const supabase = await createClient();
  const reference = options?.reference ?? new Date();
  const { start, end } = getDayBoundsInTimeZone(
    options?.timeZone,
    reference,
  );

  const { data, error } = await supabase
    .from("jobs")
    .select(TECHNICIAN_JOB_SELECT)
    .eq("company_id", companyId)
    .eq("assigned_technician_id", technicianId)
    .neq("status", "cancelled")
    .gte("scheduled_at", start)
    .lte("scheduled_at", end)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[listAssignedJobsForTechnician] query failed:", {
      companyId,
      technicianId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return ((data ?? []) as JobRowWithCustomer[]).map(mapJobRowToTechnicianJob);
}
