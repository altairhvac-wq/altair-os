"use server";

import { revalidateInvoiceOperationalPages } from "@/lib/database/revalidation/operational-pages";
import {
  archiveInvoiceAction,
  moveInvoiceToTrashAction,
  permanentlyDeleteInvoiceAction,
  restoreInvoiceAction,
  restoreInvoiceFromTrashAction,
  voidInvoiceAction,
} from "@/app/actions/invoice-lifecycle";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  getInvoiceById,
  getInvoiceDeleteDependencies,
} from "@/lib/database/queries/invoices";
import { runBulkLifecycleAction, type BulkLifecycleActionResult } from "@/shared/lib/bulk-lifecycle-runner";
import {
  getArchiveInvoiceBlockReason,
  getMoveInvoiceToTrashBlockReason,
  getPermanentDeleteInvoiceBlockReason,
  getRestoreInvoiceBlockReason,
  getRestoreInvoiceFromTrashBlockReason,
} from "@/shared/lib/invoice-lifecycle";
import { getVoidInvoiceLifecycleBlockReason } from "@/shared/lib/invoice-lifecycle";

async function runInvoicesBulk(
  invoiceIds: string[],
  action: (invoiceId: string) => Promise<{ error?: string }>,
  getBlockReason?: (
    invoice: NonNullable<Awaited<ReturnType<typeof getInvoiceById>>>,
    dependencies?: Awaited<ReturnType<typeof getInvoiceDeleteDependencies>>,
  ) => string | null,
  needsDependencies = false,
): Promise<BulkLifecycleActionResult> {
  const context = await getActiveCompanyContext();

  return runBulkLifecycleAction({
    ids: invoiceIds,
    permissionError: !context
      ? NO_ACTIVE_COMPANY_MESSAGE
      : !context.permissions.manageBilling
        ? "You do not have permission to manage invoices."
        : undefined,
    emptySelectionError: "Select at least one invoice.",
    loadEntity: async (id) => getInvoiceById(context!.company.id, id),
    getLabel: (invoice) => invoice.invoiceNumber,
    getBlockReason: async (invoice) => {
      const dependencies = needsDependencies
        ? await getInvoiceDeleteDependencies(context!.company.id, invoice.id)
        : undefined;
      return getBlockReason?.(invoice, dependencies) ?? null;
    },
    runAction: action,
  });
}

export async function bulkArchiveInvoicesAction(
  invoiceIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runInvoicesBulk(
    invoiceIds,
    archiveInvoiceAction,
    (invoice) => getArchiveInvoiceBlockReason(invoice),
  );
  if (result.successCount > 0) revalidateInvoiceOperationalPages();
  return result;
}

export async function bulkRestoreInvoicesAction(
  invoiceIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runInvoicesBulk(
    invoiceIds,
    restoreInvoiceAction,
    (invoice) => getRestoreInvoiceBlockReason(invoice),
  );
  if (result.successCount > 0) revalidateInvoiceOperationalPages();
  return result;
}

export async function bulkVoidInvoicesAction(
  invoiceIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runInvoicesBulk(
    invoiceIds,
    voidInvoiceAction,
    (invoice) => getVoidInvoiceLifecycleBlockReason(invoice),
  );
  if (result.successCount > 0) revalidateInvoiceOperationalPages();
  return result;
}

export async function bulkMoveInvoicesToTrashAction(
  invoiceIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runInvoicesBulk(
    invoiceIds,
    moveInvoiceToTrashAction,
    (invoice) => getMoveInvoiceToTrashBlockReason(invoice),
  );
  if (result.successCount > 0) revalidateInvoiceOperationalPages();
  return result;
}

export async function bulkRestoreInvoicesFromTrashAction(
  invoiceIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runInvoicesBulk(
    invoiceIds,
    restoreInvoiceFromTrashAction,
    (invoice) => getRestoreInvoiceFromTrashBlockReason(invoice),
  );
  if (result.successCount > 0) revalidateInvoiceOperationalPages();
  return result;
}

export async function bulkPermanentlyDeleteInvoicesAction(
  invoiceIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runInvoicesBulk(
    invoiceIds,
    permanentlyDeleteInvoiceAction,
    (invoice, dependencies) =>
      dependencies
        ? getPermanentDeleteInvoiceBlockReason(invoice, dependencies)
        : null,
    true,
  );
  if (result.successCount > 0) revalidateInvoiceOperationalPages();
  return result;
}
