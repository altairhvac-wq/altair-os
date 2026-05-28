import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import { validateServiceItemIdsBelongToCompany } from "@/lib/database/queries/service-items";
import type {
  EstimateInsert,
  EstimateLineItemInsert,
  EstimateLineItemRow,
  EstimateRow,
} from "@/lib/database/types/core-tables";
import type { JobStatus } from "@/shared/types/job";
import { getCreateEstimateJobBlockReason } from "@/shared/types/estimate";
import {
  calculateEstimateTotals,
  getDefaultValidUntilDate,
  roundCurrency,
  type Estimate,
  type EstimateDetail,
  type EstimateFormData,
  type EstimateLineItem,
  type EstimateStatus,
} from "@/shared/types/estimate";

type CustomerSummary = {
  name: string;
  email?: string;
  phone?: string;
};

type JobSummary = {
  job_number: string;
};

type EstimateLineItemRowMinimal = Pick<EstimateLineItemRow, "id">;

type EstimateRowWithRelations = EstimateRow & {
  customers: CustomerSummary | null;
  jobs: JobSummary | null;
  estimate_line_items?: EstimateLineItemRow[] | EstimateLineItemRowMinimal[];
};

const ESTIMATE_LIST_SELECT = `
  *,
  customers(name),
  jobs(job_number),
  estimate_line_items(id)
`;

const ESTIMATE_DETAIL_SELECT = `
  *,
  customers(name, email, phone),
  jobs(job_number),
  estimate_line_items(*)
`;

function toDateOnly(value: string): string {
  return value.split("T")[0] ?? value;
}

function mapLineItemRow(row: EstimateLineItemRow): EstimateLineItem {
  const name = row.name.trim() || row.description;
  const description =
    row.description.trim() && row.description.trim() !== name
      ? row.description
      : undefined;

  return {
    id: row.id,
    serviceItemId: row.service_item_id ?? undefined,
    name,
    description,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    taxable: row.taxable,
  };
}

function sortLineItems(rows: EstimateLineItemRow[]): EstimateLineItemRow[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order);
}

export function mapEstimateRowToEstimate(
  row: EstimateRowWithRelations,
): Estimate {
  const lineItemRows = (row.estimate_line_items ?? []).filter(
    (item): item is EstimateLineItemRow => "description" in item,
  );
  const lineItems = sortLineItems(lineItemRows).map(mapLineItemRow);
  const lineItemCount =
    lineItems.length > 0
      ? lineItems.length
      : (row.estimate_line_items?.length ?? 0);

  return {
    id: row.id,
    estimateNumber: row.estimate_number,
    customerId: row.customer_id,
    customerName: row.customers?.name ?? "Unknown customer",
    jobId: row.job_id ?? undefined,
    jobNumber: row.jobs?.job_number ?? undefined,
    status: row.status,
    lineItems,
    lineItemCount,
    subtotal: Number(row.subtotal),
    taxRate: Number(row.tax_rate ?? 0),
    tax: Number(row.tax) || undefined,
    total: Number(row.total),
    validUntil: row.valid_until ? toDateOnly(row.valid_until) : undefined,
    notes: row.notes ?? undefined,
    createdAt: toDateOnly(row.created_at),
  };
}

function mapEstimateRowToEstimateDetail(
  row: EstimateRowWithRelations,
): EstimateDetail {
  const estimate = mapEstimateRowToEstimate(row);

  return {
    ...estimate,
    customerEmail: row.customers?.email || undefined,
    customerPhone: row.customers?.phone || undefined,
  };
}

async function generateEstimateNumber(companyId: string): Promise<string> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("estimates")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (error) {
    console.error("[generateEstimateNumber] count failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return `EST-${Date.now()}`;
  }

  return `EST-${1050 + (count ?? 0)}`;
}

function computeTotals(
  lineItems: EstimateFormData["lineItems"],
  taxRate: number,
) {
  const normalizedTaxRate = roundCurrency(Math.max(taxRate, 0));
  const { subtotal, tax, total } = calculateEstimateTotals(
    lineItems,
    normalizedTaxRate,
  );

  return { subtotal, taxRate: normalizedTaxRate, tax, total };
}

function resolveValidUntil(validUntil: string, timeZone?: string): string {
  const trimmed = validUntil.trim();
  return trimmed || getDefaultValidUntilDate(new Date(), timeZone);
}

function isValidLineItem(item: EstimateFormData["lineItems"][number]): boolean {
  return (
    (item.name.trim().length > 0 || item.description.trim().length > 0) &&
    item.quantity > 0
  );
}

function mapEstimateFormDataToInsert(
  companyId: string,
  estimateNumber: string,
  data: EstimateFormData,
  timeZone?: string,
): EstimateInsert {
  const { subtotal, taxRate, tax, total } = computeTotals(
    data.lineItems,
    data.taxRate,
  );

  return {
    company_id: companyId,
    customer_id: data.customerId,
    job_id: data.jobId?.trim() || null,
    estimate_number: estimateNumber,
    status: data.status,
    subtotal,
    tax_rate: taxRate,
    tax,
    total,
    valid_until: resolveValidUntil(data.validUntil, timeZone),
    notes: data.notes.trim() || null,
  };
}

function mapLineItemsToInsert(
  companyId: string,
  estimateId: string,
  lineItems: EstimateFormData["lineItems"],
): EstimateLineItemInsert[] {
  return lineItems.map((item, index) => {
    const name = item.name.trim() || item.description.trim();
    const description = item.description.trim();

    return {
      company_id: companyId,
      estimate_id: estimateId,
      service_item_id: item.serviceItemId?.trim() || null,
      sort_order: index,
      name,
      description,
      quantity: item.quantity,
      unit_price: roundCurrency(Math.max(item.unitPrice, 0)),
      taxable: item.taxable,
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
    .select("id, customer_id, status")
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

  const jobBlockReason = getCreateEstimateJobBlockReason(
    data.status as JobStatus,
  );
  if (jobBlockReason) {
    return { error: jobBlockReason };
  }

  return { error: null };
}

export async function listEstimates(companyId: string): Promise<Estimate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("estimates")
    .select(ESTIMATE_LIST_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listEstimates] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return ((data ?? []) as EstimateRowWithRelations[]).map(
    mapEstimateRowToEstimate,
  );
}

export async function listEstimatesByCustomer(
  companyId: string,
  customerId: string,
  limit = 5,
): Promise<Estimate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("estimates")
    .select(ESTIMATE_LIST_SELECT)
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listEstimatesByCustomer] query failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return ((data ?? []) as EstimateRowWithRelations[]).map(
    mapEstimateRowToEstimate,
  );
}

export async function listEstimatesForJob(
  companyId: string,
  jobId: string,
): Promise<Estimate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("estimates")
    .select(ESTIMATE_LIST_SELECT)
    .eq("company_id", companyId)
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listEstimatesForJob] query failed:", {
      companyId,
      jobId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return ((data ?? []) as EstimateRowWithRelations[]).map(
    mapEstimateRowToEstimate,
  );
}

export async function getEstimateById(
  companyId: string,
  estimateId: string,
): Promise<EstimateDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("estimates")
    .select(ESTIMATE_DETAIL_SELECT)
    .eq("company_id", companyId)
    .eq("id", estimateId)
    .maybeSingle();

  if (error) {
    console.error("[getEstimateById] query failed:", {
      companyId,
      estimateId,
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

  const row = data as EstimateRowWithRelations;
  const lineItemRows = (row.estimate_line_items ?? []) as EstimateLineItemRow[];

  return mapEstimateRowToEstimateDetail({
    ...row,
    estimate_line_items: sortLineItems(lineItemRows),
  });
}

export async function createEstimate(
  companyId: string,
  data: EstimateFormData,
  timeZone?: string,
): Promise<{ estimate: EstimateDetail | null; error: string | null }> {
  const validLineItems = data.lineItems.filter(isValidLineItem);

  if (validLineItems.length === 0) {
    return { estimate: null, error: "At least one line item is required." };
  }

  const customerValidation = await validateCustomer(companyId, data.customerId);
  if (customerValidation.error) {
    return { estimate: null, error: customerValidation.error };
  }

  if (data.jobId?.trim()) {
    const jobValidation = await validateJob(
      companyId,
      data.customerId,
      data.jobId.trim(),
    );
    if (jobValidation.error) {
      return { estimate: null, error: jobValidation.error };
    }
  }

  const serviceItemValidation = await validateServiceItemIdsBelongToCompany(
    companyId,
    validLineItems.map((item) => item.serviceItemId),
  );
  if (serviceItemValidation.error) {
    return { estimate: null, error: serviceItemValidation.error };
  }

  const supabase = await createClient();
  const estimateNumber = await generateEstimateNumber(companyId);
  const insert = mapEstimateFormDataToInsert(
    companyId,
    estimateNumber,
    {
      ...data,
      lineItems: validLineItems,
    },
    timeZone,
  );

  const { data: row, error } = await supabase
    .from("estimates")
    .insert(insert)
    .select("id")
    .single();

  if (error || !row) {
    console.error("[createEstimate] insert failed:", {
      companyId,
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
    return {
      estimate: null,
      error: error ? mapDatabaseError(error) : "Failed to create estimate.",
    };
  }

  const lineItemInserts = mapLineItemsToInsert(
    companyId,
    row.id,
    validLineItems,
  );

  const { error: lineItemsError } = await supabase
    .from("estimate_line_items")
    .insert(lineItemInserts);

  if (lineItemsError) {
    console.error("[createEstimate] line items insert failed:", {
      companyId,
      estimateId: row.id,
      code: lineItemsError.code,
      message: lineItemsError.message,
    });
    await supabase.from("estimates").delete().eq("id", row.id);
    return { estimate: null, error: mapDatabaseError(lineItemsError) };
  }

  const estimate = await getEstimateById(companyId, row.id);

  return {
    estimate,
    error: estimate ? null : "Failed to load created estimate.",
  };
}

export async function updateEstimateStatus(
  companyId: string,
  estimateId: string,
  fromStatus: EstimateStatus,
  toStatus: EstimateStatus,
): Promise<{ estimate: EstimateDetail | null; error: string | null }> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("estimates")
    .update({ status: toStatus })
    .eq("company_id", companyId)
    .eq("id", estimateId)
    .eq("status", fromStatus)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[updateEstimateStatus] update failed:", {
      companyId,
      estimateId,
      fromStatus,
      toStatus,
      code: error.code,
      message: error.message,
    });
    return { estimate: null, error: mapDatabaseError(error) };
  }

  if (!row) {
    return {
      estimate: null,
      error: "Estimate status has changed. Refresh the page and try again.",
    };
  }

  const estimate = await getEstimateById(companyId, estimateId);

  return {
    estimate,
    error: estimate ? null : "Failed to load updated estimate.",
  };
}
