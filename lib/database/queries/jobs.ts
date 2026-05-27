import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type { JobInsert, JobRow, JobUpdate } from "@/lib/database/types/core-tables";
import type { Job, JobDetail, JobFormData, JobStatus } from "@/shared/types/job";
import type {
  JobWorkflowActionId,
  JobWorkflowCompletionPayload,
} from "@/shared/types/job-workflow";

type ProfileSummary = {
  full_name: string | null;
  email: string;
};

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

function formatProfileName(
  profile: ProfileSummary | null | undefined,
): string | undefined {
  if (!profile) {
    return undefined;
  }

  return profile.full_name?.trim() || profile.email;
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
    assignedTechnician: formatProfileName(row.assigned_technician),
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
    ...technician,
  };
}

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

export async function listJobs(companyId: string): Promise<Job[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_TECHNICIAN_SELECT)
    .eq("company_id", companyId)
    .order("scheduled_at", { ascending: false });

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

  return {
    job: mapJobRowToJob(row as JobRowWithTechnician),
    error: null,
  };
}
