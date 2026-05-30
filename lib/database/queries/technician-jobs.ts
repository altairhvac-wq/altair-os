import type { JobRow } from "@/lib/database/types/core-tables";
import { fetchOperationalDayJobRows } from "@/lib/database/queries/scheduled-today-jobs";
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
  const { rows, error } = await fetchOperationalDayJobRows<JobRowWithCustomer>(
    TECHNICIAN_JOB_SELECT,
    {
      companyId,
      assignedTechnicianId: technicianId,
      reference: options?.reference,
      timeZone: options?.timeZone,
    },
  );

  if (error) {
    console.error("[listAssignedJobsForTechnician] query failed:", {
      companyId,
      technicianId,
      message: error.message,
    });
    return [];
  }

  return rows.map(mapJobRowToTechnicianJob);
}
