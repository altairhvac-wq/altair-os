import { getCustomerEmailSendBlockReason } from "@/shared/lib/operational-errors";
import {
  getSendInvoiceJobBlockReason,
  type Invoice,
} from "@/shared/types/invoice";
import type { JobStatus } from "@/shared/types/job";

export type InvoiceBatchSendJobLookup = ReadonlyMap<
  string,
  Pick<{ status: JobStatus }, "status">
>;

export function getBatchSendInvoiceBlockReason(
  invoice: Pick<Invoice, "status" | "jobId" | "customerEmail">,
  jobsById?: InvoiceBatchSendJobLookup,
): string | null {
  if (invoice.status !== "draft") {
    return "Only draft invoices can be sent.";
  }

  const emailBlockReason = getCustomerEmailSendBlockReason(invoice.customerEmail);
  if (emailBlockReason) {
    return emailBlockReason;
  }

  if (invoice.jobId && jobsById) {
    const linkedJob = jobsById.get(invoice.jobId);
    if (linkedJob) {
      return getSendInvoiceJobBlockReason(linkedJob.status);
    }
  }

  return null;
}

export function canBatchSendInvoice(
  invoice: Pick<Invoice, "status" | "jobId" | "customerEmail">,
  jobsById?: InvoiceBatchSendJobLookup,
): boolean {
  return getBatchSendInvoiceBlockReason(invoice, jobsById) === null;
}

export function getBatchSendableInvoices(
  invoices: Invoice[],
  jobsById?: InvoiceBatchSendJobLookup,
): Invoice[] {
  return invoices.filter((invoice) => canBatchSendInvoice(invoice, jobsById));
}

export function toggleInvoiceBatchSelection(
  selectedIds: ReadonlySet<string>,
  invoiceId: string,
  selected?: boolean,
): Set<string> {
  const next = new Set(selectedIds);
  const shouldSelect = selected ?? !next.has(invoiceId);

  if (shouldSelect) {
    next.add(invoiceId);
  } else {
    next.delete(invoiceId);
  }

  return next;
}

export function toggleInvoiceGroupBatchSelection(
  selectedIds: ReadonlySet<string>,
  invoices: Invoice[],
  selectAll: boolean,
  jobsById?: InvoiceBatchSendJobLookup,
): Set<string> {
  const next = new Set(selectedIds);

  for (const invoice of getBatchSendableInvoices(invoices, jobsById)) {
    if (selectAll) {
      next.add(invoice.id);
    } else {
      next.delete(invoice.id);
    }
  }

  return next;
}

export function resolveInvoiceBatchSelectionState(
  selectedIds: ReadonlySet<string>,
  invoices: Invoice[],
  jobsById?: InvoiceBatchSendJobLookup,
): {
  selectableCount: number;
  allSelected: boolean;
  someSelected: boolean;
  selectedCount: number;
} {
  const selectable = getBatchSendableInvoices(invoices, jobsById);
  const selectableCount = selectable.length;

  if (selectableCount === 0) {
    return {
      selectableCount: 0,
      allSelected: false,
      someSelected: false,
      selectedCount: 0,
    };
  }

  let selectedCount = 0;

  for (const invoice of selectable) {
    if (selectedIds.has(invoice.id)) {
      selectedCount += 1;
    }
  }

  return {
    selectableCount,
    allSelected: selectedCount === selectableCount,
    someSelected: selectedCount > 0 && selectedCount < selectableCount,
    selectedCount,
  };
}

export function formatBatchSendInvoicesResultMessage(input: {
  successCount: number;
  failureCount: number;
}): string {
  const { successCount, failureCount } = input;

  if (successCount === 0 && failureCount === 0) {
    return "No invoices were sent.";
  }

  if (failureCount === 0) {
    return `Sent ${successCount} invoice${successCount === 1 ? "" : "s"}.`;
  }

  if (successCount === 0) {
    return `${failureCount} invoice${failureCount === 1 ? "" : "s"} could not be sent.`;
  }

  return `Sent ${successCount} invoice${successCount === 1 ? "" : "s"}. ${failureCount} could not be sent.`;
}

export function buildJobsByIdForBatchSend<
  T extends Pick<{ id: string; status: JobStatus }, "id" | "status">,
>(jobs: T[]): InvoiceBatchSendJobLookup {
  return new Map(jobs.map((job) => [job.id, job]));
}
