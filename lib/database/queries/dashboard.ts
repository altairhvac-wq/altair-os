import { createClient } from "@/lib/supabase/server";
import type { OperationalActivity } from "@/shared/types/operational-activity";
import {
  buildOperationalActivity,
  sortActivitiesNewestFirst,
} from "@/lib/database/queries/operational-activities";

const RECENT_ACTIVITY_PER_SOURCE = 8;
const RECENT_ACTIVITY_LIMIT = 12;

type ProfileSummary = {
  full_name: string | null;
  email: string;
};

type ActivityRowBase = {
  id: string;
  actor_id: string | null;
  event_type: string;
  metadata: unknown;
  created_at: string;
  actor: ProfileSummary | null;
};

async function listRecentJobActivities(
  companyId: string,
  limit: number,
): Promise<OperationalActivity[]> {
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
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listRecentJobActivities] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? []).map((row) =>
    buildOperationalActivity({
      source: "job",
      row: row as ActivityRowBase,
      jobId: row.job_id,
    }),
  );
}

async function listRecentEstimateActivities(
  companyId: string,
  limit: number,
): Promise<OperationalActivity[]> {
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
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listRecentEstimateActivities] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? []).map((row) =>
    buildOperationalActivity({
      source: "estimate",
      row: row as ActivityRowBase,
      estimateId: row.estimate_id,
    }),
  );
}

async function listRecentInvoiceActivities(
  companyId: string,
  limit: number,
): Promise<OperationalActivity[]> {
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
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listRecentInvoiceActivities] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? []).map((row) =>
    buildOperationalActivity({
      source: "invoice",
      row: row as ActivityRowBase,
      invoiceId: row.invoice_id,
    }),
  );
}

async function listRecentExpenseActivities(
  companyId: string,
  limit: number,
): Promise<OperationalActivity[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expense_activities")
    .select(
      `
      *,
      actor:profiles!expense_activities_actor_id_fkey(full_name, email)
    `,
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listRecentExpenseActivities] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? []).map((row) =>
    buildOperationalActivity({
      source: "expense",
      row: row as ActivityRowBase,
      expenseId: row.expense_id,
    }),
  );
}

async function listRecentCustomerActivities(
  companyId: string,
  limit: number,
): Promise<OperationalActivity[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customer_activities")
    .select(
      `
      *,
      actor:profiles!customer_activities_actor_id_fkey(full_name, email)
    `,
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listRecentCustomerActivities] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? []).map((row) =>
    buildOperationalActivity({
      source: "customer",
      row: row as ActivityRowBase,
      customerId: row.customer_id,
    }),
  );
}

export async function listRecentOperationalActivitiesForCompany(
  companyId: string,
  limit = RECENT_ACTIVITY_LIMIT,
): Promise<OperationalActivity[]> {
  const perSource = RECENT_ACTIVITY_PER_SOURCE;

  const [
    jobActivities,
    estimateActivities,
    invoiceActivities,
    expenseActivities,
    customerActivities,
  ] = await Promise.all([
    listRecentJobActivities(companyId, perSource),
    listRecentEstimateActivities(companyId, perSource),
    listRecentInvoiceActivities(companyId, perSource),
    listRecentExpenseActivities(companyId, perSource),
    listRecentCustomerActivities(companyId, perSource),
  ]);

  return sortActivitiesNewestFirst([
    ...jobActivities,
    ...estimateActivities,
    ...invoiceActivities,
    ...expenseActivities,
    ...customerActivities,
  ]).slice(0, limit);
}
