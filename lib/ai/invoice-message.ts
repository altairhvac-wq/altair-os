import "server-only";

import {
  INVOICE_MESSAGE_CONTEXT_MAX_CHARS,
  INVOICE_MESSAGE_FIELD_MAX_CHARS,
  INVOICE_MESSAGE_LINE_ITEMS_LIMIT,
  trimAiContextText,
  trimAiText,
} from "@/lib/ai/limits";
import type { GenerateDraftTextRequest } from "@/lib/ai/types";
import { formatInvoiceStatus } from "@/shared/types/invoice";
import type { InvoiceMessageDraftInput } from "@/shared/types/invoice-ai";

export const INVOICE_MESSAGE_AI_FEATURE = "invoice-message";

export const INSUFFICIENT_INVOICE_MESSAGE_CONTEXT_MESSAGE =
  "There is not enough invoice information to draft a message yet.";

const INVOICE_MESSAGE_PROMPT = `You draft short, customer-facing payment or invoice messages for a field service company (HVAC, electrical, plumbing, or general trades).

Your job is to produce ONE polite message the office can copy into email or SMS after human review. The message must match the invoice payment situation described in the context.

Output requirements:
- Plain text only — no markdown, bullets, headings, or subject line
- 2–4 concise sentences
- Start with a brief greeting using the customer name when provided (e.g. "Hi {{name}},")
- Mention the invoice number when provided
- Mention recent service or job context only when provided in context
- Tone: professional, friendly, and respectful — never threatening or collections-oriented

Situation guidance (use invoice status and balances from context):
- Draft / not yet sent: gentle note that the invoice is ready for review when appropriate
- Sent with open balance: friendly payment reminder
- Overdue with open balance: polite follow-up (not a demand or legal threat)
- Partially paid: acknowledge payment received and note remaining balance if provided
- Paid: brief thank-you for payment
- Void / cancelled: do not ask for payment; keep neutral or omit payment language

Rules:
- Use only facts from the context below — do not invent amounts, due dates, payment links, URLs, or payment methods
- If balance or amounts are marked "not available", do not state dollar figures
- If payment link eligibility is "yes", you may say the customer can pay using the link from their invoice email — never invent or paste a URL
- If company phone or email is provided, you may invite the customer to contact the office that way — do not invent contact details
- Do not mention AI, automation, or internal systems
- Do not use collections, legal, lien, or guarantee language
- Do not expose internal technician notes or office-only commentary unless labeled as invoice notes and clearly customer-facing
- Do not promise outcomes, refunds, or timelines not in context

Examples (adapt to actual context; do not copy verbatim if facts differ):

Unpaid:
"Hi {{customerName}}, this is a friendly reminder that invoice {{invoiceNumber}} for your recent service is ready for payment. Please review the invoice when you have a chance, and contact us if you have any questions. Thank you for choosing us."

Overdue:
"Hi {{customerName}}, we wanted to follow up on invoice {{invoiceNumber}}, which still shows an open balance. Please review it when you have a chance, and let us know if you have any questions or need help with payment."

Paid:
"Hi {{customerName}}, thank you for your payment on invoice {{invoiceNumber}}. We appreciate your business and are glad we could help with your service needs."`;

function hasIdentifiableInvoice(input: InvoiceMessageDraftInput): boolean {
  return Boolean(
    input.invoiceNumber?.trim() && input.customerName?.trim(),
  );
}

export function hasUsefulInvoiceMessageContext(
  input: InvoiceMessageDraftInput,
): boolean {
  return hasIdentifiableInvoice(input);
}

function formatBillingAmounts(input: InvoiceMessageDraftInput): string | null {
  if (!input.includeBillingAmounts) {
    return "Billing amounts: not available for this user";
  }

  const parts: string[] = [];

  if (typeof input.total === "number") {
    parts.push(`Invoice total: $${input.total.toFixed(2)}`);
  }

  if (typeof input.amountPaid === "number") {
    parts.push(`Amount paid: $${input.amountPaid.toFixed(2)}`);
  }

  if (typeof input.balanceDue === "number") {
    parts.push(`Balance due: $${input.balanceDue.toFixed(2)}`);
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

function trimField(value: string | undefined | null): string | undefined {
  const trimmed = trimAiText(value, INVOICE_MESSAGE_FIELD_MAX_CHARS);
  return trimmed || undefined;
}

function applyInvoiceMessageInputLimits(
  input: InvoiceMessageDraftInput,
): InvoiceMessageDraftInput {
  return {
    ...input,
    customerName: trimField(input.customerName) ?? input.customerName,
    invoiceNumber: trimField(input.invoiceNumber) ?? input.invoiceNumber,
    jobDescription: trimField(input.jobDescription) ?? input.jobDescription,
    jobType: trimField(input.jobType) ?? input.jobType,
    lineItemSummary: trimField(input.lineItemSummary) ?? input.lineItemSummary,
    invoiceNotes: trimField(input.invoiceNotes) ?? input.invoiceNotes,
  };
}

export function formatInvoiceMessageContext(
  input: InvoiceMessageDraftInput,
): string {
  const sections: string[] = [];

  sections.push(`Customer: ${input.customerName.trim()}`);
  sections.push(`Invoice number: ${input.invoiceNumber.trim()}`);
  sections.push(`Invoice status: ${formatInvoiceStatus(input.status)}`);

  if (input.issueDate?.trim()) {
    sections.push(`Issue date: ${input.issueDate.trim()}`);
  }

  if (input.dueDate?.trim()) {
    sections.push(`Due date: ${input.dueDate.trim()}`);
  }

  const billingAmounts = formatBillingAmounts(input);
  if (billingAmounts) {
    sections.push(billingAmounts);
  }

  if (input.jobNumber?.trim()) {
    sections.push(`Job number: ${input.jobNumber.trim()}`);
  }

  if (input.jobType?.trim()) {
    sections.push(`Job type: ${input.jobType.trim()}`);
  }

  if (input.jobDescription?.trim()) {
    sections.push(`Service context:\n${input.jobDescription.trim()}`);
  }

  if (input.lineItemSummary?.trim()) {
    sections.push(`Line items (summary):\n${input.lineItemSummary.trim()}`);
  }

  if (input.invoiceNotes?.trim()) {
    sections.push(
      `Invoice notes (use only if appropriate for the customer):\n${input.invoiceNotes.trim()}`,
    );
  }

  const contactParts: string[] = [];
  if (input.customerEmail?.trim()) {
    contactParts.push(`Customer email on file: ${input.customerEmail.trim()}`);
  }
  if (input.customerPhone?.trim()) {
    contactParts.push(`Customer phone on file: ${input.customerPhone.trim()}`);
  }
  if (contactParts.length > 0) {
    sections.push(contactParts.join("\n"));
  }

  const companyParts: string[] = [];
  if (input.companyName?.trim()) {
    companyParts.push(`Company: ${input.companyName.trim()}`);
  }
  if (input.companyPhone?.trim()) {
    companyParts.push(`Company phone: ${input.companyPhone.trim()}`);
  }
  if (input.companyEmail?.trim()) {
    companyParts.push(`Company email: ${input.companyEmail.trim()}`);
  }
  if (companyParts.length > 0) {
    sections.push(companyParts.join("\n"));
  }

  sections.push(
    `Online payment link available in product: ${input.paymentLinkEligible ? "yes" : "no"}`,
  );

  const context = sections.join("\n\n");
  return trimAiContextText(context, INVOICE_MESSAGE_CONTEXT_MAX_CHARS);
}

export type InvoiceMessageDraftPreparation =
  | { kind: "static"; draftText: string }
  | { kind: "request"; request: GenerateDraftTextRequest };

export function prepareInvoiceMessageDraft(
  input: InvoiceMessageDraftInput,
  companyId: string,
  userId: string,
): InvoiceMessageDraftPreparation {
  const limitedInput = applyInvoiceMessageInputLimits(input);

  if (!hasUsefulInvoiceMessageContext(limitedInput)) {
    return {
      kind: "static",
      draftText: INSUFFICIENT_INVOICE_MESSAGE_CONTEXT_MESSAGE,
    };
  }

  return {
    kind: "request",
    request: buildInvoiceMessageDraftRequest(limitedInput, companyId, userId),
  };
}

export function buildInvoiceMessageDraftRequest(
  input: InvoiceMessageDraftInput,
  companyId: string,
  userId: string,
): GenerateDraftTextRequest {
  return {
    feature: INVOICE_MESSAGE_AI_FEATURE,
    prompt: INVOICE_MESSAGE_PROMPT,
    inputText: formatInvoiceMessageContext(input),
    companyId,
    userId,
  };
}

export function formatInvoiceLineItemSummary(
  lineItems: { name: string; description?: string }[],
): string | null {
  const items = lineItems
    .filter((item) => item.name.trim().length > 0)
    .slice(0, INVOICE_MESSAGE_LINE_ITEMS_LIMIT);

  if (items.length === 0) {
    return null;
  }

  return items
    .map((item) => {
      const name = item.name.trim();
      const description = item.description?.trim();
      return description ? `- ${name}: ${description}` : `- ${name}`;
    })
    .join("\n");
}
