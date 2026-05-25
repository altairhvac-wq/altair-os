import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type { ExpenseActivityInsert } from "@/lib/database/types/core-tables";

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

  const { data, error } = await supabase
    .from("expense_activities")
    .select(
      `
      *,
      actor:profiles!expense_activities_actor_id_fkey(full_name, email)
    `,
    )
    .eq("company_id", companyId)
    .in("expense_id", expenseIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listExpenseActivitiesForJob] query failed:", {
      companyId,
      jobId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return data ?? [];
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

  const { data, error } = await supabase
    .from("expense_activities")
    .select(
      `
      *,
      actor:profiles!expense_activities_actor_id_fkey(full_name, email)
    `,
    )
    .eq("company_id", companyId)
    .in("expense_id", expenseIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listExpenseActivitiesForCustomer] query failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return data ?? [];
}
