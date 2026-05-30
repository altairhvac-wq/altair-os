import {
  dispatchNotification,
  dispatchNotificationsForPermission,
} from "@/lib/database/services/notifications";
import type { Json } from "@/lib/database/types/enums";
import {
  isNonEmptyId,
  sanitizeNotificationMetadata,
} from "@/lib/database/services/operational-guards";

function formatJobLabel(jobNumber?: string, jobId?: string): string {
  return jobNumber?.trim() || (jobId ? `Job ${jobId.slice(0, 8)}` : "a job");
}

function formatCurrency(amount?: number): string {
  if (amount == null || Number.isNaN(amount)) {
    return "an expense";
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatMerchantLabel(merchant: string): string {
  const trimmed = merchant.trim();
  return trimmed.length > 0 ? trimmed : "a merchant";
}

export function notifyJobAssigned(input: {
  companyId: string;
  technicianId: string;
  actorId?: string;
  jobId: string;
  jobNumber?: string;
  customerId?: string;
  technicianName?: string;
}): void {
  if (
    !isNonEmptyId(input.companyId) ||
    !isNonEmptyId(input.technicianId) ||
    !isNonEmptyId(input.jobId)
  ) {
    return;
  }

  if (input.actorId === input.technicianId) {
    return;
  }

  const jobLabel = formatJobLabel(input.jobNumber, input.jobId);

  dispatchNotification({
    companyId: input.companyId,
    userId: input.technicianId,
    type: "job_assigned",
    title: "New job assignment",
    message: `You have been assigned to ${jobLabel}.`,
    entityType: "job",
    entityId: input.jobId,
    metadata: sanitizeNotificationMetadata({
      job_id: input.jobId,
      job_number: input.jobNumber,
      customer_id: input.customerId,
      technician_id: input.technicianId,
      technician_name: input.technicianName,
    }) as Json,
  });
}

export function notifyWorkCompleted(input: {
  companyId: string;
  actorId: string;
  jobId: string;
  jobNumber?: string;
  customerId?: string;
}): void {
  if (!isNonEmptyId(input.companyId) || !isNonEmptyId(input.jobId) || !isNonEmptyId(input.actorId)) {
    return;
  }

  const jobLabel = formatJobLabel(input.jobNumber, input.jobId);

  dispatchNotificationsForPermission({
    companyId: input.companyId,
    permission: "dispatchJobs",
    type: "job_completed",
    title: "Work completed",
    message: `${jobLabel} has been marked complete.`,
    entityType: "job",
    entityId: input.jobId,
    excludeUserIds: [input.actorId],
    metadata: sanitizeNotificationMetadata({
      job_id: input.jobId,
      job_number: input.jobNumber,
      customer_id: input.customerId,
    }),
  });
}

export function notifyExpenseSubmitted(input: {
  companyId: string;
  actorId: string;
  expenseId: string;
  expenseNumber?: string;
  merchant: string;
  amount?: number;
  technicianName?: string;
  jobId?: string;
}): void {
  if (
    !isNonEmptyId(input.companyId) ||
    !isNonEmptyId(input.expenseId) ||
    !isNonEmptyId(input.actorId)
  ) {
    return;
  }

  const merchantLabel = formatMerchantLabel(input.merchant);

  dispatchNotificationsForPermission({
    companyId: input.companyId,
    permission: "manageBilling",
    type: "expense_submitted",
    title: "Expense submitted",
    message: `${input.technicianName?.trim() || "A technician"} submitted ${formatCurrency(input.amount)} at ${merchantLabel}.`,
    entityType: "expense",
    entityId: input.expenseId,
    excludeUserIds: [input.actorId],
    metadata: sanitizeNotificationMetadata({
      expense_id: input.expenseId,
      expense_number: input.expenseNumber,
      merchant: merchantLabel,
      amount: input.amount,
      job_id: input.jobId,
    }),
  });
}

export function notifyExpenseRejected(input: {
  companyId: string;
  technicianId: string;
  actorId: string;
  expenseId: string;
  expenseNumber?: string;
  merchant: string;
  amount?: number;
  rejectionReason?: string;
}): void {
  if (
    !isNonEmptyId(input.companyId) ||
    !isNonEmptyId(input.technicianId) ||
    !isNonEmptyId(input.expenseId) ||
    !isNonEmptyId(input.actorId)
  ) {
    return;
  }

  if (input.actorId === input.technicianId) {
    return;
  }

  const merchantLabel = formatMerchantLabel(input.merchant);
  const reason = input.rejectionReason?.trim();
  const suffix = reason ? ` Reason: ${reason}` : "";

  dispatchNotification({
    companyId: input.companyId,
    userId: input.technicianId,
    type: "expense_rejected",
    title: "Expense rejected",
    message: `Your ${formatCurrency(input.amount)} expense at ${merchantLabel} was rejected.${suffix}`,
    entityType: "expense",
    entityId: input.expenseId,
    metadata: sanitizeNotificationMetadata({
      expense_id: input.expenseId,
      expense_number: input.expenseNumber,
      merchant: merchantLabel,
      amount: input.amount,
      rejection_reason: reason,
    }) as Json,
  });
}

export function notifyInvoicePaid(input: {
  companyId: string;
  actorId: string;
  invoiceId: string;
  invoiceNumber?: string;
  amount?: number;
  customerId?: string;
  jobId?: string;
}): void {
  if (
    !isNonEmptyId(input.companyId) ||
    !isNonEmptyId(input.invoiceId) ||
    !isNonEmptyId(input.actorId)
  ) {
    return;
  }

  const invoiceLabel = input.invoiceNumber?.trim() || "An invoice";

  dispatchNotificationsForPermission({
    companyId: input.companyId,
    permission: "manageBilling",
    type: "invoice_paid",
    title: "Invoice paid",
    message: `${invoiceLabel} was paid in full${input.amount != null ? ` (${formatCurrency(input.amount)})` : ""}.`,
    entityType: "invoice",
    entityId: input.invoiceId,
    excludeUserIds: [input.actorId],
    metadata: sanitizeNotificationMetadata({
      invoice_id: input.invoiceId,
      invoice_number: input.invoiceNumber,
      amount: input.amount,
      customer_id: input.customerId,
      job_id: input.jobId,
    }),
  });
}

export function notifyDraftInvoiceReady(input: {
  companyId: string;
  actorId: string;
  invoiceId: string;
  invoiceNumber?: string;
  jobId: string;
  jobNumber?: string;
  customerId?: string;
}): void {
  if (
    !isNonEmptyId(input.companyId) ||
    !isNonEmptyId(input.invoiceId) ||
    !isNonEmptyId(input.jobId) ||
    !isNonEmptyId(input.actorId)
  ) {
    return;
  }

  const jobLabel = formatJobLabel(input.jobNumber, input.jobId);

  dispatchNotificationsForPermission({
    companyId: input.companyId,
    permission: "manageBilling",
    type: "draft_invoice_ready",
    title: "Draft invoice ready",
    message: `${jobLabel} was completed and a draft invoice is ready for review.`,
    entityType: "invoice",
    entityId: input.invoiceId,
    excludeUserIds: [input.actorId],
    metadata: sanitizeNotificationMetadata({
      invoice_id: input.invoiceId,
      invoice_number: input.invoiceNumber,
      job_id: input.jobId,
      job_number: input.jobNumber,
      customer_id: input.customerId,
    }),
  });
}

export function notifyEstimateApproved(input: {
  companyId: string;
  actorId: string;
  estimateId: string;
  estimateNumber?: string;
  customerId?: string;
  jobId?: string;
}): void {
  if (
    !isNonEmptyId(input.companyId) ||
    !isNonEmptyId(input.estimateId) ||
    !isNonEmptyId(input.actorId)
  ) {
    return;
  }

  const estimateLabel = input.estimateNumber?.trim() || "An estimate";

  dispatchNotificationsForPermission({
    companyId: input.companyId,
    permission: "dispatchJobs",
    type: "estimate_approved",
    title: "Estimate approved",
    message: `${estimateLabel} was approved.`,
    entityType: "estimate",
    entityId: input.estimateId,
    excludeUserIds: [input.actorId],
    metadata: sanitizeNotificationMetadata({
      estimate_id: input.estimateId,
      estimate_number: input.estimateNumber,
      customer_id: input.customerId,
      job_id: input.jobId,
    }),
  });
}
