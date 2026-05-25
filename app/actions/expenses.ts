"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  attachReceiptToExpense,
  createExpense,
  getExpenseById,
} from "@/lib/database/queries/expenses";
import { getJobById } from "@/lib/database/queries/jobs";
import { recordExpenseReceiptUploadedActivity } from "@/lib/database/services/expense-activity";
import { buildExpenseReceiptStoragePath } from "@/lib/storage/company-files";
import type { Expense, ExpenseFormData } from "@/shared/types/expense";
import {
  EXPENSE_RECEIPT_ALLOWED_MIME_TYPES,
  EXPENSE_RECEIPT_MAX_FILE_SIZE,
} from "@/shared/types/expense";

export type ExpenseActionResult = {
  error?: string;
  expense?: Expense;
};

export type ExpenseReceiptUploadTargetResult = {
  error?: string;
  expenseId?: string;
  storagePath?: string;
};

function revalidateExpensePaths(input: {
  expenseId?: string;
  jobId?: string | null;
  customerId?: string | null;
}) {
  revalidatePath("/expenses");
  if (input.expenseId) {
    revalidatePath(`/expenses?selected=${input.expenseId}`);
  }
  if (input.jobId) {
    revalidatePath(`/jobs/${input.jobId}`);
  }
  if (input.customerId) {
    revalidatePath(`/customers/${input.customerId}`);
  }
  revalidatePath("/technician");
}

async function resolveJobContext(jobId?: string | null): Promise<{
  error?: string;
  jobId?: string;
  customerId?: string;
  jobNumber?: string;
}> {
  if (!jobId) {
    return {};
  }

  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const job = await getJobById(context.company.id, jobId);

  if (!job) {
    return { error: "Linked job not found." };
  }

  return {
    jobId: job.id,
    customerId: job.customerId,
    jobNumber: job.jobNumber,
  };
}

function isAllowedReceiptMimeType(mimeType: string): boolean {
  return (EXPENSE_RECEIPT_ALLOWED_MIME_TYPES as readonly string[]).includes(
    mimeType.toLowerCase(),
  );
}

export async function prepareExpenseReceiptUploadAction(input: {
  expenseId: string;
  fileName: string;
}): Promise<ExpenseReceiptUploadTargetResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!input.fileName.trim()) {
    return { error: "File name is required." };
  }

  const storagePath = buildExpenseReceiptStoragePath({
    companyId: context.company.id,
    expenseId: input.expenseId,
    fileName: input.fileName,
  });

  return {
    expenseId: input.expenseId,
    storagePath,
  };
}

export async function createExpenseAction(input: {
  data: ExpenseFormData;
  expenseId?: string;
  receiptFileName?: string;
  receiptStoragePath?: string;
  receiptMimeType?: string;
  receiptFileSize?: number;
}): Promise<ExpenseActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const jobContext = await resolveJobContext(input.data.jobId);

  if (jobContext.error) {
    return { error: jobContext.error };
  }

  if (input.receiptStoragePath) {
    if (!input.receiptFileName?.trim()) {
      return { error: "Receipt file name is required." };
    }

    if (!input.receiptMimeType || !isAllowedReceiptMimeType(input.receiptMimeType)) {
      return { error: "This receipt file type is not supported." };
    }

    if (
      input.receiptFileSize == null ||
      input.receiptFileSize <= 0 ||
      input.receiptFileSize > EXPENSE_RECEIPT_MAX_FILE_SIZE
    ) {
      return { error: "Receipt must be between 1 byte and 10 MB." };
    }

    const expenseId = input.expenseId ?? crypto.randomUUID();
    const expectedPath = buildExpenseReceiptStoragePath({
      companyId: context.company.id,
      expenseId,
      fileName: input.receiptFileName,
    });

    if (input.receiptStoragePath !== expectedPath) {
      return { error: "Invalid receipt storage path." };
    }
  }

  const expenseId = input.expenseId ?? crypto.randomUUID();

  const { expense, error } = await createExpense(
    context.company.id,
    context.user.id,
    {
      ...input.data,
      jobId: jobContext.jobId,
    },
    {
      expenseId,
      customerId: jobContext.customerId ?? null,
      receiptFileName: input.receiptFileName,
      receiptStoragePath: input.receiptStoragePath,
    },
  );

  if (error || !expense) {
    return { error: error ?? "Failed to create expense." };
  }

  if (input.receiptStoragePath) {
    await recordExpenseReceiptUploadedActivity({
      companyId: context.company.id,
      expenseId: expense.id,
      actorId: context.user.id,
      expense,
    });
  }

  revalidateExpensePaths({
    expenseId: expense.id,
    jobId: expense.jobId,
    customerId: expense.customerId,
  });

  return { expense };
}

export async function attachExpenseReceiptAction(input: {
  expenseId: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
}): Promise<ExpenseActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const existing = await getExpenseById(context.company.id, input.expenseId);

  if (!existing) {
    return { error: "Expense not found." };
  }

  if (existing.technicianId !== context.user.id && !context.permissions.manageBilling) {
    const canDispatch = context.permissions.dispatchJobs;
    if (!canDispatch) {
      return { error: "You do not have permission to attach receipts to this expense." };
    }
  }

  if (!isAllowedReceiptMimeType(input.mimeType)) {
    return { error: "This receipt file type is not supported." };
  }

  if (input.fileSize <= 0 || input.fileSize > EXPENSE_RECEIPT_MAX_FILE_SIZE) {
    return { error: "Receipt must be between 1 byte and 10 MB." };
  }

  const expectedPath = buildExpenseReceiptStoragePath({
    companyId: context.company.id,
    expenseId: input.expenseId,
    fileName: input.fileName,
  });

  if (input.storagePath !== expectedPath) {
    return { error: "Invalid receipt storage path." };
  }

  const { expense, error } = await attachReceiptToExpense(
    context.company.id,
    input.expenseId,
    {
      receiptFileName: input.fileName,
      receiptStoragePath: input.storagePath,
    },
  );

  if (error || !expense) {
    return { error: error ?? "Failed to attach receipt." };
  }

  await recordExpenseReceiptUploadedActivity({
    companyId: context.company.id,
    expenseId: expense.id,
    actorId: context.user.id,
    expense,
  });

  revalidateExpensePaths({
    expenseId: expense.id,
    jobId: expense.jobId,
    customerId: expense.customerId,
  });

  return { expense };
}
