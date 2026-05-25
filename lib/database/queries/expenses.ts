import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  ExpenseInsert,
  ExpenseRow,
} from "@/lib/database/types/core-tables";
import { createSignedUrlsForPaths } from "@/lib/storage/signed-urls";
import type { Expense, ExpenseFormData } from "@/shared/types/expense";

type ProfileSummary = {
  full_name: string | null;
  email: string;
};

type JobSummary = {
  job_number: string;
  customer_id: string;
};

type ExpenseRowWithRelations = ExpenseRow & {
  technician: ProfileSummary | null;
  job: JobSummary | null;
};

function formatProfileName(
  profile: ProfileSummary | null | undefined,
): string {
  if (!profile) {
    return "Unknown";
  }

  return profile.full_name?.trim() || profile.email;
}

function toDateOnly(value: string): string {
  return value.split("T")[0] ?? value;
}

function mapExpenseRow(row: ExpenseRowWithRelations): Expense {
  return {
    id: row.id,
    expenseNumber: row.expense_number,
    amount: row.amount ?? undefined,
    purchaseDate: row.purchase_date ?? undefined,
    merchant: row.merchant,
    category: row.category,
    technicianId: row.technician_id,
    technician: formatProfileName(row.technician),
    customerId: row.customer_id ?? row.job?.customer_id ?? undefined,
    jobId: row.job_id ?? undefined,
    jobNumber: row.job?.job_number,
    receiptStatus: row.receipt_status,
    receiptFileName: row.receipt_file_name ?? undefined,
    receiptStoragePath: row.receipt_storage_path ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: toDateOnly(row.created_at),
  };
}

async function attachReceiptSignedUrls(expenses: Expense[]): Promise<Expense[]> {
  const receiptPaths = expenses
    .filter(
      (expense) =>
        expense.receiptStatus === "attached" && expense.receiptStoragePath,
    )
    .map((expense) => expense.receiptStoragePath as string);

  const signedUrls = await createSignedUrlsForPaths(receiptPaths);

  return expenses.map((expense) => ({
    ...expense,
    receiptSignedUrl: expense.receiptStoragePath
      ? signedUrls.get(expense.receiptStoragePath)
      : undefined,
  }));
}

const EXPENSE_SELECT = `
  *,
  technician:profiles!expenses_technician_id_fkey(full_name, email),
  job:jobs(job_number, customer_id)
`;

async function generateExpenseNumber(companyId: string): Promise<string> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("expenses")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (error) {
    console.error("[generateExpenseNumber] count failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return `EXP-${Date.now()}`;
  }

  return `EXP-${1013 + (count ?? 0)}`;
}

export async function listExpenses(companyId: string): Promise<Expense[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select(EXPENSE_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listExpenses] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  const expenses = ((data ?? []) as ExpenseRowWithRelations[]).map(mapExpenseRow);
  return attachReceiptSignedUrls(expenses);
}

export async function listExpensesForJob(
  companyId: string,
  jobId: string,
): Promise<Expense[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select(EXPENSE_SELECT)
    .eq("company_id", companyId)
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listExpensesForJob] query failed:", {
      companyId,
      jobId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  const expenses = ((data ?? []) as ExpenseRowWithRelations[]).map(mapExpenseRow);
  return attachReceiptSignedUrls(expenses);
}

export async function listRecentExpensesForCustomer(
  companyId: string,
  customerId: string,
  options?: { limit?: number; withReceiptOnly?: boolean },
): Promise<Expense[]> {
  const supabase = await createClient();
  const limit = options?.limit ?? 6;

  let query = supabase
    .from("expenses")
    .select(EXPENSE_SELECT)
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.withReceiptOnly) {
    query = query.eq("receipt_status", "attached");
  }

  const { data, error } = await query;

  if (error) {
    console.error("[listRecentExpensesForCustomer] query failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  const expenses = ((data ?? []) as ExpenseRowWithRelations[]).map(mapExpenseRow);
  return attachReceiptSignedUrls(expenses);
}

export async function getExpenseById(
  companyId: string,
  expenseId: string,
): Promise<Expense | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select(EXPENSE_SELECT)
    .eq("company_id", companyId)
    .eq("id", expenseId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const [expense] = await attachReceiptSignedUrls([
    mapExpenseRow(data as ExpenseRowWithRelations),
  ]);

  return expense;
}

export async function createExpense(
  companyId: string,
  technicianId: string,
  data: ExpenseFormData,
  options?: {
    expenseId?: string;
    customerId?: string | null;
    receiptFileName?: string;
    receiptStoragePath?: string;
  },
): Promise<{ expense: Expense | null; error: string | null }> {
  const supabase = await createClient();
  const expenseNumber = await generateExpenseNumber(companyId);

  const insert: ExpenseInsert = {
    id: options?.expenseId,
    company_id: companyId,
    customer_id: options?.customerId ?? null,
    job_id: data.jobId ?? null,
    technician_id: technicianId,
    expense_number: expenseNumber,
    amount: data.amount ?? null,
    purchase_date: data.purchaseDate?.trim() || null,
    merchant: data.merchant?.trim() || "",
    category: data.category,
    receipt_status: options?.receiptStoragePath ? "attached" : "missing",
    receipt_file_name: options?.receiptFileName ?? null,
    receipt_storage_path: options?.receiptStoragePath ?? null,
    status: "draft",
    notes: data.notes?.trim() || null,
  };

  const { data: row, error } = await supabase
    .from("expenses")
    .insert(insert)
    .select(EXPENSE_SELECT)
    .single();

  if (error || !row) {
    console.error("[createExpense] insert failed:", {
      companyId,
      code: error?.code,
      message: error?.message,
    });
    return {
      expense: null,
      error: mapDatabaseError(error ?? { message: "Insert failed." }),
    };
  }

  const [expense] = await attachReceiptSignedUrls([
    mapExpenseRow(row as ExpenseRowWithRelations),
  ]);

  return { expense, error: null };
}

export async function attachReceiptToExpense(
  companyId: string,
  expenseId: string,
  input: {
    receiptFileName: string;
    receiptStoragePath: string;
  },
): Promise<{ expense: Expense | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .update({
      receipt_status: "attached",
      receipt_file_name: input.receiptFileName,
      receipt_storage_path: input.receiptStoragePath,
    })
    .eq("company_id", companyId)
    .eq("id", expenseId)
    .select(EXPENSE_SELECT)
    .single();

  if (error || !data) {
    console.error("[attachReceiptToExpense] update failed:", {
      companyId,
      expenseId,
      code: error?.code,
      message: error?.message,
    });
    return {
      expense: null,
      error: mapDatabaseError(error ?? { message: "Update failed." }),
    };
  }

  const [expense] = await attachReceiptSignedUrls([
    mapExpenseRow(data as ExpenseRowWithRelations),
  ]);

  return { expense, error: null };
}
