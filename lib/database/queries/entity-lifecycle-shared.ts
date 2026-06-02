import type { SupabaseClient } from "@supabase/supabase-js";

export const TRASH_RETENTION_DAYS = 60;

export function buildTrashTimestampFields(): {
  deleted_at: string;
  delete_after: string;
} {
  const deletedAt = new Date();
  const deleteAfter = new Date(deletedAt);
  deleteAfter.setDate(deleteAfter.getDate() + TRASH_RETENTION_DAYS);

  return {
    deleted_at: deletedAt.toISOString(),
    delete_after: deleteAfter.toISOString(),
  };
}

export async function countRelatedRecordsByColumn(
  supabase: SupabaseClient,
  companyId: string,
  table: string,
  column: string,
  value: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq(column, value);

  if (error) {
    console.error("[countRelatedRecordsByColumn] count failed:", {
      companyId,
      table,
      column,
      value,
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return count ?? 0;
}

export async function countInvoicePaymentsForJob(
  supabase: SupabaseClient,
  companyId: string,
  jobId: string,
): Promise<number> {
  const { data: invoiceRows, error: invoiceError } = await supabase
    .from("invoices")
    .select("id")
    .eq("company_id", companyId)
    .eq("job_id", jobId);

  if (invoiceError) {
    console.error("[countInvoicePaymentsForJob] invoice lookup failed:", {
      companyId,
      jobId,
      code: invoiceError.code,
      message: invoiceError.message,
    });
    return 0;
  }

  const invoiceIds = (invoiceRows ?? []).map((row) => row.id as string);
  if (invoiceIds.length === 0) {
    return 0;
  }

  const { count, error } = await supabase
    .from("invoice_payments")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("invoice_id", invoiceIds);

  if (error) {
    console.error("[countInvoicePaymentsForJob] payment count failed:", {
      companyId,
      jobId,
      code: error.code,
      message: error.message,
    });
    return 0;
  }

  return count ?? 0;
}
