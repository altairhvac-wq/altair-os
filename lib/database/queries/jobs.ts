import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type { JobInsert, JobRow } from "@/lib/database/types/core-tables";
import type { Job, JobDetail, JobFormData } from "@/shared/types/job";

type JobRowWithCustomer = JobRow & {
  customers: {
    name: string;
    email: string;
    phone: string;
    company_name: string | null;
  } | null;
};

function toDateOnly(value: string): string {
  return value.split("T")[0] ?? value;
}

export function mapJobRowToJob(row: JobRowWithCustomer): Job {
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
    createdAt: toDateOnly(row.created_at),
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

export function mapJobFormDataToInsert(
  companyId: string,
  jobNumber: string,
  data: JobFormData,
): JobInsert {
  return {
    company_id: companyId,
    customer_id: data.customerId,
    job_number: jobNumber,
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

export async function listJobs(companyId: string): Promise<Job[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("*, customers(name)")
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

  return ((data ?? []) as JobRowWithCustomer[]).map(mapJobRowToJob);
}

export async function listJobsByCustomer(
  companyId: string,
  customerId: string,
  limit = 10,
): Promise<Job[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("*, customers(name)")
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

  return ((data ?? []) as JobRowWithCustomer[]).map(mapJobRowToJob);
}

function mapJobRowToJobDetail(row: JobRowWithCustomer): JobDetail {
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
    .select("*, customers(name, email, phone, company_name)")
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

  return mapJobRowToJobDetail(data as JobRowWithCustomer);
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
    .select("*, customers(name)")
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
    job: mapJobRowToJob(row as JobRowWithCustomer),
    error: null,
  };
}
