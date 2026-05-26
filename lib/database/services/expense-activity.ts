import { recordExpenseActivity } from "@/lib/database/queries/expense-activities";
import type { Expense, ExpenseStatus } from "@/shared/types/expense";

function buildExpenseActivityMetadata(expense: Expense) {
  return {
    expense_id: expense.id,
    expense_number: expense.expenseNumber,
    amount: expense.amount,
    merchant: expense.merchant,
    purchase_date: expense.purchaseDate,
    payment_method: expense.paymentMethod,
    is_reimbursable: expense.isReimbursable,
    job_id: expense.jobId,
    customer_id: expense.customerId,
    category: expense.category,
    status: expense.status,
  };
}

export async function recordExpenseCreatedActivity(input: {
  companyId: string;
  expenseId: string;
  actorId: string;
  expense: Expense;
}): Promise<void> {
  const { error } = await recordExpenseActivity({
    company_id: input.companyId,
    expense_id: input.expenseId,
    actor_id: input.actorId,
    event_type: "expense_created",
    metadata: buildExpenseActivityMetadata(input.expense),
  });

  if (error) {
    console.error("[recordExpenseCreatedActivity] failed:", {
      expenseId: input.expenseId,
      error,
    });
  }
}

export async function recordExpenseReceiptUploadedActivity(input: {
  companyId: string;
  expenseId: string;
  actorId: string;
  expense: Expense;
}): Promise<void> {
  const { error } = await recordExpenseActivity({
    company_id: input.companyId,
    expense_id: input.expenseId,
    actor_id: input.actorId,
    event_type: "expense_receipt_uploaded",
    metadata: {
      ...buildExpenseActivityMetadata(input.expense),
      file_name: input.expense.receiptFileName,
    },
  });

  if (error) {
    console.error("[recordExpenseReceiptUploadedActivity] failed:", {
      expenseId: input.expenseId,
      error,
    });
  }
}

async function recordExpenseStatusActivity(input: {
  companyId: string;
  expenseId: string;
  actorId: string;
  expense: Expense;
  fromStatus: ExpenseStatus;
  toStatus: ExpenseStatus;
  eventType:
    | "expense_submitted"
    | "expense_approved"
    | "expense_rejected"
    | "expense_reimbursed";
  rejectionReason?: string;
}): Promise<void> {
  const { error } = await recordExpenseActivity({
    company_id: input.companyId,
    expense_id: input.expenseId,
    actor_id: input.actorId,
    event_type: input.eventType,
    metadata: {
      ...buildExpenseActivityMetadata(input.expense),
      from_status: input.fromStatus,
      to_status: input.toStatus,
      rejection_reason: input.rejectionReason?.trim() || undefined,
    },
  });

  if (error) {
    console.error("[recordExpenseStatusActivity] failed:", {
      expenseId: input.expenseId,
      eventType: input.eventType,
      error,
    });
  }
}

export async function recordExpenseSubmittedActivity(input: {
  companyId: string;
  expenseId: string;
  actorId: string;
  expense: Expense;
  fromStatus: ExpenseStatus;
}): Promise<void> {
  await recordExpenseStatusActivity({
    ...input,
    toStatus: "submitted",
    eventType: "expense_submitted",
  });
}

export async function recordExpenseApprovedActivity(input: {
  companyId: string;
  expenseId: string;
  actorId: string;
  expense: Expense;
  fromStatus: ExpenseStatus;
}): Promise<void> {
  await recordExpenseStatusActivity({
    ...input,
    toStatus: "approved",
    eventType: "expense_approved",
  });
}

export async function recordExpenseRejectedActivity(input: {
  companyId: string;
  expenseId: string;
  actorId: string;
  expense: Expense;
  fromStatus: ExpenseStatus;
  rejectionReason?: string;
}): Promise<void> {
  await recordExpenseStatusActivity({
    ...input,
    toStatus: "rejected",
    eventType: "expense_rejected",
  });
}

export async function recordExpenseReimbursedActivity(input: {
  companyId: string;
  expenseId: string;
  actorId: string;
  expense: Expense;
  fromStatus: ExpenseStatus;
}): Promise<void> {
  await recordExpenseStatusActivity({
    ...input,
    toStatus: "reimbursed",
    eventType: "expense_reimbursed",
  });
}
