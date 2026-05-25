import { recordExpenseActivity } from "@/lib/database/queries/expense-activities";
import type { Expense } from "@/shared/types/expense";

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
      expense_id: input.expenseId,
      expense_number: input.expense.expenseNumber,
      file_name: input.expense.receiptFileName,
      amount: input.expense.amount,
      merchant: input.expense.merchant,
      purchase_date: input.expense.purchaseDate,
      job_id: input.expense.jobId,
      customer_id: input.expense.customerId,
      category: input.expense.category,
    },
  });

  if (error) {
    console.error("[recordExpenseReceiptUploadedActivity] failed:", {
      expenseId: input.expenseId,
      error,
    });
  }
}
