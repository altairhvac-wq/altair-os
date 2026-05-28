import { sendViaResend, type ResendSendResult } from "@/lib/email/resend";
import { formatCurrency, formatDate } from "@/shared/types/customer";

export type SendBillingEmailResult = ResendSendResult;

export type BillingEmailDeliveryStatus =
  | "sent"
  | "not_configured"
  | "failed";

export type BillingEmailDelivery = {
  status: BillingEmailDeliveryStatus;
  message?: string;
  missingEnv?: string[];
};

export function toBillingEmailDelivery(
  emailResult: SendBillingEmailResult,
): BillingEmailDelivery {
  if (emailResult.ok) {
    return { status: "sent" };
  }

  if (emailResult.reason === "not_configured") {
    return {
      status: "not_configured",
      message: emailResult.message,
      missingEnv: emailResult.missingEnv,
    };
  }

  return {
    status: "failed",
    message: emailResult.message,
  };
}

type BillingLineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

type SendEstimateEmailInput = {
  to: string;
  companyName: string;
  customerName: string;
  estimateNumber: string;
  total: number;
  validUntil?: string;
  timeZone?: string;
  lineItems: BillingLineItem[];
  notes?: string;
};

type SendInvoiceEmailInput = {
  to: string;
  companyName: string;
  customerName: string;
  invoiceNumber: string;
  amountDue: number;
  dueDate: string;
  timeZone?: string;
  lineItems: BillingLineItem[];
  notes?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatLineItemsText(lineItems: BillingLineItem[]): string {
  return lineItems
    .map(
      (item) =>
        `- ${item.name} (${item.quantity} × ${formatCurrency(item.unitPrice)})`,
    )
    .join("\n");
}

function formatLineItemsHtml(lineItems: BillingLineItem[]): string {
  const rows = lineItems
    .map(
      (item) =>
        `<li>${escapeHtml(item.name)} — ${item.quantity} × ${escapeHtml(formatCurrency(item.unitPrice))}</li>`,
    )
    .join("");

  return `<ul>${rows}</ul>`;
}

export async function sendEstimateEmail(
  input: SendEstimateEmailInput,
): Promise<SendBillingEmailResult> {
  const subject = `Estimate ${input.estimateNumber} from ${input.companyName}`;
  const validUntilLine = input.validUntil
    ? `Valid until: ${formatDate(input.validUntil, input.timeZone)}`
    : null;
  const notesLine = input.notes?.trim()
    ? `Notes:\n${input.notes.trim()}`
    : null;

  const text = [
    `Hello ${input.customerName},`,
    "",
    `${input.companyName} sent you estimate ${input.estimateNumber}.`,
    "",
    `Total: ${formatCurrency(input.total)}`,
    validUntilLine,
    "",
    "Line items:",
    formatLineItemsText(input.lineItems),
    notesLine,
    "",
    "Reply to this email or contact us if you have questions.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>Hello ${escapeHtml(input.customerName)},</p>
    <p><strong>${escapeHtml(input.companyName)}</strong> sent you estimate <strong>${escapeHtml(input.estimateNumber)}</strong>.</p>
    <p>Total: <strong>${escapeHtml(formatCurrency(input.total))}</strong></p>
    ${validUntilLine ? `<p>${escapeHtml(validUntilLine)}</p>` : ""}
    <p>Line items:</p>
    ${formatLineItemsHtml(input.lineItems)}
    ${notesLine ? `<p><strong>Notes</strong><br />${escapeHtml(input.notes!.trim()).replaceAll("\n", "<br />")}</p>` : ""}
    <p>Reply to this email or contact us if you have questions.</p>
  `.trim();

  return sendViaResend({
    to: input.to,
    subject,
    text,
    html,
    logContext: "sendEstimateEmail",
  });
}

export async function sendInvoiceEmail(
  input: SendInvoiceEmailInput,
): Promise<SendBillingEmailResult> {
  const subject = `Invoice ${input.invoiceNumber} from ${input.companyName}`;
  const notesLine = input.notes?.trim()
    ? `Notes:\n${input.notes.trim()}`
    : null;

  const text = [
    `Hello ${input.customerName},`,
    "",
    `${input.companyName} sent you invoice ${input.invoiceNumber}.`,
    "",
    `Amount due: ${formatCurrency(input.amountDue)}`,
    `Due date: ${formatDate(input.dueDate, input.timeZone)}`,
    "",
    "Line items:",
    formatLineItemsText(input.lineItems),
    notesLine,
    "",
    "Reply to this email or contact us if you have questions.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>Hello ${escapeHtml(input.customerName)},</p>
    <p><strong>${escapeHtml(input.companyName)}</strong> sent you invoice <strong>${escapeHtml(input.invoiceNumber)}</strong>.</p>
    <p>Amount due: <strong>${escapeHtml(formatCurrency(input.amountDue))}</strong></p>
    <p>Due date: ${escapeHtml(formatDate(input.dueDate, input.timeZone))}</p>
    <p>Line items:</p>
    ${formatLineItemsHtml(input.lineItems)}
    ${notesLine ? `<p><strong>Notes</strong><br />${escapeHtml(input.notes!.trim()).replaceAll("\n", "<br />")}</p>` : ""}
    <p>Reply to this email or contact us if you have questions.</p>
  `.trim();

  return sendViaResend({
    to: input.to,
    subject,
    text,
    html,
    logContext: "sendInvoiceEmail",
  });
}
