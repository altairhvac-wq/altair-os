"use server";

import { canCaptureBillingSignature, canViewBilling } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { shouldHideDemoPrefixesForDisplay } from "@/lib/database/founder-marketing-display";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
import { listEstimateActivitiesForEstimate } from "@/lib/database/queries/estimate-activities";
import { getEstimateById } from "@/lib/database/queries/estimates";
import { getBillingSignatureForEntity } from "@/lib/database/queries/billing-signatures";
import { listInvoiceActivitiesForInvoice } from "@/lib/database/queries/invoice-activities";
import { listPaymentsForInvoice } from "@/lib/database/queries/invoice-payments";
import {
  getInvoiceByEstimateId,
  getInvoiceById,
  getInvoiceDeleteDependencies,
} from "@/lib/database/queries/invoices";
import { getJobById } from "@/lib/database/queries/jobs";
import { ensureInvoiceBillingStatesSynced } from "@/lib/database/services/invoice-billing";
import { isAiFeaturesEnabled } from "@/lib/ai/env";
import { isCompanyOnlineCheckoutAvailable } from "@/lib/payments/online-checkout-availability";
import { isSmsSendingConfigured } from "@/lib/sms/env";
import { mapCompanyRowToBillingContact } from "@/shared/lib/billing-company-contact";
import { buildInvoiceFormPrefillFromEstimate } from "@/shared/lib/jobs/build-invoice-form-from-estimate";
import {
  getEstimateCreateInitialData,
  getInvoiceCreateInitialData,
} from "@/shared/lib/company-billing-defaults";
import { formatDemoDisplayName } from "@/shared/lib/demo-display-name";
import type { BillingSignature } from "@/shared/types/billing-signature";
import type { EstimateActivity } from "@/shared/types/estimate-activity";
import type { EstimateDetail, EstimateFormData } from "@/shared/types/estimate";
import type { InvoiceActivity } from "@/shared/types/invoice-activity";
import type { InvoiceDeleteDependencies } from "@/shared/lib/invoice-lifecycle";
import type { InvoiceDetail, InvoiceFormData } from "@/shared/types/invoice";
import type { InvoicePayment } from "@/shared/types/invoice-payment";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";

export type JobWorkflowEstimateDocumentPayload = {
  estimate: EstimateDetail;
  activities: EstimateActivity[];
  linkedInvoice: InvoiceDetail | null;
  company: BillingCompanyContact;
  companyTimeZone: string;
  canManageEstimates: boolean;
  canManageCustomers: boolean;
  canCaptureSignature: boolean;
  signature: BillingSignature | null;
  displayCustomerName: string;
};

export type JobWorkflowInvoiceDocumentPayload = {
  invoice: InvoiceDetail;
  activities: InvoiceActivity[];
  payments: InvoicePayment[];
  company: BillingCompanyContact;
  companyTimeZone: string;
  canManageBilling: boolean;
  canManageCustomers: boolean;
  canCaptureSignature: boolean;
  signature: BillingSignature | null;
  deleteDependencies: InvoiceDeleteDependencies;
  onlinePaymentsEnabled: boolean;
  smsSendingConfigured: boolean;
  aiFeaturesEnabled: boolean;
  displayCustomerName: string;
};

export async function loadJobWorkflowEstimateDocumentAction(
  estimateId: string,
): Promise<{ error?: string; data?: JobWorkflowEstimateDocumentPayload }> {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!canViewBilling(context) && !context.permissions.createFieldEstimates) {
    return { error: "You do not have permission to open estimates." };
  }

  const [estimate, activities, linkedInvoice, signature] = await Promise.all([
    getEstimateById(context.company.id, estimateId),
    listEstimateActivitiesForEstimate(context.company.id, estimateId),
    getInvoiceByEstimateId(context.company.id, estimateId),
    getBillingSignatureForEntity(context.company.id, "estimate", estimateId),
  ]);

  if (!estimate) {
    return { error: "Estimate not found." };
  }

  const canManageEstimates = context.permissions.manageBilling;
  let canCaptureSignature = canManageEstimates;

  if (!canCaptureSignature && estimate.jobId) {
    const job = await getJobById(context.company.id, estimate.jobId);
    canCaptureSignature = canCaptureBillingSignature(
      context,
      "estimate",
      job,
    );
  }

  return {
    data: {
      estimate,
      activities,
      linkedInvoice,
      company: mapCompanyRowToBillingContact(context.company),
      companyTimeZone: context.company.timezone,
      canManageEstimates,
      canManageCustomers: context.permissions.manageCustomers,
      canCaptureSignature,
      signature,
      displayCustomerName: formatDemoDisplayName(
        estimate.customerName,
        shouldHideDemoPrefixesForDisplay(context.user),
      ),
    },
  };
}

export async function loadJobWorkflowInvoiceDocumentAction(
  invoiceId: string,
): Promise<{ error?: string; data?: JobWorkflowInvoiceDocumentPayload }> {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!canViewBilling(context)) {
    return { error: "You do not have permission to open invoices." };
  }

  const [
    invoice,
    activities,
    payments,
    signature,
    deleteDependencies,
    onlinePaymentsEnabled,
  ] = await Promise.all([
    ensureInvoiceBillingStatesSynced(
      context.company.id,
      context.company.timezone,
    ).then(() => getInvoiceById(context.company.id, invoiceId)),
    listInvoiceActivitiesForInvoice(context.company.id, invoiceId),
    listPaymentsForInvoice(context.company.id, invoiceId),
    getBillingSignatureForEntity(context.company.id, "invoice", invoiceId),
    getInvoiceDeleteDependencies(context.company.id, invoiceId),
    isCompanyOnlineCheckoutAvailable(context.company.id),
  ]);

  if (!invoice) {
    return { error: "Invoice not found." };
  }

  return {
    data: {
      invoice,
      activities,
      payments,
      company: mapCompanyRowToBillingContact(context.company),
      companyTimeZone: context.company.timezone,
      canManageBilling: context.permissions.manageBilling,
      canManageCustomers: context.permissions.manageCustomers,
      canCaptureSignature: canCaptureBillingSignature(context, "invoice"),
      signature,
      deleteDependencies,
      onlinePaymentsEnabled,
      smsSendingConfigured: isSmsSendingConfigured(),
      aiFeaturesEnabled: isAiFeaturesEnabled(),
      displayCustomerName: formatDemoDisplayName(
        invoice.customerName,
        shouldHideDemoPrefixesForDisplay(context.user),
      ),
    },
  };
}

export async function loadJobWorkflowEstimateCreateDefaultsAction(
  jobId: string,
  customerId: string,
): Promise<{ error?: string; initialData?: Partial<EstimateFormData> }> {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to create estimates." };
  }

  const job = await getJobById(context.company.id, jobId);
  if (!job || job.customerId !== customerId) {
    return { error: "Job not found for this customer." };
  }

  const billingDefaults = getCompanyBillingDefaultsFromRow(context.company);
  return {
    initialData: getEstimateCreateInitialData(
      billingDefaults,
      context.company.timezone,
      {
        customerId,
        jobId,
        status: "draft",
        notes: job.description?.trim()
          ? `Job ${job.jobNumber}: ${job.description.trim()}`
          : "",
      },
    ),
  };
}

export async function loadJobWorkflowInvoiceCreateDefaultsAction(input: {
  jobId: string;
  customerId: string;
  estimateId?: string;
}): Promise<{
  error?: string;
  initialData?: Partial<InvoiceFormData>;
  estimatePrefillNote?: string;
}> {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to create invoices." };
  }

  const job = await getJobById(context.company.id, input.jobId);
  if (!job || job.customerId !== input.customerId) {
    return { error: "Job not found for this customer." };
  }

  const billingDefaults = getCompanyBillingDefaultsFromRow(context.company);
  let prefill: Partial<InvoiceFormData> = {
    customerId: input.customerId,
    jobId: input.jobId,
    status: "draft",
  };
  let estimatePrefillNote: string | undefined;

  if (input.estimateId) {
    const estimate = await getEstimateById(
      context.company.id,
      input.estimateId,
    );
    if (!estimate) {
      return { error: "Estimate not found." };
    }
    if (estimate.jobId && estimate.jobId !== input.jobId) {
      return { error: "Estimate does not belong to this job." };
    }

    prefill = {
      ...buildInvoiceFormPrefillFromEstimate(estimate),
      jobId: estimate.jobId ?? input.jobId,
      customerId: estimate.customerId,
    };

    if (estimate.status === "approved") {
      estimatePrefillNote = `Prefilling from approved estimate ${estimate.estimateNumber}. You can edit line items before saving.`;
    } else {
      estimatePrefillNote = `Prefilling from estimate ${estimate.estimateNumber} (${estimate.status}). The invoice will not be linked until the estimate is approved and converted.`;
    }
  } else {
    estimatePrefillNote =
      "No estimate selected — creating a job-linked invoice without estimate line items.";
  }

  return {
    initialData: getInvoiceCreateInitialData(
      billingDefaults,
      context.company.timezone,
      prefill,
    ),
    estimatePrefillNote,
  };
}
