import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
import { listEstimatesForJob } from "@/lib/database/queries/estimates";
import {
  convertEstimateToInvoice,
  getInvoiceByEstimateId,
  listInvoicesForJob,
} from "@/lib/database/queries/invoices";
import { recordJobActivity } from "@/lib/database/queries/job-activities";
import { getJobById } from "@/lib/database/queries/jobs";
import { recordEstimateStatusChangedActivity } from "@/lib/database/services/estimate-activity";
import { recordInvoiceConvertedFromEstimateActivity } from "@/lib/database/services/invoice-activity";
import {
  captureCompletedJobReviewSnapshot,
  trackJobReviewBlockerResolutions,
} from "@/lib/database/services/job-review-resolution";
import { getJobProfitabilitySnapshot } from "@/lib/database/services/job-profitability";
import { notifyDraftInvoiceReady } from "@/lib/database/services/operational-notifications";
import type { DbClient } from "@/lib/database/db-client";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
  CompletionDraftInvoiceResult,
  CompletionDraftInvoiceSkipReason,
} from "@/shared/types/completion-draft-invoice";
import { isActiveInvoice } from "@/shared/types/invoice";
import type { Estimate } from "@/shared/types/estimate";

function selectApprovedEstimateForConversion(
  estimates: Estimate[],
): Estimate | null {
  return (
    estimates
      .filter((estimate) => estimate.status === "approved")
      .sort(
        (left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )[0] ?? null
  );
}

function estimateHasBillableLineItems(estimate: Estimate): boolean {
  return estimate.lineItems.some(
    (item) =>
      item.name.trim().length > 0 ||
      (item.description?.trim().length ?? 0) > 0,
  );
}

async function loadCompanyBillingContext(companyId: string): Promise<{
  timeZone?: string;
  billingDefaults: ReturnType<typeof getCompanyBillingDefaultsFromRow>;
} | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("companies")
    .select("timezone, settings")
    .eq("id", companyId)
    .maybeSingle();

  if (error || !data) {
    console.error("[maybeAutoCreateDraftInvoiceForCompletedJob] company lookup failed:", {
      companyId,
      code: error?.code,
      message: error?.message,
    });
    return null;
  }

  return {
    timeZone: data.timezone ?? undefined,
    billingDefaults: getCompanyBillingDefaultsFromRow(data),
  };
}

async function recordAutoDraftInvoiceJobActivity(input: {
  companyId: string;
  jobId: string;
  actorId: string;
  invoiceId: string;
  invoiceNumber: string;
  estimateId: string;
  estimateNumber: string;
  customerId?: string;
  jobNumber?: string;
}): Promise<void> {
  const { error } = await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: "invoice_auto_created_from_completion",
    metadata: {
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
      invoice_id: input.invoiceId,
      invoice_number: input.invoiceNumber,
      estimate_id: input.estimateId,
      estimate_number: input.estimateNumber,
      automated: true,
      source: "automatic",
    },
  });

  if (error) {
    console.error("[recordAutoDraftInvoiceJobActivity] failed:", {
      jobId: input.jobId,
      invoiceId: input.invoiceId,
      error,
    });
  }
}

function skipped(
  reason: CompletionDraftInvoiceSkipReason,
  context?: { companyId: string; jobId: string },
): CompletionDraftInvoiceResult {
  console.info("[maybeAutoCreateDraftInvoiceForCompletedJob] skipped:", {
    reason,
    companyId: context?.companyId,
    jobId: context?.jobId,
  });
  return { outcome: "skipped", reason };
}

function resolvePrivilegedDbClient(): DbClient | null {
  try {
    return createServiceRoleClient();
  } catch (error) {
    console.error(
      "[maybeAutoCreateDraftInvoiceForCompletedJob] service role client unavailable:",
      error,
    );
    return null;
  }
}

/**
 * Idempotent, non-blocking post-completion hook: creates a draft invoice from an
 * approved estimate when safe. Never throws — callers must not await failure paths
 * in a way that blocks work completion.
 */
export async function maybeAutoCreateDraftInvoiceForCompletedJob(input: {
  companyId: string;
  jobId: string;
  completedByUserId: string;
}): Promise<CompletionDraftInvoiceResult> {
  const logContext = {
    companyId: input.companyId,
    jobId: input.jobId,
  };

  try {
    const privilegedDb = resolvePrivilegedDbClient();

    if (!privilegedDb) {
      return {
        outcome: "failed",
        error: "Draft invoice automation is not configured on the server.",
      };
    }

    const job = await getJobById(input.companyId, input.jobId);

    if (!job) {
      return skipped("job_not_found", logContext);
    }

    if (job.status !== "completed") {
      return skipped("job_not_completed", logContext);
    }

    if (!job.customerId) {
      return skipped("no_customer", logContext);
    }

    const invoices = await listInvoicesForJob(
      input.companyId,
      input.jobId,
      privilegedDb,
    );
    const activeInvoice = invoices.find((invoice) => isActiveInvoice(invoice));

    if (activeInvoice) {
      console.info("[maybeAutoCreateDraftInvoiceForCompletedJob] already_exists:", {
        ...logContext,
        invoiceId: activeInvoice.id,
      });
      return {
        outcome: "already_exists",
        invoiceId: activeInvoice.id,
      };
    }

    const profitability = await getJobProfitabilitySnapshot(
      input.companyId,
      input.jobId,
      undefined,
      privilegedDb,
    );

    if (profitability.completeness.openLaborEntryCount > 0) {
      return skipped("open_labor_entries", logContext);
    }

    const estimates = await listEstimatesForJob(
      input.companyId,
      input.jobId,
      privilegedDb,
    );
    const approvedEstimate = selectApprovedEstimateForConversion(estimates);

    if (!approvedEstimate) {
      return skipped("no_approved_estimate", logContext);
    }

    if (!estimateHasBillableLineItems(approvedEstimate)) {
      return skipped("estimate_missing_line_items", logContext);
    }

    const existingEstimateInvoice = await getInvoiceByEstimateId(
      input.companyId,
      approvedEstimate.id,
      privilegedDb,
    );

    if (existingEstimateInvoice && isActiveInvoice(existingEstimateInvoice)) {
      console.info("[maybeAutoCreateDraftInvoiceForCompletedJob] already_exists:", {
        ...logContext,
        invoiceId: existingEstimateInvoice.id,
        estimateId: approvedEstimate.id,
      });
      return {
        outcome: "already_exists",
        invoiceId: existingEstimateInvoice.id,
      };
    }

    const companyContext = await loadCompanyBillingContext(input.companyId);

    if (!companyContext) {
      return { outcome: "failed", error: "Company billing settings unavailable." };
    }

    const reviewSnapshotBefore = await captureCompletedJobReviewSnapshot(
      input.companyId,
      input.jobId,
      job.status,
    );

    const { invoice, error } = await convertEstimateToInvoice(
      input.companyId,
      approvedEstimate.id,
      companyContext.timeZone,
      companyContext.billingDefaults,
      privilegedDb,
    );

    if (error || !invoice) {
      console.error("[maybeAutoCreateDraftInvoiceForCompletedJob] conversion failed:", {
        companyId: input.companyId,
        jobId: input.jobId,
        estimateId: approvedEstimate.id,
        error: error ?? "missing invoice",
      });
      return {
        outcome: "failed",
        error: error ?? "Failed to create draft invoice.",
      };
    }

    console.info("[maybeAutoCreateDraftInvoiceForCompletedJob] created:", {
      ...logContext,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      estimateId: approvedEstimate.id,
    });

    await Promise.all([
      recordInvoiceConvertedFromEstimateActivity({
        companyId: input.companyId,
        invoiceId: invoice.id,
        actorId: input.completedByUserId,
        invoiceNumber: invoice.invoiceNumber,
        estimateId: approvedEstimate.id,
        estimateNumber: approvedEstimate.estimateNumber,
        customerId: invoice.customerId,
        jobId: invoice.jobId,
        jobNumber: invoice.jobNumber,
      }),
      recordEstimateStatusChangedActivity({
        companyId: input.companyId,
        estimateId: approvedEstimate.id,
        actorId: input.completedByUserId,
        fromStatus: "approved",
        toStatus: "converted",
        customerId: invoice.customerId,
        jobId: invoice.jobId,
        jobNumber: invoice.jobNumber,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        estimateNumber: approvedEstimate.estimateNumber,
      }),
      recordAutoDraftInvoiceJobActivity({
        companyId: input.companyId,
        jobId: input.jobId,
        actorId: input.completedByUserId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        estimateId: approvedEstimate.id,
        estimateNumber: approvedEstimate.estimateNumber,
        customerId: invoice.customerId,
        jobNumber: invoice.jobNumber,
      }),
    ]);

    if (reviewSnapshotBefore) {
      void trackJobReviewBlockerResolutions({
        companyId: input.companyId,
        jobId: input.jobId,
        jobStatus: job.status,
        actorId: input.completedByUserId,
        beforeSnapshot: reviewSnapshotBefore,
        jobNumber: invoice.jobNumber,
        customerId: invoice.customerId,
      }).catch((trackingError) => {
        console.error(
          "[maybeAutoCreateDraftInvoiceForCompletedJob] review resolution tracking failed:",
          { jobId: input.jobId, trackingError },
        );
      });
    }

    notifyDraftInvoiceReady({
      companyId: input.companyId,
      actorId: input.completedByUserId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      jobId: input.jobId,
      jobNumber: invoice.jobNumber,
      customerId: invoice.customerId,
    });

    return {
      outcome: "created",
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      estimateId: approvedEstimate.id,
    };
  } catch (error) {
    console.error("[maybeAutoCreateDraftInvoiceForCompletedJob] unexpected error:", {
      companyId: input.companyId,
      jobId: input.jobId,
      error,
    });

    return {
      outcome: "failed",
      error: "Unexpected error while creating draft invoice.",
    };
  }
}
