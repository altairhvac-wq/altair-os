import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import {
  finalizeActiveDispatchAssignments,
  reactivateDispatchAssignmentForReopenedJob,
} from "@/lib/database/queries/dispatch";
import { fetchOperationalDayJobRows } from "@/lib/database/queries/scheduled-today-jobs";
import type { JobInsert, JobRow, JobUpdate } from "@/lib/database/types/core-tables";
import {
  getDayBoundsInTimeZone,
  resolveCompanyTimeZone,
} from "@/shared/lib/datetime";
import type { EstimateLineItem } from "@/shared/types/estimate";
import type { JobDeleteDependencies } from "@/shared/lib/job-lifecycle";
import type { Job, JobDetail, JobFormData, JobStatus } from "@/shared/types/job";
import {
  buildTrashTimestampFields,
  countInvoicePaymentsForJob,
  countRelatedRecordsByColumn,
} from "@/lib/database/queries/entity-lifecycle-shared";
import type {
  JobWorkflowActionId,
  JobWorkflowCompletionPayload,
} from "@/shared/types/job-workflow";

import {
  resolveOptionalSubjectAttributionName,
  type ProfileSummary,
} from "@/shared/lib/profile-attribution";

type JobRowWithCustomer = JobRow & {
  customers: {
    name: string;
    email?: string;
    phone?: string;
    company_name?: string | null;
  } | null;
};

type JobRowWithTechnician = JobRowWithCustomer & {
  assigned_technician: ProfileSummary | null;
};

const JOB_TECHNICIAN_SELECT = `
  *,
  customers(name),
  assigned_technician:profiles!jobs_assigned_technician_id_fkey(full_name, email)
`;

const JOB_DETAIL_SELECT = `
  *,
  customers(name, email, phone, company_name),
  assigned_technician:profiles!jobs_assigned_technician_id_fkey(full_name, email)
`;

function toDateOnly(value: string): string {
  return value.split("T")[0] ?? value;
}

function resolveAssignedTechnician(row: JobRowWithTechnician): {
  assignedTechnicianId?: string;
  assignedTechnician?: string;
} {
  if (!row.assigned_technician_id) {
    return {};
  }

  return {
    assignedTechnicianId: row.assigned_technician_id,
    assignedTechnician: resolveOptionalSubjectAttributionName({
      profile: row.assigned_technician,
      subjectUserId: row.assigned_technician_id,
    }),
  };
}

export function mapJobRowToJob(row: JobRowWithTechnician): Job {
  const technician = resolveAssignedTechnician(row);

  return {
    id: row.id,
    jobNumber: row.job_number,
    customerId: row.customer_id,
    customerName: row.customers?.name ?? "Unknown customer",
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
    arrivedAt: row.arrived_at ?? undefined,
    workStartedAt: row.work_started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    completionNotes: row.completion_notes ?? undefined,
    followUpNotes: row.follow_up_notes ?? undefined,
    createdAt: toDateOnly(row.created_at),
    archivedAt: row.archived_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    deleteAfter: row.delete_after ?? undefined,
    ...technician,
  };
}

export type ListJobsOptions = {
  includeArchived?: boolean;
  includeDeleted?: boolean;
  assignedTechnicianId?: string;
};

async function generateJobNumber(companyId: string): Promise<string> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (error) {
    console.error("[generateJobNumber] count failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return `JOB-${Date.now()}`;
  }

  return `JOB-${1049 + (count ?? 0)}`;
}

function mapJobFormDataFields(data: JobFormData) {
  return {
    customer_id: data.customerId,
    service_address: data.serviceAddress.trim(),
    city: data.city.trim(),
    state: data.state.trim(),
    postal_code: data.zip.trim(),
    job_type: data.jobType.trim(),
    scheduled_at: new Date(data.scheduledDate).toISOString(),
    status: data.status,
    priority: data.priority,
    description: data.description.trim() || null,
    notes: data.notes.trim() || null,
  };
}

export function mapJobFormDataToInsert(
  companyId: string,
  jobNumber: string,
  data: JobFormData,
): JobInsert {
  return {
    company_id: companyId,
    job_number: jobNumber,
    ...mapJobFormDataFields(data),
  };
}

export function mapJobFormDataToUpdate(data: JobFormData): JobUpdate {
  return mapJobFormDataFields(data);
}

export const listJobs = cache(async function listJobs(
  companyId: string,
  options?: ListJobsOptions,
): Promise<Job[]> {
  const supabase = await createClient();
  const includeArchived = options?.includeArchived ?? false;
  const includeDeleted = options?.includeDeleted ?? false;

  let query = supabase
    .from("jobs")
    .select(JOB_TECHNICIAN_SELECT)
    .eq("company_id", companyId);

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  if (options?.assignedTechnicianId) {
    query = query.eq("assigned_technician_id", options.assignedTechnicianId);
  }

  const { data, error } = await query.order("scheduled_at", { ascending: false });

  if (error) {
    console.error("[listJobs] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return ((data ?? []) as JobRowWithTechnician[]).map(mapJobRowToJob);
});

type ListJobsForOperationalDayOptions = {
  reference?: Date;
  timeZone?: string;
  assignedTechnicianId?: string;
};

export async function listJobsForOperationalDay(
  companyId: string,
  options?: ListJobsForOperationalDayOptions,
): Promise<Job[]> {
  const { rows, error } = await fetchOperationalDayJobRows<JobRowWithTechnician>(
    JOB_TECHNICIAN_SELECT,
    {
      companyId,
      assignedTechnicianId: options?.assignedTechnicianId,
      reference: options?.reference,
      timeZone: options?.timeZone,
    },
  );

  if (error) {
    console.error("[listJobsForOperationalDay] query failed:", {
      companyId,
      message: error.message,
    });
    return [];
  }

  return rows.map(mapJobRowToJob);
}

export async function listAssignedJobs(
  companyId: string,
  technicianId: string,
): Promise<Job[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_TECHNICIAN_SELECT)
    .eq("company_id", companyId)
    .eq("assigned_technician_id", technicianId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("scheduled_at", { ascending: false });

  if (error) {
    console.error("[listAssignedJobs] query failed:", {
      companyId,
      technicianId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return ((data ?? []) as JobRowWithTechnician[]).map(mapJobRowToJob);
}

export async function listJobsByCustomer(
  companyId: string,
  customerId: string,
  limit = 10,
): Promise<Job[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_TECHNICIAN_SELECT)
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .order("scheduled_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listJobsByCustomer] query failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return ((data ?? []) as JobRowWithTechnician[]).map(mapJobRowToJob);
}

function mapJobRowToJobDetail(row: JobRowWithTechnician): JobDetail {
  const job = mapJobRowToJob(row);

  return {
    ...job,
    customerEmail: row.customers?.email || undefined,
    customerPhone: row.customers?.phone || undefined,
    customerCompany: row.customers?.company_name || undefined,
  };
}

export async function getJobById(
  companyId: string,
  jobId: string,
): Promise<JobDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_DETAIL_SELECT)
    .eq("company_id", companyId)
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    console.error("[getJobById] query failed:", {
      companyId,
      jobId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(mapDatabaseError(error));
  }

  if (!data) {
    return null;
  }

  return mapJobRowToJobDetail(data as JobRowWithTechnician);
}

export async function createJob(
  companyId: string,
  data: JobFormData,
): Promise<{ job: Job | null; error: string | null }> {
  const supabase = await createClient();

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("company_id", companyId)
    .eq("id", data.customerId)
    .maybeSingle();

  if (customerError) {
    console.error("[createJob] customer lookup failed:", {
      companyId,
      customerId: data.customerId,
      code: customerError.code,
      message: customerError.message,
    });
    return { job: null, error: mapDatabaseError(customerError) };
  }

  if (!customer) {
    return { job: null, error: "Selected customer was not found." };
  }

  if (data.status !== "scheduled") {
    return {
      job: null,
      error: "New jobs must be created with Scheduled status.",
    };
  }

  const jobNumber = await generateJobNumber(companyId);
  const insert = mapJobFormDataToInsert(companyId, jobNumber, data);

  const { data: row, error } = await supabase
    .from("jobs")
    .insert(insert)
    .select(JOB_TECHNICIAN_SELECT)
    .single();

  if (error) {
    console.error("[createJob] insert failed:", {
      companyId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { job: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { job: null, error: "Failed to create job." };
  }

  return {
    job: mapJobRowToJob(row as JobRowWithTechnician),
    error: null,
  };
}

function resolveJobTypeFromEstimateLineItems(
  lineItems: EstimateLineItem[],
): string {
  const firstNamed = lineItems.find(
    (item) => item.name.trim().length > 0 || (item.description?.trim().length ?? 0) > 0,
  );

  if (!firstNamed) {
    return "Service";
  }

  return (
    firstNamed.name.trim() ||
    firstNamed.description?.trim() ||
    "Service"
  );
}

export type CreateJobFromApprovedEstimateInput = {
  companyId: string;
  estimateId: string;
  customerId: string;
  estimateNumber: string;
  notes?: string;
  lineItems: EstimateLineItem[];
  timeZone?: string;
};

/**
 * Creates an unassigned scheduled job from a remotely approved estimate.
 * Caller must verify the estimate has no job_id before invoking.
 */
export async function createJobFromApprovedEstimate(
  input: CreateJobFromApprovedEstimateInput,
): Promise<{ jobId: string | null; jobNumber: string | null; error: string | null }> {
  const supabase = await createClient();
  const timeZone = input.timeZone?.trim() || resolveCompanyTimeZone();
  const { start: scheduledAt } = getDayBoundsInTimeZone(timeZone);

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select(
      "id, address_line1, address_line2, city, state, postal_code",
    )
    .eq("company_id", input.companyId)
    .eq("id", input.customerId)
    .maybeSingle();

  if (customerError) {
    console.error("[createJobFromApprovedEstimate] customer lookup failed:", {
      companyId: input.companyId,
      customerId: input.customerId,
      code: customerError.code,
      message: customerError.message,
    });
    return { jobId: null, jobNumber: null, error: mapDatabaseError(customerError) };
  }

  if (!customer) {
    return { jobId: null, jobNumber: null, error: "Customer not found." };
  }

  const serviceAddress = [customer.address_line1, customer.address_line2]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(", ");

  const jobNumber = await generateJobNumber(input.companyId);
  const estimateLabel = input.estimateNumber.trim() || "estimate";
  const description = `Approved estimate ${estimateLabel}`;
  const notes = [input.notes?.trim(), `Created from approved estimate ${estimateLabel}.`]
    .filter(Boolean)
    .join("\n\n");

  const insert: JobInsert = {
    company_id: input.companyId,
    customer_id: input.customerId,
    job_number: jobNumber,
    service_address: serviceAddress,
    city: customer.city?.trim() || "",
    state: customer.state?.trim() || "",
    postal_code: customer.postal_code?.trim() || "",
    job_type: resolveJobTypeFromEstimateLineItems(input.lineItems),
    scheduled_at: scheduledAt,
    status: "scheduled",
    priority: "normal",
    description,
    notes: notes || null,
    assigned_technician_id: null,
  };

  const { data: row, error } = await supabase
    .from("jobs")
    .insert(insert)
    .select("id, job_number")
    .single();

  if (error) {
    console.error("[createJobFromApprovedEstimate] insert failed:", {
      companyId: input.companyId,
      estimateId: input.estimateId,
      code: error.code,
      message: error.message,
    });
    return { jobId: null, jobNumber: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { jobId: null, jobNumber: null, error: "Failed to create job." };
  }

  return {
    jobId: row.id,
    jobNumber: row.job_number,
    error: null,
  };
}

export async function updateJob(
  companyId: string,
  jobId: string,
  data: JobFormData,
): Promise<{ job: JobDetail | null; error: string | null }> {
  const supabase = await createClient();

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("company_id", companyId)
    .eq("id", data.customerId)
    .maybeSingle();

  if (customerError) {
    console.error("[updateJob] customer lookup failed:", {
      companyId,
      customerId: data.customerId,
      code: customerError.code,
      message: customerError.message,
    });
    return { job: null, error: mapDatabaseError(customerError) };
  }

  if (!customer) {
    return { job: null, error: "Selected customer was not found." };
  }

  const { data: existingRow, error: existingError } = await supabase
    .from("jobs")
    .select("status")
    .eq("company_id", companyId)
    .eq("id", jobId)
    .maybeSingle();

  if (existingError) {
    console.error("[updateJob] existing job lookup failed:", {
      companyId,
      jobId,
      code: existingError.code,
      message: existingError.message,
    });
    return { job: null, error: mapDatabaseError(existingError) };
  }

  if (!existingRow) {
    return { job: null, error: "Job not found." };
  }

  if (data.status !== existingRow.status) {
    return {
      job: null,
      error:
        "Job status can only be changed with workflow actions (En Route, Arrived, Complete, etc.).",
    };
  }

  const update = mapJobFormDataToUpdate(data);

  const { data: row, error } = await supabase
    .from("jobs")
    .update(update)
    .eq("company_id", companyId)
    .eq("id", jobId)
    .select(JOB_DETAIL_SELECT)
    .maybeSingle();

  if (error) {
    console.error("[updateJob] update failed:", {
      companyId,
      jobId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { job: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { job: null, error: "Job not found." };
  }

  return {
    job: mapJobRowToJobDetail(row as JobRowWithTechnician),
    error: null,
  };
}

export async function updateJobWorkflowStatus(
  companyId: string,
  jobId: string,
  fromStatus: JobStatus,
  toStatus: JobStatus,
  actionId: JobWorkflowActionId,
  payload?: JobWorkflowCompletionPayload,
): Promise<{ job: Job | null; error: string | null }> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const updatePayload: JobUpdate = { status: toStatus };

  switch (actionId) {
    case "arrive":
      updatePayload.arrived_at = now;
      break;
    case "start_work":
      updatePayload.work_started_at = now;
      break;
    case "complete": {
      updatePayload.completed_at = now;
      const completionNotes = payload?.completionNotes?.trim();
      const followUpNotes = payload?.followUpNotes?.trim();
      if (completionNotes) {
        updatePayload.completion_notes = completionNotes;
      }
      if (followUpNotes) {
        updatePayload.follow_up_notes = followUpNotes;
      }
      break;
    }
    default:
      break;
  }

  const { data: row, error } = await supabase
    .from("jobs")
    .update(updatePayload)
    .eq("company_id", companyId)
    .eq("id", jobId)
    .eq("status", fromStatus)
    .select(JOB_TECHNICIAN_SELECT)
    .maybeSingle();

  if (error) {
    console.error("[updateJobWorkflowStatus] update failed:", {
      companyId,
      jobId,
      fromStatus,
      toStatus,
      actionId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { job: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return {
      job: null,
      error: "Job status has changed. Refresh the page and try again.",
    };
  }

  if (actionId === "complete" || actionId === "cancel") {
    const finalStatus = actionId === "complete" ? "completed" : "cancelled";
    let finalizeResult = await finalizeActiveDispatchAssignments(
      companyId,
      jobId,
      finalStatus,
    );

    if (finalizeResult.error) {
      console.error(
        "[updateJobWorkflowStatus] assignment finalization failed, retrying:",
        {
          companyId,
          jobId,
          actionId,
          error: finalizeResult.error,
        },
      );
      finalizeResult = await finalizeActiveDispatchAssignments(
        companyId,
        jobId,
        finalStatus,
      );

      if (finalizeResult.error) {
        console.error(
          "[updateJobWorkflowStatus] assignment finalization failed after retry:",
          {
            companyId,
            jobId,
            actionId,
            error: finalizeResult.error,
          },
        );
        return {
          job: mapJobRowToJob(row as JobRowWithTechnician),
          error:
            "Job status updated but dispatch assignment could not be finalized. Refresh and contact support if the issue persists.",
        };
      }
    }

    if (actionId === "cancel") {
      const { data: refreshed, error: refreshError } = await supabase
        .from("jobs")
        .select(JOB_TECHNICIAN_SELECT)
        .eq("company_id", companyId)
        .eq("id", jobId)
        .maybeSingle();

      if (!refreshError && refreshed) {
        return {
          job: mapJobRowToJob(refreshed as JobRowWithTechnician),
          error: null,
        };
      }
    }
  }

  return {
    job: mapJobRowToJob(row as JobRowWithTechnician),
    error: null,
  };
}

export async function correctJobWorkflowStatus(
  companyId: string,
  jobId: string,
  fromStatus: JobStatus,
  toStatus: JobStatus,
): Promise<{ job: Job | null; error: string | null }> {
  const supabase = await createClient();

  const updatePayload: JobUpdate = { status: toStatus };

  if (toStatus === "scheduled" || toStatus === "dispatched") {
    updatePayload.arrived_at = null;
    updatePayload.work_started_at = null;
  } else if (toStatus === "arrived") {
    updatePayload.work_started_at = null;
  }

  const { data: row, error } = await supabase
    .from("jobs")
    .update(updatePayload)
    .eq("company_id", companyId)
    .eq("id", jobId)
    .eq("status", fromStatus)
    .select(JOB_TECHNICIAN_SELECT)
    .maybeSingle();

  if (error) {
    console.error("[correctJobWorkflowStatus] update failed:", {
      companyId,
      jobId,
      fromStatus,
      toStatus,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { job: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return {
      job: null,
      error: "Job status has changed. Refresh the page and try again.",
    };
  }

  return {
    job: mapJobRowToJob(row as JobRowWithTechnician),
    error: null,
  };
}

export async function reopenCompletedJob(
  companyId: string,
  jobId: string,
  targetStatus: JobStatus,
  actorId: string,
): Promise<{
  job: Job | null;
  error: string | null;
  dispatchReactivated: boolean;
}> {
  const supabase = await createClient();

  const { data: existingRow, error: existingError } = await supabase
    .from("jobs")
    .select(
      "id, status, assigned_technician_id, scheduled_at, work_started_at, arrived_at, completed_at",
    )
    .eq("company_id", companyId)
    .eq("id", jobId)
    .maybeSingle();

  if (existingError) {
    console.error("[reopenCompletedJob] existing job lookup failed:", {
      companyId,
      jobId,
      code: existingError.code,
      message: existingError.message,
    });
    return { job: null, error: mapDatabaseError(existingError), dispatchReactivated: false };
  }

  if (!existingRow) {
    return { job: null, error: "Job not found.", dispatchReactivated: false };
  }

  if (existingRow.status === "cancelled") {
    return { job: null, error: "Cancelled jobs cannot be reopened.", dispatchReactivated: false };
  }

  if (existingRow.status !== "completed") {
    return {
      job: null,
      error: "Only completed jobs can be reopened.",
      dispatchReactivated: false,
    };
  }

  const updatePayload: JobUpdate = {
    status: targetStatus,
    completed_at: null,
  };

  const { data: row, error } = await supabase
    .from("jobs")
    .update(updatePayload)
    .eq("company_id", companyId)
    .eq("id", jobId)
    .eq("status", "completed")
    .select(JOB_TECHNICIAN_SELECT)
    .maybeSingle();

  if (error) {
    console.error("[reopenCompletedJob] update failed:", {
      companyId,
      jobId,
      targetStatus,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { job: null, error: mapDatabaseError(error), dispatchReactivated: false };
  }

  if (!row) {
    return {
      job: null,
      error: "Job status has changed. Refresh the page and try again.",
      dispatchReactivated: false,
    };
  }

  let dispatchReactivated = false;

  if (existingRow.assigned_technician_id) {
    const { reactivated, error: dispatchError } =
      await reactivateDispatchAssignmentForReopenedJob(
        companyId,
        jobId,
        existingRow.assigned_technician_id,
        actorId,
        existingRow.scheduled_at,
      );

    dispatchReactivated = reactivated;

    if (dispatchError) {
      console.error("[reopenCompletedJob] dispatch reactivation failed:", {
        companyId,
        jobId,
        technicianId: existingRow.assigned_technician_id,
        error: dispatchError,
      });

      const { error: rollbackError } = await supabase
        .from("jobs")
        .update({
          status: "completed",
          completed_at: existingRow.completed_at,
        })
        .eq("company_id", companyId)
        .eq("id", jobId)
        .eq("status", targetStatus);

      if (rollbackError) {
        console.error("[reopenCompletedJob] rollback after dispatch failure:", {
          companyId,
          jobId,
          code: rollbackError.code,
          message: rollbackError.message,
        });
      }

      return { job: null, error: dispatchError, dispatchReactivated: false };
    }
  }

  return {
    job: mapJobRowToJob(row as JobRowWithTechnician),
    error: null,
    dispatchReactivated,
  };
}

export async function listDeletedJobs(companyId: string): Promise<Job[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_TECHNICIAN_SELECT)
    .eq("company_id", companyId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    console.error("[listDeletedJobs] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as JobRowWithTechnician[]).map(mapJobRowToJob);
}

export async function getJobDeleteDependencies(
  companyId: string,
  jobId: string,
): Promise<JobDeleteDependencies> {
  const supabase = await createClient();

  const [
    timeEntryCount,
    estimateCount,
    invoiceCount,
    expenseCount,
    paymentCount,
  ] = await Promise.all([
    countRelatedRecordsByColumn(supabase, companyId, "time_entries", "job_id", jobId),
    countRelatedRecordsByColumn(supabase, companyId, "estimates", "job_id", jobId),
    countRelatedRecordsByColumn(supabase, companyId, "invoices", "job_id", jobId),
    countRelatedRecordsByColumn(supabase, companyId, "expenses", "job_id", jobId),
    countInvoicePaymentsForJob(supabase, companyId, jobId),
  ]);

  return {
    timeEntryCount,
    estimateCount,
    invoiceCount,
    expenseCount,
    paymentCount,
  };
}

export async function archiveJob(
  companyId: string,
  jobId: string,
): Promise<{ job: Job | null; error: string | null }> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("jobs")
    .update({ archived_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", jobId)
    .is("archived_at", null)
    .is("deleted_at", null)
    .select(JOB_TECHNICIAN_SELECT)
    .maybeSingle();

  if (error) {
    return { job: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { job: null, error: "This job could not be archived." };
  }

  return { job: mapJobRowToJob(row as JobRowWithTechnician), error: null };
}

export async function restoreJob(
  companyId: string,
  jobId: string,
): Promise<{ job: Job | null; error: string | null }> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("jobs")
    .update({ archived_at: null })
    .eq("company_id", companyId)
    .eq("id", jobId)
    .not("archived_at", "is", null)
    .is("deleted_at", null)
    .select(JOB_TECHNICIAN_SELECT)
    .maybeSingle();

  if (error) {
    return { job: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { job: null, error: "This job is not archived." };
  }

  return { job: mapJobRowToJob(row as JobRowWithTechnician), error: null };
}

export async function cancelJob(
  companyId: string,
  jobId: string,
): Promise<{ job: Job | null; error: string | null }> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("jobs")
    .update({ status: "cancelled" satisfies JobStatus })
    .eq("company_id", companyId)
    .eq("id", jobId)
    .is("deleted_at", null)
    .neq("status", "cancelled")
    .neq("status", "completed")
    .select(JOB_TECHNICIAN_SELECT)
    .maybeSingle();

  if (error) {
    return { job: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { job: null, error: "This job could not be cancelled." };
  }

  return { job: mapJobRowToJob(row as JobRowWithTechnician), error: null };
}

export async function moveJobToTrash(
  companyId: string,
  jobId: string,
): Promise<{ job: Job | null; error: string | null }> {
  const supabase = await createClient();
  const trashFields = buildTrashTimestampFields();

  const { data: row, error } = await supabase
    .from("jobs")
    .update(trashFields)
    .eq("company_id", companyId)
    .eq("id", jobId)
    .is("deleted_at", null)
    .select(JOB_TECHNICIAN_SELECT)
    .maybeSingle();

  if (error) {
    return { job: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { job: null, error: "This job could not be moved to Recently Deleted." };
  }

  return { job: mapJobRowToJob(row as JobRowWithTechnician), error: null };
}

export async function restoreJobFromTrash(
  companyId: string,
  jobId: string,
): Promise<{ job: Job | null; error: string | null }> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("jobs")
    .update({
      deleted_at: null,
      delete_after: null,
      archived_at: null,
    })
    .eq("company_id", companyId)
    .eq("id", jobId)
    .not("deleted_at", "is", null)
    .select(JOB_TECHNICIAN_SELECT)
    .maybeSingle();

  if (error) {
    return { job: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { job: null, error: "This job is not in Recently Deleted." };
  }

  return { job: mapJobRowToJob(row as JobRowWithTechnician), error: null };
}

export async function permanentlyDeleteJob(
  companyId: string,
  jobId: string,
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("company_id", companyId)
    .eq("id", jobId)
    .not("deleted_at", "is", null);

  if (error) {
    return { success: false, error: mapDatabaseError(error) };
  }

  return { success: true, error: null };
}
