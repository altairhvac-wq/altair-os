import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import { getDayBoundsInTimeZone } from "@/shared/lib/datetime";
import type {
  DispatchAssignmentInsert,
  JobRow,
} from "@/lib/database/types/core-tables";
import { mapJobRowToJob } from "@/lib/database/queries/jobs";
import { recordTechnicianAssignedActivity } from "@/lib/database/services/job-activity";
import type { Job } from "@/shared/types/job";
import type { DispatchJob } from "@/shared/types/dispatch";

type JobRowWithDispatch = JobRow & {
  customers: { name: string; email?: string; phone?: string } | null;
  assigned_technician: { full_name: string | null; email: string } | null;
};

const DISPATCH_JOB_SELECT = `
  *,
  customers(name, email, phone),
  assigned_technician:profiles!jobs_assigned_technician_id_fkey(full_name, email)
`;

function getTodayBounds(
  reference = new Date(),
  timeZone?: string,
): { start: string; end: string } {
  return getDayBoundsInTimeZone(timeZone, reference);
}

export function mapJobRowToDispatchJob(row: JobRowWithDispatch): DispatchJob {
  const job: Job = mapJobRowToJob({
    ...row,
    customers: row.customers
      ? {
          name: row.customers.name,
          email: "",
          phone: "",
          company_name: null,
        }
      : null,
    assigned_technician: row.assigned_technician,
  });

  return {
    id: job.id,
    customerId: job.customerId,
    jobNumber: job.jobNumber,
    customerName: job.customerName,
    customerEmail: row.customers?.email || undefined,
    customerPhone: row.customers?.phone || undefined,
    serviceAddress: job.serviceAddress,
    city: job.city,
    state: job.state,
    zip: job.zip,
    jobType: job.jobType,
    scheduledDate: job.scheduledDate,
    status: job.status,
    priority: job.priority,
    description: job.description,
    notes: job.notes,
    technicianId: row.assigned_technician_id ?? undefined,
  };
}

export async function listDispatchJobsForToday(
  companyId: string,
  options?: { reference?: Date; timeZone?: string },
): Promise<DispatchJob[]> {
  const supabase = await createClient();
  const reference = options?.reference ?? new Date();
  const { start, end } = getTodayBounds(reference, options?.timeZone);

  const { data, error } = await supabase
    .from("jobs")
    .select(DISPATCH_JOB_SELECT)
    .eq("company_id", companyId)
    .gte("scheduled_at", start)
    .lte("scheduled_at", end)
    .neq("status", "cancelled")
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[listDispatchJobsForToday] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return ((data ?? []) as JobRowWithDispatch[]).map(mapJobRowToDispatchJob);
}

export async function getDispatchJobById(
  companyId: string,
  jobId: string,
): Promise<DispatchJob | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select(DISPATCH_JOB_SELECT)
    .eq("company_id", companyId)
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    console.error("[getDispatchJobById] query failed:", {
      companyId,
      jobId,
      code: error.code,
      message: error.message,
    });
    throw new Error(mapDatabaseError(error));
  }

  if (!data) {
    return null;
  }

  return mapJobRowToDispatchJob(data as JobRowWithDispatch);
}

export async function assignJobToTechnician(
  companyId: string,
  jobId: string,
  technicianId: string,
  assignedBy: string,
): Promise<{ job: DispatchJob | null; error: string | null }> {
  const supabase = await createClient();

  const { data: jobRow, error: jobError } = await supabase
    .from("jobs")
    .select("id, scheduled_at, status, assigned_technician_id, customer_id, job_number")
    .eq("company_id", companyId)
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    console.error("[assignJobToTechnician] job lookup failed:", {
      companyId,
      jobId,
      code: jobError.code,
      message: jobError.message,
    });
    return { job: null, error: mapDatabaseError(jobError) };
  }

  if (!jobRow) {
    return { job: null, error: "Job was not found." };
  }

  const statusBeforeAssignment = jobRow.status;
  const previousTechnicianId = jobRow.assigned_technician_id;
  console.log("[assignJobToTechnician] assignment start", {
    companyId,
    jobId,
    technicianId,
    statusBeforeAssignment,
  });

  const { data: membership, error: membershipError } = await supabase
    .from("company_memberships")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", technicianId)
    .eq("status", "active")
    .neq("role", "customer")
    .maybeSingle();

  if (membershipError) {
    console.error("[assignJobToTechnician] technician lookup failed:", {
      companyId,
      technicianId,
      code: membershipError.code,
      message: membershipError.message,
    });
    return { job: null, error: mapDatabaseError(membershipError) };
  }

  if (!membership) {
    return {
      job: null,
      error: "Selected technician is not an active member of this company.",
    };
  }

  const now = new Date().toISOString();

  const { data: activeAssignments, error: activeError } = await supabase
    .from("dispatch_assignments")
    .select("id")
    .eq("company_id", companyId)
    .eq("job_id", jobId)
    .eq("status", "active");

  if (activeError) {
    console.error("[assignJobToTechnician] active assignment lookup failed:", {
      companyId,
      jobId,
      code: activeError.code,
      message: activeError.message,
    });
    return { job: null, error: mapDatabaseError(activeError) };
  }

  if (activeAssignments?.length) {
    const { error: cancelError } = await supabase
      .from("dispatch_assignments")
      .update({
        status: "cancelled",
        unassigned_at: now,
      })
      .eq("company_id", companyId)
      .eq("job_id", jobId)
      .eq("status", "active");

    if (cancelError) {
      console.error("[assignJobToTechnician] cancel assignment failed:", {
        companyId,
        jobId,
        code: cancelError.code,
        message: cancelError.message,
      });
      return { job: null, error: mapDatabaseError(cancelError) };
    }
  }

  const assignmentInsert: DispatchAssignmentInsert = {
    company_id: companyId,
    job_id: jobId,
    technician_id: technicianId,
    assigned_by: assignedBy,
    status: "active",
    scheduled_start: jobRow.scheduled_at,
    assigned_at: now,
  };

  const { error: insertError } = await supabase
    .from("dispatch_assignments")
    .insert(assignmentInsert);

  if (insertError) {
    console.error("[assignJobToTechnician] insert assignment failed:", {
      companyId,
      jobId,
      technicianId,
      code: insertError.code,
      message: insertError.message,
    });
    return { job: null, error: mapDatabaseError(insertError) };
  }

  const { error: updateError } = await supabase
    .from("jobs")
    .update({
      assigned_technician_id: technicianId,
    })
    .eq("company_id", companyId)
    .eq("id", jobId);

  if (updateError) {
    console.error("[assignJobToTechnician] job update failed:", {
      companyId,
      jobId,
      code: updateError.code,
      message: updateError.message,
    });
    return { job: null, error: mapDatabaseError(updateError) };
  }

  const job = await getDispatchJobById(companyId, jobId);

  if (job && job.status !== statusBeforeAssignment) {
    console.error(
      "[assignJobToTechnician] unexpected job.status change during assignment",
      {
        companyId,
        jobId,
        statusBeforeAssignment,
        statusAfterAssignment: job.status,
      },
    );
  } else {
    console.log("[assignJobToTechnician] assignment complete", {
      companyId,
      jobId,
      technicianId,
      status: job?.status ?? statusBeforeAssignment,
    });
  }

  await recordTechnicianAssignedActivity({
    companyId,
    jobId,
    actorId: assignedBy,
    technicianId,
    previousTechnicianId,
    customerId: jobRow.customer_id,
    jobNumber: jobRow.job_number,
  });

  return { job, error: null };
}
