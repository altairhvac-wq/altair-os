import {
  listInvoices,
  syncOverdueInvoiceStatuses,
} from "@/lib/database/queries/invoices";
import type { Invoice } from "@/shared/types/invoice";

/**
 * Keeps invoice statuses aligned with due dates before reads.
 * Small-company scale: safe to run on list/detail/dashboard loads.
 */
export async function ensureInvoiceBillingStatesSynced(
  companyId: string,
): Promise<void> {
  await syncOverdueInvoiceStatuses(companyId);
}

export async function listInvoicesWithBillingSync(
  companyId: string,
): Promise<Invoice[]> {
  await ensureInvoiceBillingStatesSynced(companyId);
  return listInvoices(companyId);
}
