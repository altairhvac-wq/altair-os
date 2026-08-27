import { createClient } from "@/lib/supabase/server";
import { selectInChunks } from "@/lib/database/queries/chunked-in";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  ExpenseActivityInsert,
  ExpenseActivityRow,
} from "@/lib/database/types/core-tables";

/**
 * The activity feeds select `*` plus a joined actor. Naming the fields the
 * callers actually read keeps this typed: widening it to Record<string,
 * unknown> compiles here and pushes the failure into
 * lib/database/queries/operational-activities.ts, which reads these fields.
 */
type ExpenseActivityFeedRow = ExpenseActivityRow & {
  actor: unknown;
};

/**
 * selectInChunks concatenates chunks in completion order, so a feed that must
 * be globally chronological has to be re-sorted. Cheap: these lists are one
 * page of activity, not a table scan.
 */
function sortByCreatedAtDesc(
  rows: ExpenseActivityFeedRow[] | null,
): ExpenseActivityFeedRow[] {
  return [...(rows ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function recordExpenseActivity(
  input: ExpenseActivityInsert,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.from("expense_activities").insert({
    company_id: input.company_id,
    expense_id: input.expense_id,
    actor_id: input.actor_id ?? null,
    event_type: input.event_type,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[recordExpenseActivity] insert failed:", {
      companyId: input.company_id,
      expenseId: input.expense_id,
      eventType: input.event_type,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  return { error: null };
}

export async function listExpenseActivitiesForExpense(
  companyId: string,
  expenseId: string,
) {
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
    .eq("expense_id", expenseId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listExpenseActivitiesForExpense] query failed:", {
      companyId,
      expenseId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return data ?? [];
}

export async function listExpenseActivitiesForJob(
  companyId: string,
  jobId: string,
) {
  const supabase = await createClient();

  const { data: expenses, error: expenseError } = await supabase
    .from("expenses")
    .select("id")
    .eq("company_id", companyId)
    .eq("job_id", jobId);

  if (expenseError || !expenses?.length) {
    return [];
  }

  const expenseIds = expenses.map((expense) => expense.id);

  // Chunked — see lib/database/queries/chunked-in.ts.
  //
  // Unlike the estimate and lead equivalents, this one returns a FLAT feed
  // rather than one row per id, so chunking really does lose the global
  // created_at ordering. It is restored explicitly below.
  const { data, error } = await selectInChunks<ExpenseActivityFeedRow>(
    expenseIds,
    (chunk) =>
      supabase
        .from("expense_activities")
        .select(
          `
      *,
      actor:profiles!expense_activities_actor_id_fkey(full_name, email)
    `,
        )
        .eq("company_id", companyId)
        .in("expense_id", chunk)
        .order("created_at", { ascending: false }),
  );

  if (error) {
    console.error("[listExpenseActivitiesForJob] query failed:", {
      companyId,
      jobId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return sortByCreatedAtDesc(data);
}

export async function listExpenseActivitiesForCustomer(
  companyId: string,
  customerId: string,
) {
  const supabase = await createClient();

  const { data: expenses, error: expenseError } = await supabase
    .from("expenses")
    .select("id")
    .eq("company_id", companyId)
    .eq("customer_id", customerId);

  if (expenseError || !expenses?.length) {
    return [];
  }

  const expenseIds = expenses.map((expense) => expense.id);

  // Chunked — see lib/database/queries/chunked-in.ts.
  //
  // Unlike the estimate and lead equivalents, this one returns a FLAT feed
  // rather than one row per id, so chunking really does lose the global
  // created_at ordering. It is restored explicitly below.
  const { data, error } = await selectInChunks<ExpenseActivityFeedRow>(
    expenseIds,
    (chunk) =>
      supabase
        .from("expense_activities")
        .select(
          `
      *,
      actor:profiles!expense_activities_actor_id_fkey(full_name, email)
    `,
        )
        .eq("company_id", companyId)
        .in("expense_id", chunk)
        .order("created_at", { ascending: false }),
  );

  if (error) {
    console.error("[listExpenseActivitiesForCustomer] query failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return sortByCreatedAtDesc(data);
}
