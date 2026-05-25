import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  InvoiceInsert,
  InvoiceLineItemInsert,
  InvoiceLineItemRow,
  InvoiceRow,
} from "@/lib/database/types/core-tables";
import { getEstimateById, updateEstimateStatus } from "@/lib/database/queries/estimates";
import {
  calculateInvoiceTotals,
  getDefaultDueDate,
  getDefaultIssueDate,
  resolveDueDate,
  roundCurrency,
  type Invoice,
  type InvoiceDetail,
  type InvoiceFormData,
  type InvoiceLineItem,
  type InvoiceStatus,
} from "@/shared/types/invoice";

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

type InvoiceRowWithRelations = InvoiceRow & {
  customers: CustomerSummary | null;
  jobs: JobSummary | null;
  estimates: EstimateSummary | null;
  invoice_line_items?: InvoiceLineItemRow[] | InvoiceLineItemRowMinimal[];
};

const INVOICE_LIST_SELECT = `
  *,
  customers(name),
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

function toDateOnly(value: string): string {
  return value.split("T")[0] ?? value;
}

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
  };
}

function mapInvoiceRowToInvoiceDetail(
  row: InvoiceRowWithRelations,
): InvoiceDetail {
  const invoice = mapInvoiceRowToInvoice(row);

  return {
    ...invoice,
    customerEmail: row.customers?.email || undefined,
    customerPhone: row.customers?.phone || undefined,
  };
}

async function generateInvoiceNumber(companyId: string): Promise<string> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (error) {
    console.error("[generateInvoiceNumber] count failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return `INV-${Date.now()}`;
  }

  return `INV-${1050 + (count ?? 0)}`;
}

function computeTotals(
  lineItems: InvoiceFormData["lineItems"],
  taxRate: number,
) {
  const normalizedTaxRate = roundCurrency(Math.max(taxRate, 0));
  const { subtotal, taxAmount, total } = calculateInvoiceTotals(
    lineItems,
    normalizedTaxRate,
  );

  return {
    subtotal,
    taxRate: normalizedTaxRate,
    taxAmount,
    total,
    balanceDue: total,
  };
}

function isValidLineItem(item: InvoiceFormData["lineItems"][number]): boolean {
  return (
    (item.name.trim().length > 0 || item.description.trim().length > 0) &&
    item.quantity > 0
  );
}

function mapInvoiceFormDataToInsert(
  companyId: string,
  invoiceNumber: string,
  data: InvoiceFormData,
): InvoiceInsert {
  const issueDate = data.issueDate.trim() || getDefaultIssueDate();
  const dueDate = resolveDueDate(issueDate, data.dueDate);
  const { subtotal, taxRate, taxAmount, total, balanceDue } = computeTotals(
    data.lineItems,
    data.taxRate,
  );

  return {
    company_id: companyId,
    customer_id: data.customerId,
    job_id: data.jobId?.trim() || null,
    estimate_id: data.estimateId?.trim() || null,
    invoice_number: invoiceNumber,
    status: data.status,
    subtotal,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    total,
    amount_paid: 0,
    balance_due: balanceDue,
    issue_date: issueDate,
    due_date: dueDate,
    notes: data.notes.trim() || null,
  };
}

function mapLineItemsToInsert(
  companyId: string,
  invoiceId: string,
  lineItems: InvoiceFormData["lineItems"],
): InvoiceLineItemInsert[] {
  return lineItems.map((item, index) => {
    const name = item.name.trim() || item.description.trim();
    const description = item.description.trim() || null;
    const lineTotal = roundCurrency(
      Math.max(item.quantity, 0) * roundCurrency(Math.max(item.unitPrice, 0)),
    );

    return {
      company_id: companyId,
      invoice_id: invoiceId,
      service_item_id: item.serviceItemId?.trim() || null,
      sort_order: index,
      name,
      description,
      quantity: item.quantity,
      unit_price: roundCurrency(Math.max(item.unitPrice, 0)),
      taxable: item.taxable,
      line_total: lineTotal,
    };
  });
}

async function validateCustomer(
  companyId: string,
  customerId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("company_id", companyId)
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    console.error("[validateCustomer] lookup failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  if (!data) {
    return { error: "Selected customer was not found." };
  }

  return { error: null };
}

async function validateJob(
  companyId: string,
  customerId: string,
  jobId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("id, customer_id")
    .eq("company_id", companyId)
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    console.error("[validateJob] lookup failed:", {
      companyId,
      jobId,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  if (!data) {
    return { error: "Selected job was not found." };
  }

  if (data.customer_id !== customerId) {
    return { error: "Selected job does not belong to this customer." };
  }

  return { error: null };
}

async function validateEstimateNotConverted(
  companyId: string,
  estimateId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoices")
    .select("id")
    .eq("company_id", companyId)
    .eq("estimate_id", estimateId)
    .maybeSingle();

  if (error) {
    console.error("[validateEstimateNotConverted] lookup failed:", {
      companyId,
      estimateId,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  if (data) {
    return { error: "An invoice already exists for this estimate." };
  }

  return { error: null };
}

export async function listInvoices(companyId: string): Promise<Invoice[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_LIST_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listInvoices] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return ((data ?? []) as InvoiceRowWithRelations[]).map(mapInvoiceRowToInvoice);
}

export async function listInvoicesByCustomer(
  companyId: string,
  customerId: string,
  limit = 5,
): Promise<Invoice[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_LIST_SELECT)
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listInvoicesByCustomer] query failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return ((data ?? []) as InvoiceRowWithRelations[]).map(mapInvoiceRowToInvoice);
}

export async function getInvoiceById(
  companyId: string,
  invoiceId: string,
): Promise<InvoiceDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_DETAIL_SELECT)
    .eq("company_id", companyId)
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    console.error("[getInvoiceById] query failed:", {
      companyId,
      invoiceId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(mapDatabaseError(error));
  }

  if (!data) {
    return null;
  }

  const row = data as InvoiceRowWithRelations;
  const lineItemRows = (row.invoice_line_items ?? []) as InvoiceLineItemRow[];

  return mapInvoiceRowToInvoiceDetail({
    ...row,
    invoice_line_items: sortLineItems(lineItemRows),
  });
}

export async function updateInvoiceStatus(
  companyId: string,
  invoiceId: string,
  fromStatus: InvoiceStatus,
  toStatus: InvoiceStatus,
): Promise<{ invoice: InvoiceDetail | null; error: string | null }> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("invoices")
    .update({ status: toStatus })
    .eq("company_id", companyId)
    .eq("id", invoiceId)
    .eq("status", fromStatus)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[updateInvoiceStatus] update failed:", {
      companyId,
      invoiceId,
      fromStatus,
      toStatus,
      code: error.code,
      message: error.message,
    });
    return { invoice: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return {
      invoice: null,
      error: "Invoice status has changed. Refresh the page and try again.",
    };
  }

  const invoice = await getInvoiceById(companyId, invoiceId);

  return {
    invoice,
    error: invoice ? null : "Failed to load updated invoice.",
  };
}

export async function getInvoiceByEstimateId(
  companyId: string,
  estimateId: string,
): Promise<InvoiceDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_DETAIL_SELECT)
    .eq("company_id", companyId)
    .eq("estimate_id", estimateId)
    .maybeSingle();

  if (error) {
    console.error("[getInvoiceByEstimateId] query failed:", {
      companyId,
      estimateId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data) {
    return null;
  }

  const row = data as InvoiceRowWithRelations;
  const lineItemRows = (row.invoice_line_items ?? []) as InvoiceLineItemRow[];

  return mapInvoiceRowToInvoiceDetail({
    ...row,
    invoice_line_items: sortLineItems(lineItemRows),
  });
}

export async function createInvoice(
  companyId: string,
  data: InvoiceFormData,
): Promise<{ invoice: InvoiceDetail | null; error: string | null }> {
  const validLineItems = data.lineItems.filter(isValidLineItem);

  if (validLineItems.length === 0) {
    return { invoice: null, error: "At least one line item is required." };
  }

  const customerValidation = await validateCustomer(companyId, data.customerId);
  if (customerValidation.error) {
    return { invoice: null, error: customerValidation.error };
  }

  if (data.jobId?.trim()) {
    const jobValidation = await validateJob(
      companyId,
      data.customerId,
      data.jobId.trim(),
    );
    if (jobValidation.error) {
      return { invoice: null, error: jobValidation.error };
    }
  }

  if (data.estimateId?.trim()) {
    const estimateValidation = await validateEstimateNotConverted(
      companyId,
      data.estimateId.trim(),
    );
    if (estimateValidation.error) {
      return { invoice: null, error: estimateValidation.error };
    }
  }

  const supabase = await createClient();
  const invoiceNumber = await generateInvoiceNumber(companyId);
  const insert = mapInvoiceFormDataToInsert(companyId, invoiceNumber, {
    ...data,
    lineItems: validLineItems,
  });

  const { data: row, error } = await supabase
    .from("invoices")
    .insert(insert)
    .select("id")
    .single();

  if (error || !row) {
    console.error("[createInvoice] insert failed:", {
      companyId,
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
    return {
      invoice: null,
      error: error ? mapDatabaseError(error) : "Failed to create invoice.",
    };
  }

  const lineItemInserts = mapLineItemsToInsert(
    companyId,
    row.id,
    validLineItems,
  );

  const { error: lineItemsError } = await supabase
    .from("invoice_line_items")
    .insert(lineItemInserts);

  if (lineItemsError) {
    console.error("[createInvoice] line items insert failed:", {
      companyId,
      invoiceId: row.id,
      code: lineItemsError.code,
      message: lineItemsError.message,
    });
    await supabase.from("invoices").delete().eq("id", row.id);
    return { invoice: null, error: mapDatabaseError(lineItemsError) };
  }

  const invoice = await getInvoiceById(companyId, row.id);

  return {
    invoice,
    error: invoice ? null : "Failed to load created invoice.",
  };
}

export async function convertEstimateToInvoice(
  companyId: string,
  estimateId: string,
): Promise<{ invoice: InvoiceDetail | null; error: string | null }> {
  const estimate = await getEstimateById(companyId, estimateId);

  if (!estimate) {
    return { invoice: null, error: "Estimate not found." };
  }

  if (estimate.status !== "approved") {
    return {
      invoice: null,
      error: "Only approved estimates can be converted to invoices.",
    };
  }

  const duplicateCheck = await validateEstimateNotConverted(
    companyId,
    estimateId,
  );
  if (duplicateCheck.error) {
    return { invoice: null, error: duplicateCheck.error };
  }

  const formData: InvoiceFormData = {
    customerId: estimate.customerId,
    jobId: estimate.jobId,
    estimateId: estimate.id,
    status: "draft",
    issueDate: getDefaultIssueDate(),
    dueDate: getDefaultDueDate(),
    notes: estimate.notes ?? "",
    taxRate: estimate.taxRate,
    lineItems: estimate.lineItems.map((item) => ({
      serviceItemId: item.serviceItemId,
      name: item.name,
      description: item.description ?? "",
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxable: item.taxable,
    })),
  };

  const { invoice, error } = await createInvoice(companyId, formData);

  if (error || !invoice) {
    return { invoice: null, error: error ?? "Failed to create invoice." };
  }

  const { error: statusError } = await updateEstimateStatus(
    companyId,
    estimateId,
    "approved",
    "converted",
  );

  if (statusError) {
    console.error("[convertEstimateToInvoice] estimate status update failed:", {
      companyId,
      estimateId,
      invoiceId: invoice.id,
      error: statusError,
    });

    const supabase = await createClient();
    await supabase.from("invoices").delete().eq("id", invoice.id);

    return {
      invoice: null,
      error:
        "Failed to convert estimate. The estimate status may have changed — refresh and try again.",
    };
  }

  return { invoice, error: null };
}
