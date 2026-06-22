"use server";

import { revalidatePath } from "next/cache";
import { canCollectInvoicePaymentOnSite } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { getJobById } from "@/lib/database/queries/jobs";
import {
  createInvoicePaymentTokenForEmail,
  createInvoicePaymentTokenWithServiceRole,
} from "@/lib/database/queries/invoice-payment-tokens";
import { getInvoicePaymentLinkTargetWithServiceRole } from "@/lib/database/queries/invoices";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import {
  getBillingEmailFailureUserMessage,
  getPaymentLinkFailureUserMessage,
  INVALID_APP_URL_USER_MESSAGE,
  logBillingEmailFailure,
  MISSING_APP_URL_USER_MESSAGE,
} from "@/lib/email/billing-failure";
import {
  sendInvoicePaymentLinkEmail,
  toBillingEmailDelivery,
  type BillingEmailDelivery,
} from "@/lib/email/billing-send";
import { resolveAppBaseUrl } from "@/lib/email/env";
import { isSmsSendingConfigured } from "@/lib/sms/env";
import { mapCompanyRowToBillingContact } from "@/shared/lib/billing-company-contact";
import { buildInvoicePaymentUrl } from "@/shared/lib/invoice-payment-link";
import { isValidEmail } from "@/shared/lib/email-validation";
import { canRecordInvoicePayment } from "@/shared/types/invoice-payment";

export type CreateInvoicePaymentLinkActionResult = {
  error?: string;
  paymentUrl?: string;
};

export type SendInvoicePaymentLinkEmailActionResult = {
  error?: string;
  success?: boolean;
  recipientEmail?: string;
  paymentUrl?: string;
  emailDelivery?: BillingEmailDelivery;
};

export type SendInvoicePaymentLinkSmsActionResult = {
  error?: string;
  success?: boolean;
  paymentUrl?: string;
};

type PreparedInvoicePaymentLink = {
  paymentUrl: string;
  customerEmail: string;
  invoiceNumber: string;
  customerName: string;
  balanceDue: number;
};

type ValidatedInvoicePaymentLink = {
  invoiceId: string;
  customerEmail: string;
  invoiceNumber: string;
  customerName: string;
  balanceDue: number;
};

const PAYMENT_LINK_EMAIL_FAILURE_RECOVERY =
  " Email failed, but a new payment link was created. Copy it or show the QR code.";

const SMS_NOT_CONFIGURED_MESSAGE =
  "Text message sending is not configured yet.";

async function assertInvoicePaymentLinkAccess(
  context: ActiveCompanyContext,
  invoice: NonNullable<
    Awaited<ReturnType<typeof getInvoicePaymentLinkTargetWithServiceRole>>
  >,
  jobId?: string,
): Promise<string | null> {
  if (context.permissions.manageBilling) {
    return null;
  }

  const linkedJobId = jobId?.trim() || invoice.jobId;

  if (!linkedJobId) {
    return "You do not have permission to collect payment for this invoice.";
  }

  if (invoice.jobId && invoice.jobId !== linkedJobId) {
    return "Invoice is not linked to this job.";
  }

  const job = await getJobById(context.company.id, linkedJobId);

  if (!job) {
    return "Linked job not found.";
  }

  if (!canCollectInvoicePaymentOnSite(context, job)) {
    return "You do not have permission to collect payment for this job.";
  }

  return null;
}

async function validateInvoicePaymentLinkRequest(
  context: ActiveCompanyContext,
  input: {
    invoiceId: string;
    jobId?: string;
  },
): Promise<{ error?: string; validated?: ValidatedInvoicePaymentLink }> {
  const invoiceId = input.invoiceId.trim();

  if (!invoiceId) {
    return { error: "Invoice not found." };
  }

  const invoice = await getInvoicePaymentLinkTargetWithServiceRole(
    context.company.id,
    invoiceId,
  );

  if (!invoice) {
    return { error: "Invoice not found." };
  }

  const accessError = await assertInvoicePaymentLinkAccess(
    context,
    invoice,
    input.jobId,
  );

  if (accessError) {
    return { error: accessError };
  }

  if (!canRecordInvoicePayment(invoice)) {
    return { error: "This invoice has no balance due." };
  }

  const customerEmail = invoice.customerEmail?.trim();

  if (!customerEmail || !isValidEmail(customerEmail)) {
    return {
      error:
        "A valid customer email is required. Add an email on the customer record first.",
    };
  }

  const appUrl = resolveAppBaseUrl();

  if (!appUrl.ok) {
    const error =
      appUrl.reason === "invalid"
        ? INVALID_APP_URL_USER_MESSAGE
        : MISSING_APP_URL_USER_MESSAGE;

    console.error("[validateInvoicePaymentLinkRequest] app URL not configured:", {
      invoiceId,
      reason: appUrl.reason,
    });

    return { error: getPaymentLinkFailureUserMessage(error) };
  }

  return {
    validated: {
      invoiceId,
      customerEmail,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      balanceDue: invoice.balanceDue,
    },
  };
}

async function issueInvoicePaymentLinkToken(
  context: ActiveCompanyContext,
  validated: ValidatedInvoicePaymentLink,
): Promise<{ error?: string; link?: PreparedInvoicePaymentLink }> {
  const appUrl = resolveAppBaseUrl();

  if (!appUrl.ok) {
    const error =
      appUrl.reason === "invalid"
        ? INVALID_APP_URL_USER_MESSAGE
        : MISSING_APP_URL_USER_MESSAGE;

    return { error: getPaymentLinkFailureUserMessage(error) };
  }

  const tokenInput = {
    companyId: context.company.id,
    invoiceId: validated.invoiceId,
    customerEmail: validated.customerEmail,
    createdBy: context.user.id,
  };

  const { rawToken, error: tokenError } = context.permissions.manageBilling
    ? await createInvoicePaymentTokenForEmail(tokenInput)
    : await createInvoicePaymentTokenWithServiceRole(tokenInput);

  if (tokenError || !rawToken) {
    console.error("[issueInvoicePaymentLinkToken] token creation failed:", {
      invoiceId: validated.invoiceId,
      error: tokenError ?? "missing raw token",
    });

    return {
      error: getPaymentLinkFailureUserMessage(
        tokenError ?? "Failed to create invoice payment link.",
      ),
    };
  }

  return {
    link: {
      paymentUrl: buildInvoicePaymentUrl(appUrl.url, rawToken),
      customerEmail: validated.customerEmail,
      invoiceNumber: validated.invoiceNumber,
      customerName: validated.customerName,
      balanceDue: validated.balanceDue,
    },
  };
}

async function prepareInvoicePaymentLink(
  context: ActiveCompanyContext,
  input: {
    invoiceId: string;
    jobId?: string;
  },
): Promise<{ error?: string; link?: PreparedInvoicePaymentLink }> {
  const validated = await validateInvoicePaymentLinkRequest(context, input);

  if (validated.error || !validated.validated) {
    return { error: validated.error ?? "Could not create payment link." };
  }

  return issueInvoicePaymentLinkToken(context, validated.validated);
}

export async function createInvoicePaymentLinkAction(input: {
  invoiceId: string;
  jobId?: string;
}): Promise<CreateInvoicePaymentLinkActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const prepared = await prepareInvoicePaymentLink(context, input);

  if (prepared.error || !prepared.link) {
    return { error: prepared.error ?? "Could not create payment link." };
  }

  return {
    paymentUrl: prepared.link.paymentUrl,
  };
}

export async function sendInvoicePaymentLinkEmailAction(input: {
  invoiceId: string;
  jobId?: string;
}): Promise<SendInvoicePaymentLinkEmailActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const validated = await validateInvoicePaymentLinkRequest(context, input);

  if (validated.error || !validated.validated) {
    return { error: validated.error ?? "Could not email payment link." };
  }

  const issued = await issueInvoicePaymentLinkToken(
    context,
    validated.validated,
  );

  if (issued.error || !issued.link) {
    return { error: issued.error ?? "Could not email payment link." };
  }

  const { link } = issued;

  const emailResult = await sendInvoicePaymentLinkEmail({
    to: link.customerEmail,
    company: mapCompanyRowToBillingContact(context.company),
    customerName: link.customerName,
    invoiceNumber: link.invoiceNumber,
    balanceDue: link.balanceDue,
    paymentUrl: link.paymentUrl,
  });

  if (!emailResult.ok) {
    logBillingEmailFailure("sendInvoicePaymentLinkEmailAction", emailResult, {
      invoiceId: input.invoiceId.trim(),
    });

    const baseError = getBillingEmailFailureUserMessage(emailResult, {
      document: "invoice",
      mode: "send",
    });

    return {
      error: `${baseError}${PAYMENT_LINK_EMAIL_FAILURE_RECOVERY}`,
      paymentUrl: link.paymentUrl,
      emailDelivery: toBillingEmailDelivery(emailResult),
    };
  }

  revalidatePath(`/invoices/${input.invoiceId.trim()}`);

  if (input.jobId?.trim()) {
    revalidatePath(`/jobs/${input.jobId.trim()}`);
  }

  const emailDelivery = toBillingEmailDelivery(emailResult);

  return {
    success: true,
    recipientEmail: link.customerEmail,
    paymentUrl: link.paymentUrl,
    emailDelivery: emailDelivery.recipientRedirect?.redirected
      ? emailDelivery
      : undefined,
  };
}

export async function sendInvoicePaymentLinkSmsAction(input: {
  invoiceId: string;
  jobId?: string;
}): Promise<SendInvoicePaymentLinkSmsActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!isSmsSendingConfigured()) {
    return { error: SMS_NOT_CONFIGURED_MESSAGE };
  }

  const validated = await validateInvoicePaymentLinkRequest(context, input);

  if (validated.error || !validated.validated) {
    return { error: validated.error ?? "Could not text payment link." };
  }

  return { error: SMS_NOT_CONFIGURED_MESSAGE };
}
