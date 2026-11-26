"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
import { listCustomersForImportMatching } from "@/lib/database/queries/customers";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { createInvoice, listImportedPreviousInvoiceNumbers } from "@/lib/database/queries/invoices";
import { recordInvoiceCreatedActivity } from "@/lib/database/services/invoice-activity";
import { applyInvoiceCreationDefaults } from "@/shared/lib/company-billing-defaults";
import { getDateOnlyInTimeZone } from "@/shared/lib/datetime";
import {
  describeCarriedOverInvoice,
  INVOICE_IMPORT_BATCH_ROWS,
  normalizeOldInvoiceNumber,
  parseImportDate,
  type InvoiceImportRow,
} from "@/shared/lib/invoice-import";
import { INVOICE_CREATE_STATUS } from "@/shared/types/invoice";

export type ImportInvoicesResultRow = { rowNumber: number; label: string; message: string };

export type ImportInvoicesActionResult = {
  error?: string;
  importedCount: number;
  importedTotal: number;
  skippedRows: ImportInvoicesResultRow[];
  errorRows: ImportInvoicesResultRow[];
};

const EMPTY = { importedCount: 0, importedTotal: 0, skippedRows: [], errorRows: [] };

/**
 * Creates one DRAFT invoice per unpaid invoice from another app. The screen
 * matched each row to a customer and worked out the amount owed; this action
 * repeats the checks that matter (permission, the customer belongs to this
 * company, the amount, the dates, and that the old invoice number has not
 * been brought over already) because the browser is not trusted. Nothing is
 * sent to anyone.
 */
export async function importUnpaidInvoicesAction(rows: unknown): Promise<ImportInvoicesActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE, ...EMPTY };

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to create invoices.", ...EMPTY };
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "No invoice rows were provided.", ...EMPTY };
  }
  if (rows.length > INVOICE_IMPORT_BATCH_ROWS) {
    return { error: `Send up to ${INVOICE_IMPORT_BATCH_ROWS} invoices at a time.`, ...EMPTY };
  }

  const [customerList, imported] = await Promise.all([
    listCustomersForImportMatching(context.company.id),
    listImportedPreviousInvoiceNumbers(context.company.id),
  ]);
  if (customerList.error || imported.error) {
    return { error: "We couldn't check your customers and invoices right now. Try again in a moment.", ...EMPTY };
  }

  const customerIds = new Set(customerList.customers.map((customer) => customer.id));
  const seen = new Set(imported.numbers.map((number) => number.toLowerCase()));
  const billingDefaults = getCompanyBillingDefaultsFromRow(context.company);
  const timeZone = context.company.timezone;
  const today = getDateOnlyInTimeZone(new Date(), timeZone);

  const skippedRows: ImportInvoicesResultRow[] = [];
  const errorRows: ImportInvoicesResultRow[] = [];
  let importedCount = 0;
  let importedTotal = 0;

  for (const raw of rows) {
    const input = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    const rowNumber = Number.isInteger(input.rowNumber) ? (input.rowNumber as number) : 0;
    const oldNumber = normalizeOldInvoiceNumber(typeof input.oldNumber === "string" ? input.oldNumber : "");
    const label = oldNumber ? `#${oldNumber}` : "(no number)";
    const amount = typeof input.amountOwed === "number" ? Math.round(input.amountOwed * 100) / 100 : Number.NaN;
    const customerId = typeof input.customerId === "string" ? input.customerId : "";
    const date = (value: unknown) => (typeof value === "string" ? parseImportDate(value) : null);
    const originalTotal =
      typeof input.originalTotal === "number" && Number.isFinite(input.originalTotal) && input.originalTotal >= 0
        ? Math.round(input.originalTotal * 100) / 100
        : null;

    if (!oldNumber || oldNumber.length > 40) {
      errorRows.push({ rowNumber, label, message: "No usable invoice number." });
      continue;
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
      errorRows.push({ rowNumber, label, message: "The amount owed is not a number above zero." });
      continue;
    }
    if (!customerIds.has(customerId)) {
      errorRows.push({ rowNumber, label, message: "The matched customer was not found." });
      continue;
    }
    if (seen.has(oldNumber.toLowerCase())) {
      skippedRows.push({ rowNumber, label, message: "Already brought over." });
      continue;
    }

    const row: InvoiceImportRow = {
      rowNumber,
      oldNumber,
      customerId,
      customerName: typeof input.customerName === "string" ? input.customerName : "",
      amountOwed: amount,
      originalTotal,
      issueDate: date(input.issueDate),
      dueDate: date(input.dueDate),
    };
    const text = describeCarriedOverInvoice(row);
    const defaultNotes = billingDefaults.defaultInvoiceNotes.trim();

    const formData = applyInvoiceCreationDefaults(
      {
        customerId,
        status: INVOICE_CREATE_STATUS,
        issueDate: "",
        // The original due date when it is still ahead; an overdue balance is due now.
        dueDate: row.dueDate && row.dueDate >= today ? row.dueDate : today,
        notes: defaultNotes ? `${text.notes}\n\n${defaultNotes}` : text.notes,
        // The old invoice already charged its tax: the balance is carried as one untaxed line.
        taxRate: 0,
        lineItems: [
          {
            name: text.lineName,
            description: text.lineDescription,
            quantity: 1,
            unitPrice: amount,
            taxable: false,
          },
        ],
      },
      billingDefaults,
      timeZone,
    );

    const { invoice, error } = await createInvoice(context.company.id, formData, timeZone);
    if (error || !invoice) {
      errorRows.push({ rowNumber, label, message: error ?? "Could not create the invoice." });
      continue;
    }
    seen.add(oldNumber.toLowerCase());

    await recordInvoiceCreatedActivity({
      companyId: context.company.id,
      invoiceId: invoice.id,
      actorId: context.user.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
    });

    importedCount += 1;
    importedTotal += amount;
  }

  if (importedCount > 0) {
    revalidatePath("/invoices");
    revalidatePath("/sales");
    revalidatePath("/customers");
  }

  return {
    importedCount,
    importedTotal: Math.round(importedTotal * 100) / 100,
    skippedRows,
    errorRows,
  };
}
