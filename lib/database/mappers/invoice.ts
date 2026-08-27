import type {
  InvoiceLineItemRow,
  InvoiceRow,
} from "@/lib/database/types/core-tables";
import type { Invoice, InvoiceLineItem } from "@/shared/types/invoice";

/**
 * Row -> domain mapping for invoices.
 *
 * Extracted so it can be imported WITHOUT the Supabase server client and, with
 * it, next/headers. That is what lets the dashboard equality differential run
 * the mapper that ships instead of a copy — and this is the money path, so the
 * difference between "the same code" and "code that looks the same" is the
 * whole point of the test.
 *
 * invoices.ts re-exports mapInvoiceRowToInvoice, so every import still works.
 */

function toDateOnly(value: string): string {
  return value.split("T")[0] ?? value;
}

type CustomerSummary = {
  name: string;
  email?: string;
  phone?: string;
};

type JobSummary = {
  job_number: string;
};

type EstimateSummary = {
  estimate_number: string;
};

type InvoiceLineItemRowMinimal = Pick<InvoiceLineItemRow, "id">;

export type InvoiceRowWithRelations = InvoiceRow & {
  customers: CustomerSummary | null;
  jobs: JobSummary | null;
  estimates: EstimateSummary | null;
  invoice_line_items?: InvoiceLineItemRow[] | InvoiceLineItemRowMinimal[];
};

const INVOICE_LIST_SELECT = `
  *,
  customers(name, email),
  jobs(job_number),
  estimates(estimate_number),
  invoice_line_items(id)
`;

const INVOICE_DETAIL_SELECT = `
  *,
  customers(name, email, phone),
  jobs(job_number),
  estimates(estimate_number),
  invoice_line_items(*)
`;

function mapLineItemRow(row: InvoiceLineItemRow): InvoiceLineItem {
  const name = row.name.trim();
  const description = row.description?.trim() || undefined;

  return {
    id: row.id,
    serviceItemId: row.service_item_id ?? undefined,
    name,
    description,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    taxable: row.taxable,
    lineTotal: Number(row.line_total),
  };
}

function sortLineItems(rows: InvoiceLineItemRow[]): InvoiceLineItemRow[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order);
}

export function mapInvoiceRowToInvoice(row: InvoiceRowWithRelations): Invoice {
  const lineItemRows = (row.invoice_line_items ?? []).filter(
    (item): item is InvoiceLineItemRow => "name" in item,
  );
  const lineItems = sortLineItems(lineItemRows).map(mapLineItemRow);
  const lineItemCount =
    lineItems.length > 0
      ? lineItems.length
      : (row.invoice_line_items?.length ?? 0);

  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    customerId: row.customer_id,
    customerName: row.customers?.name ?? "Unknown customer",
    customerEmail: row.customers?.email || undefined,
    jobId: row.job_id ?? undefined,
    jobNumber: row.jobs?.job_number ?? undefined,
    estimateId: row.estimate_id ?? undefined,
    estimateNumber: row.estimates?.estimate_number ?? undefined,
    status: row.status,
    lineItems,
    lineItemCount,
    subtotal: Number(row.subtotal),
    taxRate: Number(row.tax_rate ?? 0),
    taxAmount: Number(row.tax_amount) || undefined,
    total: Number(row.total),
    amountPaid: Number(row.amount_paid),
    balanceDue: Number(row.balance_due),
    issueDate: toDateOnly(row.issue_date),
    dueDate: toDateOnly(row.due_date),
    paidAt: row.paid_at ? toDateOnly(row.paid_at) : undefined,
    notes: row.notes ?? undefined,
    createdAt: toDateOnly(row.created_at),
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    deleteAfter: row.delete_after ?? undefined,
  };
}
