import { sendViaResend, type ResendSendResult } from "@/lib/email/resend";
import {
  formatBillingCompanyContactLines,
  getBillingCompanyReplyTo,
  type BillingCompanyContact,
} from "@/shared/lib/billing-company-contact";
import {
  formatBillingSignatureBlockHtml,
  formatBillingSignatureBlockText,
} from "@/shared/lib/billing-signature-block";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import {
  calculateLineItemTotal,
  formatTaxRate,
} from "@/shared/types/estimate";

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

type BillingEmailCompanyInput = Pick<
  BillingCompanyContact,
  "name" | "phone" | "email" | "city" | "state"
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
  lineItems: BillingLineItem[];
  notes?: string;
  approvalUrl?: string;
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

function formatMultilineText(value: string): string {
  return value.trim();
}

function formatMultilineHtml(value: string): string {
  return escapeHtml(value.trim()).replaceAll("\n", "<br />");
}

function buildBillingEmailFooter(
  companyName: string,
  hasReplyTo: boolean,
): { text: string; html: string } {
  const text = hasReplyTo
    ? `Reply to this email to reach ${companyName}.`
    : `Contact ${companyName} using the information above.`;

  const html = `<p style="margin:24px 0 0;color:#52525b;font-size:13px;line-height:1.5;">${escapeHtml(text)}</p>`;

  return { text, html };
}

function formatLineItemsText(lineItems: BillingLineItem[]): string {
  if (lineItems.length === 0) {
    return "No line items.";
  }

  return lineItems
    .map((item) => {
      const lineTotal = calculateLineItemTotal(item.quantity, item.unitPrice);
      return `- ${item.name} · ${item.quantity} × ${formatCurrency(item.unitPrice)} = ${formatCurrency(lineTotal)}`;
    })
    .join("\n");
}

function formatLineItemsHtml(lineItems: BillingLineItem[]): string {
  if (lineItems.length === 0) {
    return `<p style="margin:0;color:#52525b;font-size:14px;">No line items.</p>`;
  }

  const rows = lineItems
    .map((item) => {
      const lineTotal = calculateLineItemTotal(item.quantity, item.unitPrice);

      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;color:#18181b;font-size:14px;line-height:1.4;">${escapeHtml(item.name)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e4e4e7;color:#52525b;font-size:14px;text-align:center;white-space:nowrap;">${item.quantity}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e4e4e7;color:#52525b;font-size:14px;text-align:right;white-space:nowrap;">${escapeHtml(formatCurrency(item.unitPrice))}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;color:#18181b;font-size:14px;font-weight:600;text-align:right;white-space:nowrap;">${escapeHtml(formatCurrency(lineTotal))}</td>
        </tr>
      `.trim();
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:16px;border:1px solid #e4e4e7;">
      <thead>
        <tr style="background:#fafafa;">
          <th align="left" style="padding:10px 12px;border-bottom:1px solid #e4e4e7;color:#52525b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Item</th>
          <th align="center" style="padding:10px 8px;border-bottom:1px solid #e4e4e7;color:#52525b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Qty</th>
          <th align="right" style="padding:10px 8px;border-bottom:1px solid #e4e4e7;color:#52525b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Rate</th>
          <th align="right" style="padding:10px 12px;border-bottom:1px solid #e4e4e7;color:#52525b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `.trim();
}

function formatTotalsText(input: {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid?: number;
  balanceDue?: number;
}): string {
  const lines = [`Subtotal: ${formatCurrency(input.subtotal)}`];

  if (input.taxRate > 0 || input.taxAmount > 0) {
    lines.push(
      `Tax${input.taxRate > 0 ? ` (${formatTaxRate(input.taxRate)}%)` : ""}: ${formatCurrency(input.taxAmount)}`,
    );
  }

  lines.push(`Total: ${formatCurrency(input.total)}`);

  if (typeof input.amountPaid === "number" && input.amountPaid > 0) {
    lines.push(`Amount paid: ${formatCurrency(input.amountPaid)}`);
  }

  if (typeof input.balanceDue === "number" && input.balanceDue > 0) {
    lines.push(`Balance due: ${formatCurrency(input.balanceDue)}`);
  }

  return lines.join("\n");
}

function formatTotalsHtml(input: {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid?: number;
  balanceDue?: number;
  highlightBalance?: boolean;
}): string {
  const row = (
    label: string,
    value: string,
    options?: { strong?: boolean; highlight?: boolean },
  ) => {
    const labelStyle =
      "padding:4px 0;color:#52525b;font-size:14px;text-align:left;";
    const valueStyle = [
      "padding:4px 0;color:#18181b;font-size:14px;text-align:right;white-space:nowrap;",
      options?.strong ? "font-weight:700;" : "",
      options?.highlight ? "font-size:16px;font-weight:700;" : "",
    ].join("");

    return `
      <tr>
        <td style="${labelStyle}">${escapeHtml(label)}</td>
        <td style="${valueStyle}">${escapeHtml(value)}</td>
      </tr>
    `.trim();
  };

  const rows = [row("Subtotal", formatCurrency(input.subtotal))];

  if (input.taxRate > 0 || input.taxAmount > 0) {
    rows.push(
      row(
        `Tax${input.taxRate > 0 ? ` (${formatTaxRate(input.taxRate)}%)` : ""}`,
        formatCurrency(input.taxAmount),
      ),
    );
  }

  rows.push(row("Total", formatCurrency(input.total), { strong: true }));

  if (typeof input.amountPaid === "number" && input.amountPaid > 0) {
    rows.push(row("Amount paid", formatCurrency(input.amountPaid)));
  }

  if (
    typeof input.balanceDue === "number" &&
    input.balanceDue > 0 &&
    input.highlightBalance
  ) {
    rows.push(row("Balance due", formatCurrency(input.balanceDue), { highlight: true }));
  }

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:16px;">
      <tbody>${rows.join("")}</tbody>
    </table>
  `.trim();
}

function formatCompanyContactText(
  company: BillingEmailCompanyInput,
): string | null {
  const lines = formatBillingCompanyContactLines(company);

  return lines.length > 0 ? lines.join("\n") : null;
}

function formatCompanyContactHtml(
  company: BillingEmailCompanyInput,
): string {
  const lines = formatBillingCompanyContactLines(company);

  if (lines.length === 0) {
    return "";
  }

  const body = lines
    .map(
      (line) =>
        `<div style="color:#52525b;font-size:13px;line-height:1.5;">${escapeHtml(line)}</div>`,
    )
    .join("");

  return `
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e4e4e7;">
      <div style="color:#71717a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">${escapeHtml(company.name)}</div>
      ${body}
    </div>
  `.trim();
}

function wrapBillingEmailHtml(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Altair OS</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
      <tr>
        <td align="center" style="padding:24px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:28px 24px;">
                ${content}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

function formatEstimateApprovalCtaText(approvalUrl: string): string {
  return [
    "",
    "Review and sign online:",
    approvalUrl,
  ].join("\n");
}

function formatEstimateApprovalCtaHtml(approvalUrl: string): string {
  const safeUrl = escapeHtml(approvalUrl);

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-collapse:collapse;">
      <tr>
        <td>
          <a href="${safeUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 22px;border-radius:8px;">
            Review &amp; Sign Estimate
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding-top:10px;color:#71717a;font-size:12px;line-height:1.5;">
          Secure link to review this estimate and approve with your signature.
        </td>
      </tr>
    </table>
  `.trim();
}

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
    ? formatMultilineText(input.notes)
    : null;
  const companyContactText = formatCompanyContactText(input.company);
  const deliveryOptions = buildBillingEmailDeliveryOptions(input.company);
  const footer = buildBillingEmailFooter(
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
  const totalsText = formatTotalsText({
    subtotal: input.subtotal,
    taxRate: input.taxRate,
    taxAmount: input.taxAmount,
    total: input.total,
  });

  const text = [
    `Hello ${input.customerName},`,
    "",
    `${companyName} sent you estimate ${input.estimateNumber}.`,
    approvalUrl
      ? "Use the secure link below to review and sign this estimate online."
      : null,
    "",
    `Issued: ${formatDate(input.issuedDate, input.timeZone)}`,
    validUntilLine,
    "",
    totalsText,
    "",
    "Line items:",
    formatLineItemsText(input.lineItems),
    notesText ? `\nNotes:\n${notesText}` : null,
    approvalCtaText,
    approvalUrl ? null : "",
    approvalUrl ? null : formatBillingSignatureBlockText("estimate"),
    companyContactText ? `\n${companyName}\n${companyContactText}` : null,
    "",
    footer.text,
  ]
    .filter(Boolean)
    .join("\n");

  const htmlBody = `
    <div style="margin-bottom:20px;">
      <div style="color:#71717a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Estimate</div>
      <div style="margin-top:6px;color:#18181b;font-size:24px;font-weight:700;line-height:1.2;">${escapeHtml(input.estimateNumber)}</div>
      <div style="margin-top:4px;color:#52525b;font-size:14px;">from ${escapeHtml(companyName)}</div>
    </div>
    <p style="margin:0 0 16px;color:#18181b;font-size:15px;line-height:1.5;">Hello ${escapeHtml(input.customerName)},</p>
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">${approvalUrl ? "Please review the estimate below, then use the secure button to sign and approve online." : `Please review the estimate details below. If you have questions, ${deliveryOptions.hasReplyTo ? "reply to this email" : "use the contact information below"}.`}</p>
    ${approvalCtaHtml}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fafafa;border:1px solid #e4e4e7;">
      <tr>
        <td style="padding:14px 16px;">
          <div style="color:#71717a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Estimate total</div>
          <div style="margin-top:4px;color:#18181b;font-size:22px;font-weight:700;">${escapeHtml(formatCurrency(input.total))}</div>
          <div style="margin-top:8px;color:#52525b;font-size:13px;line-height:1.5;">
            Issued ${escapeHtml(formatDate(input.issuedDate, input.timeZone))}
            ${validUntilLine ? `<br />${escapeHtml(validUntilLine)}` : ""}
          </div>
        </td>
      </tr>
    </table>
    ${formatLineItemsHtml(input.lineItems)}
    ${formatTotalsHtml({
      subtotal: input.subtotal,
      taxRate: input.taxRate,
      taxAmount: input.taxAmount,
      total: input.total,
    })}
    ${notesText ? `<div style="margin-top:20px;"><div style="color:#71717a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Notes</div><div style="color:#3f3f46;font-size:14px;line-height:1.6;">${formatMultilineHtml(notesText)}</div></div>` : ""}
    ${approvalUrl ? "" : formatBillingSignatureBlockHtml("estimate")}
    ${formatCompanyContactHtml(input.company)}
    ${footer.html}
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
    ? formatMultilineText(input.notes)
    : null;
  const companyContactText = formatCompanyContactText(input.company);
  const deliveryOptions = buildBillingEmailDeliveryOptions(input.company);
  const footer = buildBillingEmailFooter(
    companyName,
    deliveryOptions.hasReplyTo,
  );
  const totalsText = formatTotalsText({
    subtotal: input.subtotal,
    taxRate: input.taxRate,
    taxAmount: input.taxAmount,
    total: input.total,
    amountPaid: input.amountPaid,
    balanceDue: input.balanceDue,
  });

  const text = [
    `Hello ${input.customerName},`,
    "",
    `${companyName} sent you invoice ${input.invoiceNumber}.`,
    "",
    `Issued: ${formatDate(input.issuedDate, input.timeZone)}`,
    `Due date: ${formatDate(input.dueDate, input.timeZone)}`,
    "",
    totalsText,
    "",
    "Line items:",
    formatLineItemsText(input.lineItems),
    notesText ? `\nNotes:\n${notesText}` : null,
    "",
    formatBillingSignatureBlockText("invoice"),
    companyContactText ? `\n${companyName}\n${companyContactText}` : null,
    "",
    footer.text,
  ]
    .filter(Boolean)
    .join("\n");

  const htmlBody = `
    <div style="margin-bottom:20px;">
      <div style="color:#71717a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Invoice</div>
      <div style="margin-top:6px;color:#18181b;font-size:24px;font-weight:700;line-height:1.2;">${escapeHtml(input.invoiceNumber)}</div>
      <div style="margin-top:4px;color:#52525b;font-size:14px;">from ${escapeHtml(companyName)}</div>
    </div>
    <p style="margin:0 0 16px;color:#18181b;font-size:15px;line-height:1.5;">Hello ${escapeHtml(input.customerName)},</p>
    <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">Please find your invoice below. Payment is due by ${escapeHtml(formatDate(input.dueDate, input.timeZone))}.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#fafafa;border:1px solid #e4e4e7;">
      <tr>
        <td style="padding:14px 16px;">
          <div style="color:#71717a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Balance due</div>
          <div style="margin-top:4px;color:#18181b;font-size:22px;font-weight:700;">${escapeHtml(formatCurrency(input.balanceDue))}</div>
          <div style="margin-top:8px;color:#52525b;font-size:13px;line-height:1.5;">
            Issued ${escapeHtml(formatDate(input.issuedDate, input.timeZone))}
            <br />Due ${escapeHtml(formatDate(input.dueDate, input.timeZone))}
          </div>
        </td>
      </tr>
    </table>
    ${formatLineItemsHtml(input.lineItems)}
    ${formatTotalsHtml({
      subtotal: input.subtotal,
      taxRate: input.taxRate,
      taxAmount: input.taxAmount,
      total: input.total,
      amountPaid: input.amountPaid,
      balanceDue: input.balanceDue,
      highlightBalance: true,
    })}
    ${notesText ? `<div style="margin-top:20px;"><div style="color:#71717a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Notes</div><div style="color:#3f3f46;font-size:14px;line-height:1.6;">${formatMultilineHtml(notesText)}</div></div>` : ""}
    ${formatBillingSignatureBlockHtml("invoice")}
    ${formatCompanyContactHtml(input.company)}
    ${footer.html}
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
