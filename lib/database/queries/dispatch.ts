import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import { fetchOperationalDayJobRows } from "@/lib/database/queries/scheduled-today-jobs";
import type {
  DispatchAssignmentInsert,
  JobRow,
} from "@/lib/database/types/core-tables";
import { mapJobRowToJob } from "@/lib/database/queries/jobs";
import { recordTechnicianAssignedActivity, recordTechnicianUnassignedActivity } from "@/lib/database/services/job-activity";
import type { Job } from "@/shared/types/job";
import type { DispatchJob } from "@/shared/types/dispatch";
import type { DispatchAssignmentStatus } from "@/lib/database/types/enums";
import type { JobStatus } from "@/shared/types/job";

type JobRowWithDispatch = JobRow & {
  customers: { name: string; email?: string; phone?: string } | null;
  assigned_technician: { full_name: string | null; email: string } | null;
};

type AssignJobRpcResult = {
  changed: boolean;
  job_id: string;
  previous_technician_id?: string | null;
  customer_id?: string;
  job_number?: string;
};

const DISPATCH_JOB_SELECT = `
  *,
  customers(name, email, phone),
  assigned_technician:profiles!jobs_assigned_technician_id_fkey(full_name, email)
`;

const NON_ASSIGNABLE_JOB_STATUSES = new Set<JobStatus>([
  "cancelled",
  "completed",
]);

function isRpcUnavailable(error: { code?: string; message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST202" ||
    message.includes("could not find the function")
  );
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
    arrivedAt: row.arrived_at ?? undefined,
    workStartedAt: row.work_started_at ?? undefined,
  };
}

export async function listDispatchJobsForToday(
  companyId: string,
  options?: { reference?: Date; timeZone?: string },
): Promise<DispatchJob[]> {
  const { rows, error } = await fetchOperationalDayJobRows<JobRowWithDispatch>(
    DISPATCH_JOB_SELECT,
    {
      companyId,
      reference: options?.reference,
      timeZone: options?.timeZone,
    },
  );

  if (error) {
    console.error("[listDispatchJobsForToday] query failed:", {
      companyId,
      message: error.message,
    });
    return [];
  }

  return rows.map(mapJobRowToDispatchJob);
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

async function cancelActiveDispatchAssignments(
  companyId: string,
  jobId: string,
  now: string,
  finalStatus: Extract<DispatchAssignmentStatus, "cancelled" | "unassigned">,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("dispatch_assignments")
    .update({
      status: finalStatus,
      unassigned_at: now,
    })
    .eq("company_id", companyId)
    .eq("job_id", jobId)
    .eq("status", "active");

  if (error) {
    console.error("[cancelActiveDispatchAssignments] update failed:", {
      companyId,
      jobId,
      finalStatus,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  return { error: null };
}

export async function finalizeActiveDispatchAssignments(
  companyId: string,
  jobId: string,
  finalStatus: Extract<DispatchAssignmentStatus, "completed" | "cancelled">,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error: rpcError } = await supabase.rpc(
    "finalize_job_dispatch_assignments",
    {
      p_company_id: companyId,
      p_job_id: jobId,
      p_final_status: finalStatus,
    },
  );

  if (!rpcError) {
    return { error: null };
  }

  if (!isRpcUnavailable(rpcError)) {
    console.error("[finalizeActiveDispatchAssignments] rpc failed:", {
      companyId,
      jobId,
      finalStatus,
      code: rpcError.code,
      message: rpcError.message,
    });
    return { error: mapDatabaseError(rpcError) };
  }

  const now = new Date().toISOString();
  const updatePayload: {
    status: DispatchAssignmentStatus;
    unassigned_at?: string;
  } =
    finalStatus === "completed"
      ? { status: "completed" }
      : { status: "cancelled", unassigned_at: now };

  const { error: assignmentError } = await supabase
    .from("dispatch_assignments")
    .update(updatePayload)
    .eq("company_id", companyId)
    .eq("job_id", jobId)
    .eq("status", "active");

  if (assignmentError) {
    console.error("[finalizeActiveDispatchAssignments] update failed:", {
      companyId,
      jobId,
      finalStatus,
      code: assignmentError.code,
      message: assignmentError.message,
    });
    return { error: mapDatabaseError(assignmentError) };
  }

  if (finalStatus === "cancelled") {
    const { error: jobError } = await supabase
      .from("jobs")
      .update({ assigned_technician_id: null })
      .eq("company_id", companyId)
      .eq("id", jobId);

    if (jobError) {
      console.error(
        "[finalizeActiveDispatchAssignments] clear technician failed:",
        {
          companyId,
          jobId,
          code: jobError.code,
          message: jobError.message,
        },
      );
      return { error: mapDatabaseError(jobError) };
    }
  }

  return { error: null };
}

export async function unassignJobFromTechnician(
  companyId: string,
  jobId: string,
  actorId: string,
): Promise<{ job: DispatchJob | null; error: string | null }> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: jobRow, error: jobError } = await supabase
    .from("jobs")
    .select("id, status, assigned_technician_id, customer_id, job_number")
    .eq("company_id", companyId)
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    return { job: null, error: mapDatabaseError(jobError) };
  }

  if (!jobRow) {
    return { job: null, error: "Job was not found." };
  }

  if (NON_ASSIGNABLE_JOB_STATUSES.has(jobRow.status as JobStatus)) {
    return {
      job: null,
      error: `${jobRow.status === "cancelled" ? "Cancelled" : "Completed"} jobs cannot be unassigned.`,
    };
  }

  if (!jobRow.assigned_technician_id) {
    const job = await getDispatchJobById(companyId, jobId);
    return { job, error: null };
  }

  const { error: cancelError } = await cancelActiveDispatchAssignments(
    companyId,
    jobId,
    now,
    "unassigned",
  );

  if (cancelError) {
    return { job: null, error: cancelError };
  }

  const { error: updateError } = await supabase
    .from("jobs")
    .update({ assigned_technician_id: null })
    .eq("company_id", companyId)
    .eq("id", jobId);

  if (updateError) {
    return { job: null, error: mapDatabaseError(updateError) };
  }

  await recordTechnicianUnassignedActivity({
    companyId,
    jobId,
    actorId,
    technicianId: jobRow.assigned_technician_id,
    customerId: jobRow.customer_id,
    jobNumber: jobRow.job_number,
  });

  const job = await getDispatchJobById(companyId, jobId);
  return { job, error: null };
}

async function assignJobToTechnicianLegacy(
  companyId: string,
  jobId: string,
  technicianId: string,
  assignedBy: string,
): Promise<{
  job: DispatchJob | null;
  error: string | null;
  changed: boolean;
  previousTechnicianId?: string | null;
  customerId?: string;
  jobNumber?: string;
}> {
  const supabase = await createClient();

  const { data: jobRow, error: jobError } = await supabase
    .from("jobs")
    .select("id, scheduled_at, status, assigned_technician_id, customer_id, job_number")
    .eq("company_id", companyId)
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    return {
      job: null,
      error: mapDatabaseError(jobError),
      changed: false,
    };
  }

  if (!jobRow) {
    return { job: null, error: "Job was not found.", changed: false };
  }

  if (NON_ASSIGNABLE_JOB_STATUSES.has(jobRow.status as JobStatus)) {
    return {
      job: null,
      error:
        jobRow.status === "cancelled"
          ? "Cancelled jobs cannot be reassigned."
          : "Completed jobs cannot be reassigned.",
      changed: false,
    };
  }

  const previousTechnicianId = jobRow.assigned_technician_id;
  const customerId = jobRow.customer_id;
  const jobNumber = jobRow.job_number;

  const { data: activeAssignment, error: activeError } = await supabase
    .from("dispatch_assignments")
    .select("id, technician_id")
    .eq("company_id", companyId)
    .eq("job_id", jobId)
    .eq("status", "active")
    .maybeSingle();

  if (activeError) {
    return { job: null, error: mapDatabaseError(activeError), changed: false };
  }

  if (
    activeAssignment?.technician_id === technicianId &&
    previousTechnicianId === technicianId
  ) {
    const job = await getDispatchJobById(companyId, jobId);
    return {
      job,
      error: null,
      changed: false,
      previousTechnicianId,
      customerId,
      jobNumber,
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("company_memberships")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", technicianId)
    .eq("status", "active")
    .neq("role", "customer")
    .maybeSingle();

  if (membershipError) {
    return { job: null, error: mapDatabaseError(membershipError), changed: false };
  }

  if (!membership) {
    return {
      job: null,
      error: "Selected technician is not an active member of this company.",
      changed: false,
    };
  }

  const now = new Date().toISOString();

  if (activeAssignment) {
    const { error: cancelError } = await cancelActiveDispatchAssignments(
      companyId,
      jobId,
      now,
      "cancelled",
    );

    if (cancelError) {
      return { job: null, error: cancelError, changed: false };
    }
  }

  const { error: updateError } = await supabase
    .from("jobs")
    .update({ assigned_technician_id: technicianId })
    .eq("company_id", companyId)
    .eq("id", jobId);

  if (updateError) {
    return { job: null, error: mapDatabaseError(updateError), changed: false };
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
    if (insertError.code === "23505") {
      const { error: revertError } = await supabase
        .from("jobs")
        .update({ assigned_technician_id: previousTechnicianId })
        .eq("company_id", companyId)
        .eq("id", jobId);

      if (revertError) {
        console.error("[assignJobToTechnician] revert after conflict failed:", {
          companyId,
          jobId,
          code: revertError.code,
          message: revertError.message,
        });
      }

      const job = await getDispatchJobById(companyId, jobId);
      return {
        job,
        error:
          "Assignment conflict detected. Refresh the dispatch board and try again.",
        changed: false,
      };
    }

    const { error: revertError } = await supabase
      .from("jobs")
      .update({ assigned_technician_id: previousTechnicianId })
      .eq("company_id", companyId)
      .eq("id", jobId);

    if (revertError) {
      console.error("[assignJobToTechnician] revert after insert failed:", {
        companyId,
        jobId,
        code: revertError.code,
        message: revertError.message,
      });
    }

    return { job: null, error: mapDatabaseError(insertError), changed: false };
  }

  const job = await getDispatchJobById(companyId, jobId);
  return {
    job,
    error: null,
    changed: true,
    previousTechnicianId,
    customerId,
    jobNumber,
  };
}

export async function assignJobToTechnician(
  companyId: string,
  jobId: string,
  technicianId: string,
  assignedBy: string,
): Promise<{ job: DispatchJob | null; error: string | null }> {
  const supabase = await createClient();

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "assign_job_to_technician",
    {
      p_company_id: companyId,
      p_job_id: jobId,
      p_technician_id: technicianId,
    },
  );

  if (!rpcError && rpcData && typeof rpcData === "object") {
    const result = rpcData as AssignJobRpcResult;
    const job = await getDispatchJobById(companyId, jobId);

    if (!job) {
      return { job: null, error: "Job was not found." };
    }

    if (result.changed) {
      await recordTechnicianAssignedActivity({
        companyId,
        jobId,
        actorId: assignedBy,
        technicianId,
        previousTechnicianId: result.previous_technician_id,
        customerId: result.customer_id,
        jobNumber: result.job_number,
      });
    }

    return { job, error: null };
  }

  if (rpcError && !isRpcUnavailable(rpcError)) {
    console.error("[assignJobToTechnician] rpc failed:", {
      companyId,
      jobId,
      technicianId,
      code: rpcError.code,
      message: rpcError.message,
    });
    return { job: null, error: mapDatabaseError(rpcError) };
  }

  const legacy = await assignJobToTechnicianLegacy(
    companyId,
    jobId,
    technicianId,
    assignedBy,
  );

  if (legacy.error || !legacy.job) {
    return { job: legacy.job, error: legacy.error };
  }

  if (legacy.changed) {
    await recordTechnicianAssignedActivity({
      companyId,
      jobId,
      actorId: assignedBy,
      technicianId,
      previousTechnicianId: legacy.previousTechnicianId,
      customerId: legacy.customerId,
      jobNumber: legacy.jobNumber,
    });
  }

  return { job: legacy.job, error: null };
}

export async function reactivateDispatchAssignmentForReopenedJob(
  companyId: string,
  jobId: string,
  technicianId: string,
  assignedBy: string,
  scheduledStart: string,
): Promise<{ reactivated: boolean; error: string | null }> {
  const supabase = await createClient();

  const { data: activeAssignment, error: activeError } = await supabase
    .from("dispatch_assignments")
    .select("id")
    .eq("company_id", companyId)
    .eq("job_id", jobId)
    .eq("status", "active")
    .maybeSingle();

  if (activeError) {
    console.error(
      "[reactivateDispatchAssignmentForReopenedJob] active lookup failed:",
      {
        companyId,
        jobId,
        code: activeError.code,
        message: activeError.message,
      },
    );
    return { reactivated: false, error: mapDatabaseError(activeError) };
  }

  if (activeAssignment) {
    return { reactivated: false, error: null };
  }

  const now = new Date().toISOString();
  const assignmentInsert: DispatchAssignmentInsert = {
    company_id: companyId,
    job_id: jobId,
    technician_id: technicianId,
    assigned_by: assignedBy,
    status: "active",
    scheduled_start: scheduledStart,
    assigned_at: now,
  };

  const { error: insertError } = await supabase
    .from("dispatch_assignments")
    .insert(assignmentInsert);

  if (insertError) {
    console.error(
      "[reactivateDispatchAssignmentForReopenedJob] insert failed:",
      {
        companyId,
        jobId,
        technicianId,
        code: insertError.code,
        message: insertError.message,
      },
    );
    return { reactivated: false, error: mapDatabaseError(insertError) };
  }

  return { reactivated: true, error: null };
}

export type DispatchAssignmentListRow = {
  id: string;
  jobId: string;
  technicianId: string;
  status: DispatchAssignmentStatus;
};

/** Company-scoped dispatch rows for read-only integrity scans. */
export async function listDispatchAssignmentsForCompany(
  companyId: string,
): Promise<DispatchAssignmentListRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("dispatch_assignments")
    .select("id, job_id, technician_id, status")
    .eq("company_id", companyId);

  if (error) {
    console.error("[listDispatchAssignmentsForCompany] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    jobId: row.job_id,
    technicianId: row.technician_id,
    status: row.status as DispatchAssignmentStatus,
  }));
}

export async function listDispatchAssignmentsForJob(
  companyId: string,
  jobId: string,
): Promise<DispatchAssignmentListRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("dispatch_assignments")
    .select("id, job_id, technician_id, status")
    .eq("company_id", companyId)
    .eq("job_id", jobId);

  if (error) {
    console.error("[listDispatchAssignmentsForJob] query failed:", {
      companyId,
      jobId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    jobId: row.job_id,
    technicianId: row.technician_id,
    status: row.status as DispatchAssignmentStatus,
  }));
}
