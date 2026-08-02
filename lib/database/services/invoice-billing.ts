import { cache } from "react";
import {
  listInvoices,
  listInvoicesByCustomer,
  syncOverdueInvoiceStatuses,
  type ListInvoicesByCustomerOptions,
} from "@/lib/database/queries/invoices";
import type { Invoice } from "@/shared/types/invoice";

/**
 * Keeps invoice statuses aligned with due dates before reads.
 * Small-company scale: safe to run on list/detail/dashboard loads.
 */
export async function ensureInvoiceBillingStatesSynced(
  companyId: string,
  timeZone?: string,
): Promise<void> {
  await syncOverdueInvoiceStatuses(companyId, timeZone);
}

export const listInvoicesWithBillingSync = cache(
  async function listInvoicesWithBillingSync(
    companyId: string,
    timeZone?: string,
    options?: Parameters<typeof listInvoices>[1],
  ): Promise<Invoice[]> {
    await ensureInvoiceBillingStatesSynced(companyId, timeZone);
    return listInvoices(companyId, options);
  },
);

/**
 * Customer Profile invoice tab — same overdue sync as the Invoices list
 * so stale "sent" rows do not linger past their due date.
 */
export const listInvoicesByCustomerWithBillingSync = cache(
  async function listInvoicesByCustomerWithBillingSync(
    companyId: string,
    customerId: string,
    timeZone?: string,
    limitOrOptions: number | ListInvoicesByCustomerOptions = 5,
  ): Promise<Invoice[]> {
    await ensureInvoiceBillingStatesSynced(companyId, timeZone);
    return listInvoicesByCustomer(companyId, customerId, limitOrOptions);
  },
);
