import { createClient } from "@/lib/supabase/server";
import { listCustomerActivitiesForCustomer } from "@/lib/database/queries/customer-activities";
import { listExpenseActivitiesForCustomer, listExpenseActivitiesForJob } from "@/lib/database/queries/expense-activities";
import type { CustomerActivity } from "@/shared/types/customer-activity";
import type { EstimateActivity } from "@/shared/types/estimate-activity";
import type { InvoiceActivity } from "@/shared/types/invoice-activity";
import type { JobActivity } from "@/shared/types/job-activity";
import type {
  OperationalActivity,
  OperationalActivityMetadata,
  OperationalActivitySource,
} from "@/shared/types/operational-activity";
import {
  resolveActivityActorName,
  type ProfileSummary,
} from "@/shared/lib/profile-attribution";
import { normalizeOperationalEventType } from "@/shared/types/operational-activity";

type ActivityRowBase = {
  id: string;
  actor_id: string | null;
  event_type: string;
  metadata: unknown;
  created_at: string;
  actor: ProfileSummary | null;
};

function mapMetadata(value: unknown): OperationalActivityMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as OperationalActivityMetadata;
}

export function buildOperationalActivity(input: {
  source: OperationalActivitySource;
  row: ActivityRowBase;
  customerId?: string;
  jobId?: string;
  estimateId?: string;
  invoiceId?: string;
  expenseId?: string;
}): OperationalActivity {
  const metadata = mapMetadata(input.row.metadata);
  const eventType = normalizeOperationalEventType(
    input.source,
    input.row.event_type,
  );

  return {
    id: `${input.source}:${input.row.id}`,
    source: input.source,
    eventType,
    rawEventType: input.row.event_type,
    metadata,
    actorId: input.row.actor_id ?? undefined,
    actorName: resolveActivityActorName({
      profile: input.row.actor,
      actorId: input.row.actor_id,
      metadata,
    }),
    createdAt: input.row.created_at,
    customerId: input.customerId ?? metadata.customer_id,
    jobId: input.jobId ?? metadata.job_id,
    estimateId: input.estimateId ?? metadata.estimate_id,
    invoiceId: input.invoiceId ?? metadata.invoice_id,
    paymentId: metadata.payment_id,
    expenseId: input.expenseId ?? metadata.expense_id,
  };
}

function fromCustomerActivity(activity: CustomerActivity): OperationalActivity {
  return buildOperationalActivity({
    source: "customer",
    row: {
      id: activity.id,
      actor_id: activity.actorId ?? null,
      event_type: activity.eventType,
      metadata: activity.metadata,
      created_at: activity.createdAt,
      actor: activity.actorName
        ? { full_name: activity.actorName, email: activity.actorName }
        : null,
    },
    customerId: activity.customerId,
  });
}

function fromJobActivity(
  activity: JobActivity,
  customerId?: string,
): OperationalActivity {
  return buildOperationalActivity({
    source: "job",
    row: {
      id: activity.id,
      actor_id: activity.actorId ?? null,
      event_type: activity.eventType,
      metadata: activity.metadata,
      created_at: activity.createdAt,
      actor: activity.actorName
        ? { full_name: activity.actorName, email: activity.actorName }
        : null,
    },
    customerId,
    jobId: activity.jobId,
  });
}

function fromEstimateActivity(
  activity: EstimateActivity,
  customerId?: string,
): OperationalActivity {
  return buildOperationalActivity({
    source: "estimate",
    row: {
      id: activity.id,
      actor_id: activity.actorId ?? null,
      event_type: activity.eventType,
      metadata: activity.metadata,
      created_at: activity.createdAt,
      actor: activity.actorName
        ? { full_name: activity.actorName, email: activity.actorName }
        : null,
    },
    customerId,
    estimateId: activity.estimateId,
    jobId: activity.metadata.job_id,
    invoiceId: activity.metadata.invoice_id,
  });
}

function fromInvoiceActivity(
  activity: InvoiceActivity,
  customerId?: string,
): OperationalActivity {
  return buildOperationalActivity({
    source: "invoice",
    row: {
      id: activity.id,
      actor_id: activity.actorId ?? null,
      event_type: activity.eventType,
      metadata: activity.metadata,
      created_at: activity.createdAt,
      actor: activity.actorName
        ? { full_name: activity.actorName, email: activity.actorName }
        : null,
    },
    customerId,
    invoiceId: activity.invoiceId,
    jobId: activity.metadata.job_id,
    estimateId: activity.metadata.estimate_id,
  });
}

function fromExpenseActivityRow(
  row: ActivityRowBase & { expense_id: string },
  customerId?: string,
): OperationalActivity {
  const metadata = mapMetadata(row.metadata);

  return buildOperationalActivity({
    source: "expense",
    row,
    customerId: customerId ?? metadata.customer_id,
    jobId: metadata.job_id,
    expenseId: row.expense_id,
  });
}

export async function listJobActivitiesForJobIds(
  companyId: string,
  jobIds: string[],
): Promise<JobActivity[]> {
  if (jobIds.length === 0) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_activities")
    .select(
      `
      *,
      actor:profiles!job_activities_actor_id_fkey(full_name, email)
    `,
    )
    .eq("company_id", companyId)
    .in("job_id", jobIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listJobActivitiesForJobIds] query failed:", {
      companyId,
      jobIds,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    jobId: row.job_id,
    eventType: row.event_type,
    metadata: mapMetadata(row.metadata) as JobActivity["metadata"],
    actorId: row.actor_id ?? undefined,
    actorName: resolveActivityActorName({
      profile: row.actor as ProfileSummary | null,
      actorId: row.actor_id,
      metadata: mapMetadata(row.metadata),
    }),
    createdAt: row.created_at,
  }));
}

async function listEstimateActivitiesForEstimateIds(
  companyId: string,
  estimateIds: string[],
): Promise<EstimateActivity[]> {
  if (estimateIds.length === 0) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("estimate_activities")
    .select(
      `
      *,
      actor:profiles!estimate_activities_actor_id_fkey(full_name, email)
    `,
    )
    .eq("company_id", companyId)
    .in("estimate_id", estimateIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listEstimateActivitiesForEstimateIds] query failed:", {
      companyId,
      estimateIds,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    estimateId: row.estimate_id,
    eventType: row.event_type,
    metadata: mapMetadata(row.metadata) as EstimateActivity["metadata"],
    actorId: row.actor_id ?? undefined,
    actorName: resolveActivityActorName({
      profile: row.actor as ProfileSummary | null,
      actorId: row.actor_id,
      metadata: mapMetadata(row.metadata),
    }),
    createdAt: row.created_at,
  }));
}

async function listInvoiceActivitiesForInvoiceIds(
  companyId: string,
  invoiceIds: string[],
): Promise<InvoiceActivity[]> {
  if (invoiceIds.length === 0) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoice_activities")
    .select(
      `
      *,
      actor:profiles!invoice_activities_actor_id_fkey(full_name, email)
    `,
    )
    .eq("company_id", companyId)
    .in("invoice_id", invoiceIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listInvoiceActivitiesForInvoiceIds] query failed:", {
      companyId,
      invoiceIds,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    invoiceId: row.invoice_id,
    eventType: row.event_type,
    metadata: mapMetadata(row.metadata) as InvoiceActivity["metadata"],
    actorId: row.actor_id ?? undefined,
    actorName: resolveActivityActorName({
      profile: row.actor as ProfileSummary | null,
      actorId: row.actor_id,
      metadata: mapMetadata(row.metadata),
    }),
    createdAt: row.created_at,
  }));
}

export function sortActivitiesNewestFirst(
  activities: OperationalActivity[],
): OperationalActivity[] {
  return [...activities].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function listOperationalActivitiesForCustomer(
  companyId: string,
  customerId: string,
): Promise<OperationalActivity[]> {
  const supabase = await createClient();

  const [customerActivities, jobRows, estimateRows, invoiceRows] =
    await Promise.all([
      listCustomerActivitiesForCustomer(companyId, customerId),
      supabase
        .from("jobs")
        .select("id")
        .eq("company_id", companyId)
        .eq("customer_id", customerId),
      supabase
        .from("estimates")
        .select("id")
        .eq("company_id", companyId)
        .eq("customer_id", customerId),
      supabase
        .from("invoices")
        .select("id")
        .eq("company_id", companyId)
        .eq("customer_id", customerId),
    ]);

  const jobIds = (jobRows.data ?? []).map((row) => row.id);
  const estimateIds = (estimateRows.data ?? []).map((row) => row.id);
  const invoiceIds = (invoiceRows.data ?? []).map((row) => row.id);

  const [jobActivities, estimateActivities, invoiceActivities, expenseActivities] =
    await Promise.all([
      listJobActivitiesForJobIds(companyId, jobIds),
      listEstimateActivitiesForEstimateIds(companyId, estimateIds),
      listInvoiceActivitiesForInvoiceIds(companyId, invoiceIds),
      listExpenseActivitiesForCustomer(companyId, customerId),
    ]);

  const activities = [
    ...customerActivities.map(fromCustomerActivity),
    ...jobActivities.map((activity) => fromJobActivity(activity, customerId)),
    ...estimateActivities.map((activity) =>
      fromEstimateActivity(activity, customerId),
    ),
    ...invoiceActivities.map((activity) =>
      fromInvoiceActivity(activity, customerId),
    ),
    ...expenseActivities.map((row) =>
      fromExpenseActivityRow(
        {
          id: row.id,
          actor_id: row.actor_id,
          event_type: row.event_type,
          metadata: row.metadata,
          created_at: row.created_at,
          actor: row.actor as ProfileSummary | null,
          expense_id: row.expense_id,
        },
        customerId,
      ),
    ),
  ];

  return sortActivitiesNewestFirst(activities);
}

export async function listOperationalActivitiesForJob(
  companyId: string,
  jobId: string,
): Promise<OperationalActivity[]> {
  const supabase = await createClient();

  const [jobRow, estimateRows, invoiceRows] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, customer_id")
      .eq("company_id", companyId)
      .eq("id", jobId)
      .maybeSingle(),
    supabase
      .from("estimates")
      .select("id")
      .eq("company_id", companyId)
      .eq("job_id", jobId),
    supabase
      .from("invoices")
      .select("id")
      .eq("company_id", companyId)
      .eq("job_id", jobId),
  ]);

  if (!jobRow.data) {
    return [];
  }

  const customerId = jobRow.data.customer_id;
  const estimateIds = (estimateRows.data ?? []).map((row) => row.id);
  const invoiceIds = (invoiceRows.data ?? []).map((row) => row.id);

  const [jobActivities, estimateActivities, invoiceActivities, expenseActivities] =
    await Promise.all([
      listJobActivitiesForJobIds(companyId, [jobId]),
      listEstimateActivitiesForEstimateIds(companyId, estimateIds),
      listInvoiceActivitiesForInvoiceIds(companyId, invoiceIds),
      listExpenseActivitiesForJob(companyId, jobId),
    ]);

  const activities = [
    ...jobActivities.map((activity) => fromJobActivity(activity, customerId)),
    ...estimateActivities.map((activity) =>
      fromEstimateActivity(activity, customerId),
    ),
    ...invoiceActivities.map((activity) =>
      fromInvoiceActivity(activity, customerId),
    ),
    ...expenseActivities.map((row) =>
      fromExpenseActivityRow(
        {
          id: row.id,
          actor_id: row.actor_id,
          event_type: row.event_type,
          metadata: row.metadata,
          created_at: row.created_at,
          actor: row.actor as ProfileSummary | null,
          expense_id: row.expense_id,
        },
        customerId,
      ),
    ),
  ];

  return sortActivitiesNewestFirst(activities);
}
