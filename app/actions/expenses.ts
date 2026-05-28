"use server";

import { revalidatePath } from "next/cache";
import { canManageExpenseReceipt } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  attachReceiptToExpense,
  createExpense,
  getExpenseById,
  updateExpenseStatus,
} from "@/lib/database/queries/expenses";
import { getJobById } from "@/lib/database/queries/jobs";
import {
  captureCompletedJobReviewSnapshot,
  trackJobReviewBlockerResolutions,
} from "@/lib/database/services/job-review-resolution";
import {
  recordExpenseApprovedActivity,
  recordExpenseCreatedActivity,
  recordExpenseReceiptUploadedActivity,
  recordExpenseRejectedActivity,
  recordExpenseReimbursedActivity,
  recordExpenseSubmittedActivity,
} from "@/lib/database/services/expense-activity";
import { buildExpenseReceiptStoragePath } from "@/lib/storage/company-files";
import type { Expense, ExpenseFormData, ExpenseStatus } from "@/shared/types/expense";
import {
  EXPENSE_RECEIPT_ALLOWED_MIME_TYPES,
  EXPENSE_RECEIPT_MAX_FILE_SIZE,
} from "@/shared/types/expense";
import {
  getExpenseStatusForWorkflowAction,
  getExpenseWorkflowActions,
  type ExpenseWorkflowAction,
} from "@/shared/types/expense-workflow";
import { isTerminalJobStatus } from "@/shared/types/job-workflow";

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
  revalidatePath("/tech/receipts");
}

async function assertExpenseJobPermission(jobId: string): Promise<{
  error?: string;
  jobId?: string;
  customerId?: string;
  jobNumber?: string;
}> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const job = await getJobById(context.company.id, jobId);

  if (!job) {
    return { error: "Linked job not found." };
  }

  if (context.permissions.dispatchJobs || context.permissions.manageBilling) {
    return {
      jobId: job.id,
      customerId: job.customerId,
      jobNumber: job.jobNumber,
    };
  }

  if (!context.permissions.viewAssignedJobs) {
    return { error: "You do not have permission to log expenses on this job." };
  }

  if (job.assignedTechnicianId !== context.user.id) {
    return {
      error: "You can only log expenses on jobs assigned to you.",
    };
  }

  if (isTerminalJobStatus(job.status)) {
    return {
      error: "Expenses cannot be logged on completed or cancelled jobs.",
    };
  }

  return {
    jobId: job.id,
    customerId: job.customerId,
    jobNumber: job.jobNumber,
  };
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

  return assertExpenseJobPermission(jobId);
}

function isAllowedReceiptMimeType(mimeType: string): boolean {
  return (EXPENSE_RECEIPT_ALLOWED_MIME_TYPES as readonly string[]).includes(
    mimeType.toLowerCase(),
  );
}

export async function prepareExpenseReceiptUploadAction(input: {
  expenseId: string;
  fileName: string;
  /** When true, skip the existing-expense check (used during create-before-save upload). */
  forCreate?: boolean;
}): Promise<ExpenseReceiptUploadTargetResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!input.fileName.trim()) {
    return { error: "File name is required." };
  }

  if (input.forCreate) {
    if (
      !context.permissions.manageBilling &&
      !context.permissions.dispatchJobs &&
      !context.permissions.viewAssignedJobs
    ) {
      return { error: "You do not have permission to upload expense receipts." };
    }
  } else {
    const existing = await getExpenseById(context.company.id, input.expenseId);

    if (!existing) {
      return { error: "Expense not found." };
    }

    if (!canManageExpenseReceipt(context, existing)) {
      return {
        error: "You do not have permission to upload receipts for this expense.",
      };
    }
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

  if (!input.data.jobId?.trim()) {
    if (
      !context.permissions.manageBilling &&
      !context.permissions.dispatchJobs
    ) {
      return {
        error: "You do not have permission to create expenses without a linked job.",
      };
    }
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

  await recordExpenseCreatedActivity({
    companyId: context.company.id,
    expenseId: expense.id,
    actorId: context.user.id,
    expense,
  });

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

function assertExpenseWorkflowPermission(input: {
  expense: Expense;
  action: ExpenseWorkflowAction;
  canManageBilling: boolean;
  canDispatchJobs: boolean;
  userId: string;
}): string | null {
  const allowed = getExpenseWorkflowActions({
    status: input.expense.status,
    isReimbursable: input.expense.isReimbursable,
    technicianId: input.expense.technicianId,
    currentUserId: input.userId,
    canManageBilling: input.canManageBilling,
    canDispatchJobs: input.canDispatchJobs,
  });

  if (!allowed.includes(input.action)) {
    return "You do not have permission to perform this action.";
  }

  return null;
}

export async function updateExpenseStatusAction(input: {
  expenseId: string;
  fromStatus: ExpenseStatus;
  action: ExpenseWorkflowAction;
  rejectionReason?: string;
}): Promise<ExpenseActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const existing = await getExpenseById(context.company.id, input.expenseId);

  if (!existing) {
    return { error: "Expense not found." };
  }

  if (existing.status !== input.fromStatus) {
    return {
      error: "Expense status has changed. Refresh the page and try again.",
    };
  }

  const permissionError = assertExpenseWorkflowPermission({
    expense: existing,
    action: input.action,
    canManageBilling: context.permissions.manageBilling,
    canDispatchJobs: context.permissions.dispatchJobs,
    userId: context.user.id,
  });

  if (permissionError) {
    return { error: permissionError };
  }

  const toStatus = getExpenseStatusForWorkflowAction(
    input.fromStatus,
    input.action,
  );

  if (!toStatus) {
    return { error: "This expense action is not allowed." };
  }

  let reviewSnapshotBefore = null;
  let reviewJobStatus = null;
  if (existing.jobId) {
    const job = await getJobById(context.company.id, existing.jobId);
    if (job) {
      reviewJobStatus = job.status;
      reviewSnapshotBefore = await captureCompletedJobReviewSnapshot(
        context.company.id,
        job.id,
        job.status,
      );
    }
  }

  const { expense, error } = await updateExpenseStatus(
    context.company.id,
    input.expenseId,
    input.fromStatus,
    toStatus,
  );

  if (error || !expense) {
    return { error: error ?? "Failed to update expense status." };
  }

  const activityInput = {
    companyId: context.company.id,
    expenseId: expense.id,
    actorId: context.user.id,
    expense,
    fromStatus: input.fromStatus,
  };

  switch (input.action) {
    case "submit":
      await recordExpenseSubmittedActivity(activityInput);
      break;
    case "approve":
      await recordExpenseApprovedActivity(activityInput);
      break;
    case "reject":
      await recordExpenseRejectedActivity({
        ...activityInput,
        rejectionReason: input.rejectionReason,
      });
      break;
    case "reimburse":
      await recordExpenseReimbursedActivity(activityInput);
      break;
    case "return_to_draft":
      break;
  }

  if (reviewSnapshotBefore && expense.jobId && reviewJobStatus) {
    void trackJobReviewBlockerResolutions({
      companyId: context.company.id,
      jobId: expense.jobId,
      jobStatus: reviewJobStatus,
      actorId: context.user.id,
      beforeSnapshot: reviewSnapshotBefore,
      customerId: expense.customerId,
    }).catch((trackingError) => {
      console.error(
        "[updateExpenseStatusAction] review resolution tracking failed:",
        {
          jobId: expense.jobId,
          trackingError,
        },
      );
    });
  }

  revalidateExpensePaths({
    expenseId: expense.id,
    jobId: expense.jobId,
    customerId: expense.customerId,
  });

  return { expense };
}
