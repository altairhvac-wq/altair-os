import {
  getBillingEmailFailureCode,
  type BillingEmailFailureCode,
} from "@/lib/email/billing-failure";
import {
  formatBillingEmailCompanyContactHtml,
  formatBillingEmailCompanyContactText,
  formatBillingEmailCompanyHeaderHtml,
  formatBillingEmailDocumentMetaHtml,
  formatBillingEmailFooter,
  formatBillingEmailGreetingHtml,
  formatBillingEmailLineItemsHtml,
  formatBillingEmailLineItemsText,
  formatBillingEmailMultilineText,
  formatBillingEmailNotesHtml,
  formatBillingEmailTotalsHtml,
  formatBillingEmailTotalsText,
  formatEstimateApprovalCtaHtml,
  formatEstimateApprovalCtaText,
  formatEstimateTotalHeroHtml,
  formatInvoiceAmountDueHeroHtml,
  formatInvoicePaymentCtaHtml,
  formatInvoicePaymentCtaText,
  formatBillingEmailSecureLinkFallbackHtml,
  formatInvoicePaymentGuidanceHtml,
  formatInvoicePaymentGuidanceText,
  escapeBillingEmailHtml,
  wrapBillingEmailHtml,
  type BillingEmailLineItem,
} from "@/lib/email/billing-email-layout";
import {
  sendViaResend,
  type EmailRecipientRedirect,
  type ResendSendResult,
} from "@/lib/email/resend";
import {
  getBillingCompanyReplyTo,
  type BillingCompanyContact,
} from "@/shared/lib/billing-company-contact";
import {
  formatBillingSignatureBlockHtml,
  formatBillingSignatureBlockText,
} from "@/shared/lib/billing-signature-block";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import type { BillingSignature } from "@/shared/types/billing-signature";

export type SendBillingEmailResult = ResendSendResult;

export type BillingEmailDeliveryStatus =
  | "sent"
  | "not_configured"
  | "failed";

export type BillingEmailDelivery = {
  status: BillingEmailDeliveryStatus;
  failureCode?: BillingEmailFailureCode;
  message?: string;
  missingEnv?: string[];
  recipientRedirect?: EmailRecipientRedirect;
};

export function toBillingEmailDelivery(
  emailResult: SendBillingEmailResult,
): BillingEmailDelivery {
  if (emailResult.ok) {
    return {
      status: "sent",
      recipientRedirect: emailResult.recipientRedirect,
      message: emailResult.recipientRedirect?.warning,
    };
  }

  if (emailResult.reason === "not_configured") {
    return {
      status: "not_configured",
      failureCode: "email_configuration_missing",
      message: emailResult.message,
      missingEnv: emailResult.missingEnv,
    };
  }

  const failureCode = getBillingEmailFailureCode(emailResult);

  return {
    status: "failed",
    failureCode,
    message:
      failureCode === "recipient_override_invalid" && emailResult.message?.trim()
        ? emailResult.message.trim()
        : undefined,
  };
}

type BillingEmailCompanyInput = Pick<
  BillingCompanyContact,
  | "name"
  | "phone"
  | "email"
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "state"
  | "postalCode"
>;

type SendEstimateEmailInput = {
  to: string;
  company: BillingEmailCompanyInput;
  customerName: string;
  estimateNumber: string;
  issuedDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  validUntil?: string;
  timeZone?: string;
  lineItems: BillingEmailLineItem[];
  notes?: string;
  approvalUrl?: string;
  signature?: BillingSignature | null;
};

type SendInvoiceEmailInput = {
  to: string;
  company: BillingEmailCompanyInput;
  customerName: string;
  invoiceNumber: string;
  issuedDate: string;
  dueDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  timeZone?: string;
  lineItems: BillingEmailLineItem[];
  notes?: string;
  signature?: BillingSignature | null;
  paymentUrl?: string;
};

function buildBillingEmailDeliveryOptions(
  company: BillingEmailCompanyInput,
): {
  fromDisplayName: string;
  replyTo?: string;
  hasReplyTo: boolean;
} {
  const replyTo = getBillingCompanyReplyTo(company);

  return {
    fromDisplayName: `${company.name} via Altair`,
    replyTo,
    hasReplyTo: Boolean(replyTo),
  };
}

export async function sendEstimateEmail(
  input: SendEstimateEmailInput,
): Promise<SendBillingEmailResult> {
  const companyName = input.company.name;
  const subject = `Estimate ${input.estimateNumber} from ${companyName}`;
  const validUntilLine = input.validUntil
    ? `Valid until: ${formatDate(input.validUntil, input.timeZone)}`
    : null;
  const notesText = input.notes?.trim()
    ? formatBillingEmailMultilineText(input.notes)
    : null;
  const companyContactText = formatBillingEmailCompanyContactText(input.company);
  const deliveryOptions = buildBillingEmailDeliveryOptions(input.company);
  const footer = formatBillingEmailFooter(
    companyName,
    deliveryOptions.hasReplyTo,
  );
  const approvalUrl = input.approvalUrl?.trim();
  const approvalCtaText = approvalUrl
    ? formatEstimateApprovalCtaText(approvalUrl)
    : null;
  const approvalCtaHtml = approvalUrl
    ? formatEstimateApprovalCtaHtml(approvalUrl)
    : "";
  const signatureEmailInput = {
    signature: input.signature,
    timeZone: input.timeZone,
  };
  const totalsText = formatBillingEmailTotalsText({
    subtotal: input.subtotal,
    taxRate: input.taxRate,
    taxAmount: input.taxAmount,
    total: input.total,
  });
  const intro = approvalUrl
    ? "here is your estimate."
    : "here is your estimate for review.";

  const text = [
    `Hello ${input.customerName},`,
    "",
    `${companyName} sent you estimate ${input.estimateNumber}.`,
    approvalUrl
      ? "Use the secure link below to review and sign this estimate online."
      : null,
    "",
    `Estimated total: ${formatCurrency(input.total)}`,
    `Issued: ${formatDate(input.issuedDate, input.timeZone)}`,
    validUntilLine,
    "",
    totalsText,
    "",
    "Line items:",
    formatBillingEmailLineItemsText(input.lineItems),
    notesText ? `\nNotes:\n${notesText}` : null,
    approvalCtaText,
    approvalUrl ? null : formatBillingSignatureBlockText("estimate", signatureEmailInput),
    companyContactText ? `\n${companyContactText}` : null,
    "",
    footer.text,
  ]
    .filter(Boolean)
    .join("\n");

  const htmlBody = `
    ${formatBillingEmailCompanyHeaderHtml(input.company)}
    ${formatBillingEmailDocumentMetaHtml({
      documentKind: "estimate",
      documentNumber: input.estimateNumber,
      customerName: input.customerName,
    })}
    ${formatBillingEmailGreetingHtml(input.customerName, intro)}
    ${formatEstimateTotalHeroHtml({
      total: input.total,
      issuedDate: input.issuedDate,
      validUntil: input.validUntil,
      timeZone: input.timeZone,
    })}
    ${approvalCtaHtml}
    ${formatBillingEmailLineItemsHtml(input.lineItems)}
    ${formatBillingEmailTotalsHtml({
      subtotal: input.subtotal,
      taxRate: input.taxRate,
      taxAmount: input.taxAmount,
      total: input.total,
    })}
    ${notesText ? formatBillingEmailNotesHtml(notesText) : ""}
    ${approvalUrl ? "" : formatBillingSignatureBlockHtml("estimate", signatureEmailInput)}
    ${formatBillingEmailCompanyContactHtml(input.company)}
    ${footer.html}
    ${approvalUrl ? formatBillingEmailSecureLinkFallbackHtml(approvalUrl) : ""}
  `.trim();

  return sendViaResend({
    to: input.to,
    subject,
    text,
    html: wrapBillingEmailHtml(htmlBody),
    logContext: "sendEstimateEmail",
    fromDisplayName: deliveryOptions.fromDisplayName,
    replyTo: deliveryOptions.replyTo,
  });
}

export async function sendInvoiceEmail(
  input: SendInvoiceEmailInput,
): Promise<SendBillingEmailResult> {
  const companyName = input.company.name;
  const subject = `Invoice ${input.invoiceNumber} from ${companyName}`;
  const notesText = input.notes?.trim()
    ? formatBillingEmailMultilineText(input.notes)
    : null;
  const companyContactText = formatBillingEmailCompanyContactText(input.company);
  const deliveryOptions = buildBillingEmailDeliveryOptions(input.company);
  const footer = formatBillingEmailFooter(
    companyName,
    deliveryOptions.hasReplyTo,
  );
  const signatureEmailInput = {
    signature: input.signature,
    timeZone: input.timeZone,
  };
  const paymentUrl = input.paymentUrl?.trim();
  const paymentCtaText = paymentUrl
    ? formatInvoicePaymentCtaText({
        paymentUrl,
        balanceDue: input.balanceDue,
      })
    : null;
  const paymentCtaHtml = paymentUrl
    ? formatInvoicePaymentCtaHtml({
        paymentUrl,
        balanceDue: input.balanceDue,
      })
    : "";
  const paymentGuidanceText = formatInvoicePaymentGuidanceText({
    company: input.company,
    dueDate: input.dueDate,
    balanceDue: input.balanceDue,
    timeZone: input.timeZone,
    hasReplyTo: deliveryOptions.hasReplyTo,
  });
  const totalsText = formatBillingEmailTotalsText({
    subtotal: input.subtotal,
    taxRate: input.taxRate,
    taxAmount: input.taxAmount,
    total: input.total,
    amountPaid: input.amountPaid,
    balanceDue: input.balanceDue,
  });
  const intro =
    input.balanceDue <= 0
      ? "here is your invoice — paid in full."
      : "here is your invoice.";

  const text = [
    `Hello ${input.customerName},`,
    "",
    `${companyName} sent you invoice ${input.invoiceNumber}.`,
    paymentUrl
      ? input.balanceDue <= 0
        ? "Use the secure link below to view this paid invoice online."
        : "Use the secure link below to view this invoice and contact us to pay."
      : null,
    "",
    `Amount due: ${formatCurrency(input.balanceDue)}`,
    `Issued: ${formatDate(input.issuedDate, input.timeZone)}`,
    `Due date: ${formatDate(input.dueDate, input.timeZone)}`,
    "",
    totalsText,
    "",
    "Line items:",
    formatBillingEmailLineItemsText(input.lineItems),
    notesText ? `\nNotes:\n${notesText}` : null,
    paymentCtaText,
    paymentUrl ? null : paymentGuidanceText ? `\n${paymentGuidanceText}` : null,
    "",
    formatBillingSignatureBlockText("invoice", signatureEmailInput),
    companyContactText ? `\n${companyContactText}` : null,
    "",
    footer.text,
  ]
    .filter(Boolean)
    .join("\n");

  const htmlBody = `
    ${formatBillingEmailCompanyHeaderHtml(input.company)}
    ${formatBillingEmailDocumentMetaHtml({
      documentKind: "invoice",
      documentNumber: input.invoiceNumber,
      customerName: input.customerName,
    })}
    ${formatBillingEmailGreetingHtml(input.customerName, intro)}
    ${formatInvoiceAmountDueHeroHtml({
      balanceDue: input.balanceDue,
      total: input.total,
      amountPaid: input.amountPaid,
      issuedDate: input.issuedDate,
      dueDate: input.dueDate,
      timeZone: input.timeZone,
    })}
    ${paymentCtaHtml}
    ${formatBillingEmailLineItemsHtml(input.lineItems)}
    ${formatBillingEmailTotalsHtml({
      subtotal: input.subtotal,
      taxRate: input.taxRate,
      taxAmount: input.taxAmount,
      total: input.total,
      amountPaid: input.amountPaid,
      balanceDue: input.balanceDue,
      highlightBalance: true,
    })}
    ${notesText ? formatBillingEmailNotesHtml(notesText) : ""}
    ${
      paymentUrl
        ? ""
        : formatInvoicePaymentGuidanceHtml({
            company: input.company,
            dueDate: input.dueDate,
            balanceDue: input.balanceDue,
            timeZone: input.timeZone,
            hasReplyTo: deliveryOptions.hasReplyTo,
          })
    }
    ${formatBillingSignatureBlockHtml("invoice", signatureEmailInput)}
    ${formatBillingEmailCompanyContactHtml(input.company)}
    ${footer.html}
    ${paymentUrl ? formatBillingEmailSecureLinkFallbackHtml(paymentUrl) : ""}
  `.trim();

  return sendViaResend({
    to: input.to,
    subject,
    text,
    html: wrapBillingEmailHtml(htmlBody),
    logContext: "sendInvoiceEmail",
    fromDisplayName: deliveryOptions.fromDisplayName,
    replyTo: deliveryOptions.replyTo,
  });
}

type SendInvoicePaymentLinkEmailInput = {
  to: string;
  company: BillingEmailCompanyInput;
  customerName: string;
  invoiceNumber: string;
  balanceDue: number;
  paymentUrl: string;
};

export async function sendInvoicePaymentLinkEmail(
  input: SendInvoicePaymentLinkEmailInput,
): Promise<SendBillingEmailResult> {
  const companyName = input.company.name;
  const subject = `Pay invoice ${input.invoiceNumber} from ${companyName}`;
  const paymentUrl = input.paymentUrl.trim();
  const companyContactText = formatBillingEmailCompanyContactText(input.company);
  const deliveryOptions = buildBillingEmailDeliveryOptions(input.company);
  const footer = formatBillingEmailFooter(
    companyName,
    deliveryOptions.hasReplyTo,
  );
  const paymentCtaText = formatInvoicePaymentCtaText({
    paymentUrl,
    balanceDue: input.balanceDue,
  });
  const paymentCtaHtml = formatInvoicePaymentCtaHtml({
    paymentUrl,
    balanceDue: input.balanceDue,
  });

  const text = [
    `Hello ${input.customerName},`,
    "",
    `${companyName} sent you a secure payment link for invoice ${input.invoiceNumber}.`,
    "You can pay securely online using this link.",
    "",
    `Amount due: ${formatCurrency(input.balanceDue)}`,
    paymentCtaText,
    companyContactText ? `\n${companyContactText}` : null,
    "",
    footer.text,
  ]
    .filter(Boolean)
    .join("\n");

  const htmlBody = `
    ${formatBillingEmailCompanyHeaderHtml(input.company)}
    ${formatBillingEmailDocumentMetaHtml({
      documentKind: "invoice",
      documentNumber: input.invoiceNumber,
      customerName: input.customerName,
    })}
    ${formatBillingEmailGreetingHtml(
      input.customerName,
      "here is a secure link to pay your invoice online.",
    )}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:12px;">
      <tr>
        <td style="padding:10px 12px;border:1px solid #e4e4e7;background:#fafafa;color:#3f3f46;font-size:13px;line-height:1.5;">
          You can pay securely online using this link.
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:12px;border:1px solid #e4e4e7;background:#fafafa;">
      <tr>
        <td style="padding:12px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td style="padding:0;color:#71717a;font-size:12px;line-height:1.4;">Amount due</td>
              <td align="right" style="padding:0;color:#18181b;font-size:20px;font-weight:700;line-height:1.2;white-space:nowrap;">
                ${escapeBillingEmailHtml(formatCurrency(input.balanceDue))}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${paymentCtaHtml}
    ${formatBillingEmailCompanyContactHtml(input.company)}
    ${footer.html}
    ${formatBillingEmailSecureLinkFallbackHtml(paymentUrl)}
  `.trim();

  return sendViaResend({
    to: input.to,
    subject,
    text,
    html: wrapBillingEmailHtml(htmlBody),
    logContext: "sendInvoicePaymentLinkEmail",
    fromDisplayName: deliveryOptions.fromDisplayName,
    replyTo: deliveryOptions.replyTo,
  });
}
