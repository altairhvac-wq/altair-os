import { createClient } from "@/lib/supabase/server";
import type { EstimateStatus } from "@/shared/types/estimate";
import type { InvoiceStatus } from "@/shared/types/invoice";
import type {
  JobBillingSummariesByJobId,
  JobEstimateSummary,
  JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";

type EstimateSummaryRow = {
  id: string;
  job_id: string | null;
  status: EstimateStatus;
  created_at: string;
  estimate_number: string;
};

type InvoiceSummaryRow = {
  id: string;
  job_id: string | null;
  status: InvoiceStatus;
  balance_due: number;
  amount_paid: number;
  created_at: string;
  invoice_number: string;
};

export type { JobBillingSummariesByJobId } from "@/shared/lib/job-next-business-action";

const ESTIMATE_SUMMARY_SELECT =
  "id, job_id, status, created_at, estimate_number";

const INVOICE_SUMMARY_SELECT =
  "id, job_id, status, balance_due, amount_paid, created_at, invoice_number";

function mapEstimateSummaryRow(row: EstimateSummaryRow): {
  jobId: string;
  summary: JobEstimateSummary;
} | null {
  if (!row.job_id) {
    return null;
  }

  return {
    jobId: row.job_id,
    summary: {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      estimateNumber: row.estimate_number,
    },
  };
}

function mapInvoiceSummaryRow(row: InvoiceSummaryRow): {
  jobId: string;
  summary: JobInvoiceSummary;
} | null {
  if (!row.job_id) {
    return null;
  }

  return {
    jobId: row.job_id,
    summary: {
      id: row.id,
      status: row.status,
      balanceDue: row.balance_due,
      amountPaid: row.amount_paid,
      createdAt: row.created_at,
      invoiceNumber: row.invoice_number,
    },
  };
}

function groupSummariesByJobId<T>(
  rows: Array<{ jobId: string; summary: T }>,
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};

  for (const row of rows) {
    const existing = grouped[row.jobId];
    if (existing) {
      existing.push(row.summary);
    } else {
      grouped[row.jobId] = [row.summary];
    }
  }

  return grouped;
}

export async function listJobBillingSummariesForJobs(
  companyId: string,
  jobIds: string[],
  options?: { includeInvoices?: boolean },
): Promise<JobBillingSummariesByJobId> {
  const uniqueJobIds = [...new Set(jobIds.filter(Boolean))];

  if (uniqueJobIds.length === 0) {
    return {
      estimatesByJobId: {},
      invoicesByJobId: {},
    };
  }

  const supabase = await createClient();
  const includeInvoices = options?.includeInvoices ?? true;

  const estimatesPromise = supabase
    .from("estimates")
    .select(ESTIMATE_SUMMARY_SELECT)
    .eq("company_id", companyId)
    .in("job_id", uniqueJobIds)
    .order("created_at", { ascending: false });

  const invoicesPromise = includeInvoices
    ? supabase
        .from("invoices")
        .select(INVOICE_SUMMARY_SELECT)
        .eq("company_id", companyId)
        .in("job_id", uniqueJobIds)
        .order("created_at", { ascending: false })
    : Promise.resolve({ data: [] as InvoiceSummaryRow[], error: null });

  const [estimatesResult, invoicesResult] = await Promise.all([
    estimatesPromise,
    invoicesPromise,
  ]);

  if (estimatesResult.error) {
    console.error("[listJobBillingSummariesForJobs] estimates query failed:", {
      companyId,
      jobCount: uniqueJobIds.length,
      code: estimatesResult.error.code,
      message: estimatesResult.error.message,
    });
  }

  if (invoicesResult.error) {
    console.error("[listJobBillingSummariesForJobs] invoices query failed:", {
      companyId,
      jobCount: uniqueJobIds.length,
      code: invoicesResult.error.code,
      message: invoicesResult.error.message,
    });
  }

  const estimateRows = ((estimatesResult.data ?? []) as EstimateSummaryRow[])
    .map(mapEstimateSummaryRow)
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const invoiceRows = ((invoicesResult.data ?? []) as InvoiceSummaryRow[])
    .map(mapInvoiceSummaryRow)
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return {
    estimatesByJobId: groupSummariesByJobId(estimateRows),
    invoicesByJobId: groupSummariesByJobId(invoiceRows),
  };
}

export async function listJobBillingSummariesForJob(
  companyId: string,
  jobId: string,
  options?: { includeInvoices?: boolean },
): Promise<{
  estimates: JobEstimateSummary[];
  invoices: JobInvoiceSummary[];
}> {
  const summaries = await listJobBillingSummariesForJobs(
    companyId,
    [jobId],
    options,
  );

  return {
    estimates: summaries.estimatesByJobId[jobId] ?? [],
    invoices: summaries.invoicesByJobId[jobId] ?? [],
  };
}
