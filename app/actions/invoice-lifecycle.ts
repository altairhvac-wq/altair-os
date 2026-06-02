"use server";

import { voidInvoiceAction } from "@/app/actions/invoices";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { revalidateInvoiceOperationalPages } from "@/lib/database/revalidation/operational-pages";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  archiveInvoice,
  getInvoiceById,
  getInvoiceDeleteDependencies,
  moveInvoiceToTrash,
  permanentlyDeleteInvoice,
  restoreInvoice,
  restoreInvoiceFromTrash,
} from "@/lib/database/queries/invoices";
import {
  canArchiveInvoice,
  canMoveInvoiceToTrash,
  canPermanentlyDeleteInvoice,
  canRestoreInvoice,
  canRestoreInvoiceFromTrash,
  getArchiveInvoiceBlockReason,
  getMoveInvoiceToTrashBlockReason,
  getPermanentDeleteInvoiceBlockReason,
  getRestoreInvoiceBlockReason,
  getRestoreInvoiceFromTrashBlockReason,
} from "@/shared/lib/invoice-lifecycle";
import type { Invoice } from "@/shared/types/invoice";

export type InvoiceLifecycleActionResult = {
  error?: string;
  invoice?: Invoice;
  deleted?: boolean;
};

function revalidateInvoicePaths(invoiceId?: string) {
  revalidateInvoiceOperationalPages(invoiceId);
}

export async function archiveInvoiceAction(
  invoiceId: string,
): Promise<InvoiceLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage invoices." };
  }

  const existing = await getInvoiceById(context.company.id, invoiceId);
  if (!existing) return { error: "Invoice not found." };

  const blockReason = getArchiveInvoiceBlockReason(existing);
  if (blockReason || !canArchiveInvoice(existing)) {
    return { error: blockReason ?? "This invoice cannot be archived." };
  }

  const { invoice, error } = await archiveInvoice(context.company.id, invoiceId);
  if (error || !invoice) {
    return { error: error ?? "We couldn't archive this invoice." };
  }

  revalidateInvoicePaths(invoiceId);
  return { invoice };
}

export async function restoreInvoiceAction(
  invoiceId: string,
): Promise<InvoiceLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage invoices." };
  }

  const existing = await getInvoiceById(context.company.id, invoiceId);
  if (!existing) return { error: "Invoice not found." };

  const blockReason = getRestoreInvoiceBlockReason(existing);
  if (blockReason || !canRestoreInvoice(existing)) {
    return { error: blockReason ?? "This invoice cannot be restored." };
  }

  const { invoice, error } = await restoreInvoice(context.company.id, invoiceId);
  if (error || !invoice) {
    return { error: error ?? "We couldn't restore this invoice." };
  }

  revalidateInvoicePaths(invoiceId);
  return { invoice };
}

export async function moveInvoiceToTrashAction(
  invoiceId: string,
): Promise<InvoiceLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage invoices." };
  }

  const existing = await getInvoiceById(context.company.id, invoiceId);
  if (!existing) return { error: "Invoice not found." };

  const blockReason = getMoveInvoiceToTrashBlockReason(existing);
  if (blockReason || !canMoveInvoiceToTrash(existing)) {
    return { error: blockReason ?? "This invoice cannot be moved to Recently Deleted." };
  }

  const { invoice, error } = await moveInvoiceToTrash(context.company.id, invoiceId);
  if (error || !invoice) {
    return { error: error ?? "We couldn't move this invoice to Recently Deleted." };
  }

  revalidateInvoicePaths(invoiceId);
  return { invoice };
}

export async function restoreInvoiceFromTrashAction(
  invoiceId: string,
): Promise<InvoiceLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage invoices." };
  }

  const existing = await getInvoiceById(context.company.id, invoiceId);
  if (!existing) return { error: "Invoice not found." };

  const blockReason = getRestoreInvoiceFromTrashBlockReason(existing);
  if (blockReason || !canRestoreInvoiceFromTrash(existing)) {
    return { error: blockReason ?? "This invoice cannot be restored." };
  }

  const { invoice, error } = await restoreInvoiceFromTrash(
    context.company.id,
    invoiceId,
  );
  if (error || !invoice) {
    return { error: error ?? "We couldn't restore this invoice." };
  }

  revalidateInvoicePaths(invoiceId);
  return { invoice };
}

export async function permanentlyDeleteInvoiceAction(
  invoiceId: string,
): Promise<InvoiceLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage invoices." };
  }

  const existing = await getInvoiceById(context.company.id, invoiceId);
  if (!existing) return { error: "Invoice not found." };

  const dependencies = await getInvoiceDeleteDependencies(
    context.company.id,
    invoiceId,
  );
  const blockReason = getPermanentDeleteInvoiceBlockReason(existing, dependencies);
  if (blockReason || !canPermanentlyDeleteInvoice(existing, dependencies)) {
    return { error: blockReason ?? "This invoice cannot be permanently deleted." };
  }

  const { success, error } = await permanentlyDeleteInvoice(
    context.company.id,
    invoiceId,
  );
  if (!success || error) {
    return { error: error ?? "We couldn't permanently delete this invoice." };
  }

  revalidateInvoicePaths();
  return { deleted: true };
}

export { voidInvoiceAction };
