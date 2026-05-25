export type ExpenseStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "reimbursed";

export type ExpenseCategory =
  | "materials"
  | "fuel"
  | "tools"
  | "meals"
  | "lodging"
  | "vehicle"
  | "office"
  | "other";

export type ReceiptStatus = "missing" | "attached" | "pending";

export type Expense = {
  id: string;
  expenseNumber: string;
  amount: number;
  purchaseDate: string;
  merchant: string;
  category: ExpenseCategory;
  technician: string;
  jobId?: string;
  jobNumber?: string;
  receiptStatus: ReceiptStatus;
  receiptFileName?: string;
  status: ExpenseStatus;
  notes?: string;
  createdAt: string;
};

export type ExpenseFormData = {
  amount: number;
  purchaseDate: string;
  merchant: string;
  category: ExpenseCategory;
  technician: string;
  jobNumber: string;
  status: ExpenseStatus;
  notes: string;
};

export const EXPENSE_STATUS_OPTIONS: {
  value: ExpenseStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "reimbursed", label: "Reimbursed" },
];

export const EXPENSE_CATEGORY_OPTIONS: {
  value: ExpenseCategory | "all";
  label: string;
}[] = [
  { value: "all", label: "All categories" },
  { value: "materials", label: "Materials" },
  { value: "fuel", label: "Fuel" },
  { value: "tools", label: "Tools" },
  { value: "meals", label: "Meals" },
  { value: "lodging", label: "Lodging" },
  { value: "vehicle", label: "Vehicle" },
  { value: "office", label: "Office" },
  { value: "other", label: "Other" },
];

export const RECEIPT_STATUS_OPTIONS: {
  value: ReceiptStatus;
  label: string;
}[] = [
  { value: "missing", label: "Missing" },
  { value: "pending", label: "Pending review" },
  { value: "attached", label: "Attached" },
];

export function formatExpenseStatus(status: ExpenseStatus): string {
  return (
    EXPENSE_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  );
}

export function formatExpenseCategory(category: ExpenseCategory): string {
  return (
    EXPENSE_CATEGORY_OPTIONS.find((option) => option.value === category)
      ?.label ?? category
  );
}

export function formatReceiptStatus(status: ReceiptStatus): string {
  return (
    RECEIPT_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  );
}

export function getExpenseSummary(expenses: Expense[]) {
  const submittedTotal = expenses
    .filter((expense) => expense.status === "submitted")
    .reduce((sum, expense) => sum + expense.amount, 0);

  const approvedTotal = expenses
    .filter((expense) => expense.status === "approved")
    .reduce((sum, expense) => sum + expense.amount, 0);

  const reimbursableTotal = approvedTotal;

  const totalSpent = expenses
    .filter(
      (expense) =>
        expense.status === "approved" || expense.status === "reimbursed",
    )
    .reduce((sum, expense) => sum + expense.amount, 0);

  return { submittedTotal, approvedTotal, reimbursableTotal, totalSpent };
}
