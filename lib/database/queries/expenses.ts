import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  ExpenseInsert,
  ExpenseRow,
} from "@/lib/database/types/core-tables";
import { buildTrashTimestampFields } from "@/lib/database/queries/entity-lifecycle-shared";
import { createSignedUrlsForPaths } from "@/lib/storage/signed-urls";
import type { Expense, ExpenseFormData, ExpenseStatus } from "@/shared/types/expense";
import {
  resolveExpenseReimbursable,
  type ExpensePaymentMethod,
} from "@/shared/types/expense";

import {
  resolveOptionalSubjectAttributionName,
  resolveSubjectAttributionName,
  type ProfileSummary,
} from "@/shared/lib/profile-attribution";

type JobSummary = {
  job_number: string;
  customer_id: string;
};

type ExpenseRowWithRelations = ExpenseRow & {
  technician: ProfileSummary | null;
  job: JobSummary | null;
};

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
    paymentMethod: row.payment_method,
    isReimbursable: row.is_reimbursable,
    technicianId: row.technician_id,
    technician: resolveSubjectAttributionName({
      profile: row.technician,
      subjectUserId: row.technician_id,
    }),
    customerId: row.customer_id ?? row.job?.customer_id ?? undefined,
    jobId: row.job_id ?? undefined,
    jobNumber: row.job?.job_number,
    receiptStatus: row.receipt_status,
    receiptFileName: row.receipt_file_name ?? undefined,
    receiptStoragePath: row.receipt_storage_path ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: toDateOnly(row.created_at),
    archivedAt: row.archived_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    deleteAfter: row.delete_after ?? undefined,
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

export type ListExpensesOptions = {
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

export const listExpenses = cache(async function listExpenses(
  companyId: string,
  options?: ListExpensesOptions,
): Promise<Expense[]> {
  const supabase = await createClient();
  const includeArchived = options?.includeArchived ?? false;
  const includeDeleted = options?.includeDeleted ?? false;

  let query = supabase
    .from("expenses")
    .select(EXPENSE_SELECT)
    .eq("company_id", companyId);

  if (!includeDeleted) {
    query = query.is("deleted_at", null);
  }

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

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
});

export async function listExpensesForTechnician(
  companyId: string,
  technicianId: string,
): Promise<Expense[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select(EXPENSE_SELECT)
    .eq("company_id", companyId)
    .eq("technician_id", technicianId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listExpensesForTechnician] query failed:", {
      companyId,
      technicianId,
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
  const paymentMethod: ExpensePaymentMethod = data.paymentMethod ?? "personal_card";
  const isReimbursable = resolveExpenseReimbursable({
    paymentMethod,
    isReimbursable: data.isReimbursable,
  });

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
    payment_method: paymentMethod,
    is_reimbursable: isReimbursable,
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

export async function updateExpenseStatus(
  companyId: string,
  expenseId: string,
  fromStatus: ExpenseStatus,
  toStatus: ExpenseStatus,
): Promise<{ expense: Expense | null; error: string | null }> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("expenses")
    .update({ status: toStatus })
    .eq("company_id", companyId)
    .eq("id", expenseId)
    .eq("status", fromStatus)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[updateExpenseStatus] update failed:", {
      companyId,
      expenseId,
      fromStatus,
      toStatus,
      code: error.code,
      message: error.message,
    });
    return { expense: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return {
      expense: null,
      error: "Expense status has changed. Refresh the page and try again.",
    };
  }

  const expense = await getExpenseById(companyId, expenseId);

  return {
    expense,
    error: expense ? null : "Failed to load updated expense.",
  };
}

export async function listDeletedExpenses(companyId: string): Promise<Expense[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select(EXPENSE_SELECT)
    .eq("company_id", companyId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    console.error("[listDeletedExpenses] query failed:", { companyId, error });
    return [];
  }

  const expenses = ((data ?? []) as ExpenseRowWithRelations[]).map(mapExpenseRow);
  return attachReceiptSignedUrls(expenses);
}

export async function archiveExpense(
  companyId: string,
  expenseId: string,
): Promise<{ expense: Expense | null; error: string | null }> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("expenses")
    .update({ archived_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", expenseId)
    .is("archived_at", null)
    .is("deleted_at", null)
    .select(EXPENSE_SELECT)
    .maybeSingle();

  if (error) {
    return { expense: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { expense: null, error: "This expense could not be archived." };
  }

  const [expense] = await attachReceiptSignedUrls([
    mapExpenseRow(row as ExpenseRowWithRelations),
  ]);

  return { expense: expense ?? null, error: null };
}

export async function restoreExpense(
  companyId: string,
  expenseId: string,
): Promise<{ expense: Expense | null; error: string | null }> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("expenses")
    .update({ archived_at: null })
    .eq("company_id", companyId)
    .eq("id", expenseId)
    .not("archived_at", "is", null)
    .is("deleted_at", null)
    .select(EXPENSE_SELECT)
    .maybeSingle();

  if (error) {
    return { expense: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { expense: null, error: "This expense is not archived." };
  }

  const [expense] = await attachReceiptSignedUrls([
    mapExpenseRow(row as ExpenseRowWithRelations),
  ]);

  return { expense: expense ?? null, error: null };
}

export async function moveExpenseToTrash(
  companyId: string,
  expenseId: string,
): Promise<{ expense: Expense | null; error: string | null }> {
  const supabase = await createClient();
  const trashFields = buildTrashTimestampFields();

  const { data: row, error } = await supabase
    .from("expenses")
    .update(trashFields)
    .eq("company_id", companyId)
    .eq("id", expenseId)
    .in("status", ["draft", "submitted", "rejected"])
    .is("deleted_at", null)
    .select(EXPENSE_SELECT)
    .maybeSingle();

  if (error) {
    return { expense: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return {
      expense: null,
      error: "Only draft, submitted, or rejected expenses can move to Recently Deleted.",
    };
  }

  const [expense] = await attachReceiptSignedUrls([
    mapExpenseRow(row as ExpenseRowWithRelations),
  ]);

  return { expense: expense ?? null, error: null };
}

export async function restoreExpenseFromTrash(
  companyId: string,
  expenseId: string,
): Promise<{ expense: Expense | null; error: string | null }> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("expenses")
    .update({
      deleted_at: null,
      delete_after: null,
      archived_at: null,
    })
    .eq("company_id", companyId)
    .eq("id", expenseId)
    .not("deleted_at", "is", null)
    .select(EXPENSE_SELECT)
    .maybeSingle();

  if (error) {
    return { expense: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return { expense: null, error: "This expense is not in Recently Deleted." };
  }

  const [expense] = await attachReceiptSignedUrls([
    mapExpenseRow(row as ExpenseRowWithRelations),
  ]);

  return { expense: expense ?? null, error: null };
}

export async function permanentlyDeleteExpense(
  companyId: string,
  expenseId: string,
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("company_id", companyId)
    .eq("id", expenseId)
    .not("deleted_at", "is", null);

  if (error) {
    return { success: false, error: mapDatabaseError(error) };
  }

  return { success: true, error: null };
}
