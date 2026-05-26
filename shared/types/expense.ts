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

export type ExpensePaymentMethod =
  | "company_card"
  | "personal_card"
  | "cash"
  | "other";

export type Expense = {
  id: string;
  expenseNumber: string;
  amount?: number;
  purchaseDate?: string;
  merchant: string;
  category: ExpenseCategory;
  paymentMethod: ExpensePaymentMethod;
  isReimbursable: boolean;
  technicianId: string;
  technician: string;
  customerId?: string;
  jobId?: string;
  jobNumber?: string;
  receiptStatus: ReceiptStatus;
  receiptFileName?: string;
  receiptStoragePath?: string;
  receiptSignedUrl?: string;
  status: ExpenseStatus;
  notes?: string;
  createdAt: string;
};

export type ExpenseFormData = {
  amount?: number;
  purchaseDate?: string;
  merchant?: string;
  category: ExpenseCategory;
  paymentMethod?: ExpensePaymentMethod;
  isReimbursable?: boolean;
  jobId?: string;
  notes?: string;
};

export const EXPENSE_PAYMENT_METHOD_OPTIONS: {
  value: ExpensePaymentMethod;
  label: string;
  description: string;
}[] = [
  {
    value: "company_card",
    label: "Company card",
    description: "Paid on a company account",
  },
  {
    value: "personal_card",
    label: "Personal card",
    description: "Technician paid personally",
  },
  {
    value: "cash",
    label: "Cash",
    description: "Out-of-pocket cash purchase",
  },
  {
    value: "other",
    label: "Other",
    description: "Other payment method",
  },
];

export const EXPENSE_RECEIPT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

export const EXPENSE_RECEIPT_MAX_FILE_SIZE = 10 * 1024 * 1024;

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

export function formatExpensePaymentMethod(method: ExpensePaymentMethod): string {
  return (
    EXPENSE_PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)
      ?.label ?? method
  );
}

export function deriveIsReimbursable(
  paymentMethod: ExpensePaymentMethod,
): boolean {
  return paymentMethod !== "company_card";
}

export function resolveExpenseReimbursable(input: {
  paymentMethod: ExpensePaymentMethod;
  isReimbursable?: boolean;
}): boolean {
  if (input.isReimbursable != null) {
    return input.isReimbursable;
  }

  return deriveIsReimbursable(input.paymentMethod);
}

export function isExpenseReceiptImage(mimeType?: string): boolean {
  if (!mimeType) {
    return false;
  }

  return mimeType.toLowerCase().startsWith("image/");
}

export function isExpenseReceiptImageFile(fileName?: string): boolean {
  if (!fileName) {
    return false;
  }

  return /\.(jpe?g|png|webp|heic|heif)$/i.test(fileName);
}

export type ExpensePaymentFilter = "all" | "reimbursable" | "company_paid";
export type ExpenseDateFilter = "all" | "last_7" | "last_30" | "older";
export type ExpenseReceiptFilter = "all" | "attached" | "missing";

export const EXPENSE_PAYMENT_FILTER_OPTIONS: {
  value: ExpensePaymentFilter;
  label: string;
}[] = [
  { value: "all", label: "All payment types" },
  { value: "reimbursable", label: "Reimbursable" },
  { value: "company_paid", label: "Company-paid" },
];

export const EXPENSE_DATE_FILTER_OPTIONS: {
  value: ExpenseDateFilter;
  label: string;
}[] = [
  { value: "all", label: "All dates" },
  { value: "last_7", label: "Last 7 days" },
  { value: "last_30", label: "Last 30 days" },
  { value: "older", label: "Older than 30 days" },
];

export const EXPENSE_RECEIPT_FILTER_OPTIONS: {
  value: ExpenseReceiptFilter;
  label: string;
}[] = [
  { value: "all", label: "All receipts" },
  { value: "attached", label: "Receipt attached" },
  { value: "missing", label: "No receipt" },
];

export function getExpenseSummary(expenses: Expense[]) {
  const submittedTotal = expenses
    .filter((expense) => expense.status === "submitted")
    .reduce((sum, expense) => sum + (expense.amount ?? 0), 0);

  const approvedTotal = expenses
    .filter((expense) => expense.status === "approved")
    .reduce((sum, expense) => sum + (expense.amount ?? 0), 0);

  const reimbursableTotal = expenses
    .filter(
      (expense) =>
        expense.isReimbursable &&
        (expense.status === "approved" || expense.status === "submitted"),
    )
    .reduce((sum, expense) => sum + (expense.amount ?? 0), 0);

  const totalSpent = expenses
    .filter(
      (expense) =>
        expense.status === "approved" || expense.status === "reimbursed",
    )
    .reduce((sum, expense) => sum + (expense.amount ?? 0), 0);

  return { submittedTotal, approvedTotal, reimbursableTotal, totalSpent };
}

export function formatExpenseAmount(amount?: number): string {
  if (amount == null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatExpenseDate(date?: string): string {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}
