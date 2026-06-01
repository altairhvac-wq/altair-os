"use server";

import { mapAiErrorToMessage } from "@/lib/ai/errors";
import { checkAiRateLimit } from "@/lib/ai/guardrails";
import {
  formatInvoiceLineItemSummary,
  INVOICE_MESSAGE_AI_FEATURE,
  prepareInvoiceMessageDraft,
} from "@/lib/ai/invoice-message";
import { generateDraftText } from "@/lib/ai/provider";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { getInvoiceById } from "@/lib/database/queries/invoices";
import { getJobById } from "@/lib/database/queries/jobs";
import { mapCompanyRowToBillingContact } from "@/shared/lib/billing-company-contact";
import {
  canShowInvoicePaymentLink,
  type InvoiceDetail,
} from "@/shared/types/invoice";
import type { InvoiceMessageDraftInput } from "@/shared/types/invoice-ai";
import type { JobDetail } from "@/shared/types/job";

export type GenerateInvoiceMessageDraftResult = {
  error?: string;
  draftText?: string;
};

async function assertInvoiceMessageDraftPermission(invoiceId: string) {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE } as const;
  }

  if (!context.permissions.manageBilling) {
    return {
      error: "You do not have access to draft an invoice message.",
    } as const;
  }

  const trimmedInvoiceId = invoiceId.trim();
  if (!trimmedInvoiceId) {
    return { error: "Invoice not found." } as const;
  }

  const invoice = await getInvoiceById(context.company.id, trimmedInvoiceId);

  if (!invoice) {
    return { error: "Invoice not found." } as const;
  }

  return { context, invoice } as const;
}

function buildInvoiceMessageDraftInput(
  invoice: InvoiceDetail,
  companyContact: ReturnType<typeof mapCompanyRowToBillingContact>,
  job: JobDetail | null,
): InvoiceMessageDraftInput {
  return {
    customerName: invoice.customerName,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    total: invoice.total,
    amountPaid: invoice.amountPaid,
    balanceDue: invoice.balanceDue,
    includeBillingAmounts: true,
    jobNumber: invoice.jobNumber ?? job?.jobNumber,
    jobType: job?.jobType,
    jobDescription: job?.description,
    lineItemSummary:
      formatInvoiceLineItemSummary(invoice.lineItems) ?? undefined,
    invoiceNotes: invoice.notes,
    customerEmail: invoice.customerEmail,
    customerPhone: invoice.customerPhone,
    companyName: companyContact.name,
    companyPhone: companyContact.phone ?? undefined,
    companyEmail: companyContact.email ?? undefined,
    paymentLinkEligible: canShowInvoicePaymentLink(invoice.status),
  };
}

export async function generateInvoiceMessageDraftAction(
  invoiceId: string,
): Promise<GenerateInvoiceMessageDraftResult> {
  const permission = await assertInvoiceMessageDraftPermission(invoiceId);

  if (permission.error || !permission.context || !permission.invoice) {
    return { error: permission.error };
  }

  const { context, invoice } = permission;
  const rateLimit = checkAiRateLimit({
    companyId: context.company.id,
    userId: context.user.id,
    feature: INVOICE_MESSAGE_AI_FEATURE,
  });

  if (!rateLimit.ok) {
    return { error: mapAiErrorToMessage(rateLimit.code) };
  }

  const companyContact = mapCompanyRowToBillingContact(context.company);
  const job = invoice.jobId
    ? await getJobById(context.company.id, invoice.jobId)
    : null;

  const preparation = prepareInvoiceMessageDraft(
    buildInvoiceMessageDraftInput(invoice, companyContact, job),
    context.company.id,
    context.user.id,
  );

  if (preparation.kind === "static") {
    return { error: preparation.draftText };
  }

  const outcome = await generateDraftText(preparation.request);

  if (!outcome.ok) {
    return {
      error: mapAiErrorToMessage(
        outcome.error.code,
        INVOICE_MESSAGE_AI_FEATURE,
      ),
    };
  }

  const draftText = outcome.result.draftText.trim();
  if (!draftText) {
    return {
      error: mapAiErrorToMessage(
        "empty_response",
        INVOICE_MESSAGE_AI_FEATURE,
      ),
    };
  }

  return { draftText };
}
