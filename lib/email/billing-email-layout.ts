import {
  formatBillingCompanyAddressLines,
  formatBillingCompanyContactLines,
  type BillingCompanyContact,
} from "@/shared/lib/billing-company-contact";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import {
  calculateLineItemTotal,
  formatTaxRate,
} from "@/shared/types/estimate";

export type BillingEmailLineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export type BillingEmailDocumentKind = "estimate" | "invoice";

export function escapeBillingEmailHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function formatBillingEmailMultilineText(value: string): string {
  return value.trim();
}

export function formatBillingEmailMultilineHtml(value: string): string {
  return escapeBillingEmailHtml(value.trim()).replaceAll("\n", "<br />");
}

export function wrapBillingEmailHtml(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Altair OS</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
      <tr>
        <td align="center" style="padding:20px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:16px;">
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

export function formatBillingEmailCompanyHeaderHtml(
  company: Pick<BillingCompanyContact, "name" | "phone" | "email" | "addressLine1" | "addressLine2" | "city" | "state" | "postalCode">,
): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td style="padding:0 0 12px;color:#18181b;font-size:18px;font-weight:700;line-height:1.3;">
          ${escapeBillingEmailHtml(company.name)}
        </td>
      </tr>
    </table>
  `.trim();
}

export function formatBillingEmailDocumentMetaHtml(input: {
  documentKind: BillingEmailDocumentKind;
  documentNumber: string;
  customerName: string;
}): string {
  const documentLabel = input.documentKind === "estimate" ? "Estimate" : "Invoice";
  const preparedLabel =
    input.documentKind === "estimate" ? "For" : "Bill to";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:12px;">
      <tr>
        <td style="padding:0;color:#71717a;font-size:12px;line-height:1.4;text-transform:uppercase;letter-spacing:0.04em;">
          ${documentLabel}
        </td>
      </tr>
      <tr>
        <td style="padding:2px 0 0;color:#18181b;font-size:16px;font-weight:700;line-height:1.3;">
          ${escapeBillingEmailHtml(input.documentNumber)}
        </td>
      </tr>
      <tr>
        <td style="padding:4px 0 0;color:#52525b;font-size:14px;line-height:1.4;">
          ${escapeBillingEmailHtml(preparedLabel)} ${escapeBillingEmailHtml(input.customerName)}
        </td>
      </tr>
    </table>
  `.trim();
}

export function formatBillingEmailGreetingHtml(
  customerName: string,
  intro: string,
): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:12px;">
      <tr>
        <td style="padding:0;color:#3f3f46;font-size:14px;line-height:1.5;">
          Hello ${escapeBillingEmailHtml(customerName)}, ${escapeBillingEmailHtml(intro)}
        </td>
      </tr>
    </table>
  `.trim();
}

export function formatEstimateTotalHeroHtml(input: {
  total: number;
  issuedDate: string;
  validUntil?: string;
  timeZone?: string;
}): string {
  const metaLines: string[] = [
    `Issued ${formatDate(input.issuedDate, input.timeZone)}`,
  ];

  if (input.validUntil) {
    metaLines.push(`Valid until ${formatDate(input.validUntil, input.timeZone)}`);
  }

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:12px;border:1px solid #e4e4e7;background:#fafafa;">
      <tr>
        <td style="padding:12px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td style="padding:0;color:#71717a;font-size:12px;line-height:1.4;">Estimated total</td>
              <td align="right" style="padding:0;color:#18181b;font-size:20px;font-weight:700;line-height:1.2;white-space:nowrap;">
                ${escapeBillingEmailHtml(formatCurrency(input.total))}
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding:6px 0 0;color:#71717a;font-size:12px;line-height:1.45;">
                ${escapeBillingEmailHtml(metaLines.join(" · "))}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `.trim();
}

export function formatInvoiceAmountDueHeroHtml(input: {
  balanceDue: number;
  total: number;
  amountPaid: number;
  issuedDate: string;
  dueDate: string;
  timeZone?: string;
}): string {
  const isPaidInFull = input.balanceDue <= 0;
  const heroLabel = isPaidInFull ? "Status" : "Amount due";
  const heroValue = isPaidInFull
    ? "Paid in full"
    : formatCurrency(input.balanceDue);

  const metaLines: string[] = [
    `Issued ${formatDate(input.issuedDate, input.timeZone)}`,
  ];

  if (!isPaidInFull) {
    metaLines.push(`Due ${formatDate(input.dueDate, input.timeZone)}`);
  }

  const breakdownRows: string[] = [];

  if (input.amountPaid > 0) {
    breakdownRows.push(`
      <tr>
        <td style="padding:4px 0 0;color:#71717a;font-size:12px;line-height:1.4;">Invoice total</td>
        <td align="right" style="padding:4px 0 0;color:#52525b;font-size:12px;line-height:1.4;white-space:nowrap;">
          ${escapeBillingEmailHtml(formatCurrency(input.total))}
        </td>
      </tr>
      <tr>
        <td style="padding:2px 0 0;color:#71717a;font-size:12px;line-height:1.4;">Amount paid</td>
        <td align="right" style="padding:2px 0 0;color:#52525b;font-size:12px;line-height:1.4;white-space:nowrap;">
          ${escapeBillingEmailHtml(formatCurrency(input.amountPaid))}
        </td>
      </tr>
    `.trim());
  }

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:12px;border:1px solid #e4e4e7;background:#fafafa;">
      <tr>
        <td style="padding:12px 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td style="padding:0;color:#71717a;font-size:12px;line-height:1.4;">${escapeBillingEmailHtml(heroLabel)}</td>
              <td align="right" style="padding:0;color:#18181b;font-size:20px;font-weight:700;line-height:1.2;white-space:nowrap;">
                ${escapeBillingEmailHtml(heroValue)}
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding:6px 0 0;color:#71717a;font-size:12px;line-height:1.45;">
                ${escapeBillingEmailHtml(metaLines.join(" · "))}
              </td>
            </tr>
            ${breakdownRows.join("")}
          </table>
        </td>
      </tr>
    </table>
  `.trim();
}

export function formatEstimateApprovalCtaHtml(approvalUrl: string): string {
  const safeUrl = escapeBillingEmailHtml(approvalUrl);

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
      <tr>
        <td align="center" style="padding:0;">
          <a href="${safeUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:6px;">
            Review &amp; Sign Estimate
          </a>
        </td>
      </tr>
    </table>
  `.trim();
}

export function formatEstimateApprovalCtaText(approvalUrl: string): string {
  return [
    "",
    "Review and sign online:",
    approvalUrl,
  ].join("\n");
}

export function formatInvoicePaymentCtaHtml(input: {
  paymentUrl: string;
  balanceDue: number;
}): string {
  const safeUrl = escapeBillingEmailHtml(input.paymentUrl);
  const isPaidInFull = input.balanceDue <= 0;
  const buttonLabel = isPaidInFull ? "View Invoice" : "View &amp; Pay Invoice";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
      <tr>
        <td align="center" style="padding:0;">
          <a href="${safeUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:6px;">
            ${buttonLabel}
          </a>
        </td>
      </tr>
    </table>
  `.trim();
}

export function formatInvoicePaymentCtaText(input: {
  paymentUrl: string;
  balanceDue: number;
}): string {
  const label =
    input.balanceDue <= 0 ? "View invoice online:" : "View and pay online:";

  return ["", label, input.paymentUrl].join("\n");
}

export function formatBillingEmailSecureLinkFallbackHtml(
  secureUrl: string,
): string {
  const safeUrl = escapeBillingEmailHtml(secureUrl);

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">
      <tr>
        <td align="center" style="padding:0;color:#a1a1aa;font-size:10px;line-height:1.45;word-break:break-all;">
          If the button above does not work, copy and paste this link:<br />
          <a href="${safeUrl}" style="color:#71717a;text-decoration:underline;">${safeUrl}</a>
        </td>
      </tr>
    </table>
  `.trim();
}

export function formatInvoicePaymentGuidanceHtml(input: {
  company: Pick<BillingCompanyContact, "name" | "phone" | "email">;
  dueDate: string;
  balanceDue: number;
  timeZone?: string;
  hasReplyTo: boolean;
}): string {
  const phone = input.company.phone?.trim();
  const email = input.company.email?.trim();
  const isPaidInFull = input.balanceDue <= 0;

  if (isPaidInFull) {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">
        <tr>
          <td style="padding:10px 12px;border:1px solid #e4e4e7;background:#fafafa;color:#3f3f46;font-size:13px;line-height:1.5;">
            This invoice is paid in full. Retain it for your records.
          </td>
        </tr>
      </table>
    `.trim();
  }

  const contactParts: string[] = [];

  if (phone) {
    contactParts.push(
      `call ${escapeBillingEmailHtml(phone)}`,
    );
  }

  if (email) {
    contactParts.push(
      `email ${escapeBillingEmailHtml(email)}`,
    );
  }

  const contactSentence =
    contactParts.length > 0
      ? `Please ${contactParts.join(" or ")} to arrange payment.`
      : input.hasReplyTo
        ? "Reply to this email to arrange payment or ask questions."
        : `Contact ${escapeBillingEmailHtml(input.company.name)} to arrange payment.`;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">
      <tr>
        <td style="padding:10px 12px;border:1px solid #e4e4e7;background:#fafafa;color:#3f3f46;font-size:13px;line-height:1.5;">
          ${contactSentence}
          Payment of ${escapeBillingEmailHtml(formatCurrency(input.balanceDue))}
          is due by ${escapeBillingEmailHtml(formatDate(input.dueDate, input.timeZone))}.
        </td>
      </tr>
    </table>
  `.trim();
}

export function formatInvoicePaymentGuidanceText(input: {
  company: Pick<BillingCompanyContact, "name" | "phone" | "email">;
  dueDate: string;
  balanceDue: number;
  timeZone?: string;
  hasReplyTo: boolean;
}): string | null {
  const phone = input.company.phone?.trim();
  const email = input.company.email?.trim();
  const isPaidInFull = input.balanceDue <= 0;

  if (isPaidInFull) {
    return "This invoice is paid in full. Retain it for your records.";
  }

  const contactParts: string[] = [];

  if (phone) {
    contactParts.push(`call ${phone}`);
  }

  if (email) {
    contactParts.push(`email ${email}`);
  }

  const contactSentence =
    contactParts.length > 0
      ? `Please ${contactParts.join(" or ")} to arrange payment.`
      : input.hasReplyTo
        ? "Reply to this email to arrange payment or ask questions."
        : `Contact ${input.company.name} to arrange payment.`;

  return [
    "How to pay",
    contactSentence,
    `Payment of ${formatCurrency(input.balanceDue)} is due by ${formatDate(input.dueDate, input.timeZone)}.`,
  ].join("\n");
}

export function formatBillingEmailLineItemsText(
  lineItems: BillingEmailLineItem[],
): string {
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

export function formatBillingEmailLineItemsHtml(
  lineItems: BillingEmailLineItem[],
): string {
  if (lineItems.length === 0) {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">
        <tr>
          <td style="padding:0;color:#71717a;font-size:13px;line-height:1.4;">No line items.</td>
        </tr>
      </table>
    `.trim();
  }

  const rows = lineItems
    .map((item) => {
      const lineTotal = calculateLineItemTotal(item.quantity, item.unitPrice);
      const qtyRate = `${item.quantity} × ${formatCurrency(item.unitPrice)}`;

      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e4e4e7;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:0;color:#18181b;font-size:14px;line-height:1.4;font-weight:600;">
                  ${escapeBillingEmailHtml(item.name)}
                </td>
                <td align="right" valign="top" style="padding:0 0 0 12px;color:#18181b;font-size:14px;line-height:1.4;font-weight:600;white-space:nowrap;">
                  ${escapeBillingEmailHtml(formatCurrency(lineTotal))}
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding:2px 0 0;color:#71717a;font-size:12px;line-height:1.4;">
                  ${escapeBillingEmailHtml(qtyRate)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `.trim();
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">
      <tr>
        <td style="padding:0 0 6px;color:#71717a;font-size:12px;line-height:1.4;text-transform:uppercase;letter-spacing:0.04em;">
          Line items
        </td>
      </tr>
      <tr>
        <td style="padding:0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tbody>${rows}</tbody>
          </table>
        </td>
      </tr>
    </table>
  `.trim();
}

export function formatBillingEmailTotalsText(input: {
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

export function formatBillingEmailTotalsHtml(input: {
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
      "padding:2px 0;color:#71717a;font-size:13px;line-height:1.4;text-align:left;";
    const valueStyle = [
      "padding:2px 0;color:#18181b;font-size:13px;line-height:1.4;text-align:right;white-space:nowrap;",
      options?.strong ? "font-weight:700;" : "",
      options?.highlight ? "font-size:15px;font-weight:700;" : "",
    ].join("");

    return `
      <tr>
        <td style="${labelStyle}">${escapeBillingEmailHtml(label)}</td>
        <td style="${valueStyle}">${escapeBillingEmailHtml(value)}</td>
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
    rows.push(
      row("Balance due", formatCurrency(input.balanceDue), { highlight: true }),
    );
  }

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">
      <tr>
        <td align="right" style="padding:0;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;min-width:220px;">
            <tbody>${rows.join("")}</tbody>
          </table>
        </td>
      </tr>
    </table>
  `.trim();
}

export function formatBillingEmailCompanyContactText(
  company: Pick<BillingCompanyContact, "name" | "phone" | "email" | "addressLine1" | "addressLine2" | "city" | "state" | "postalCode">,
): string | null {
  const addressLines = formatBillingCompanyAddressLines(company);
  const contactLines = formatBillingCompanyContactLines(company);
  const lines = [
    ...addressLines,
    ...contactLines.filter((line) => !addressLines.includes(line)),
  ];

  return lines.length > 0 ? [`${company.name}`, ...lines].join("\n") : null;
}

export function formatBillingEmailCompanyContactHtml(
  company: Pick<BillingCompanyContact, "name" | "phone" | "email" | "addressLine1" | "addressLine2" | "city" | "state" | "postalCode">,
): string {
  const addressLines = formatBillingCompanyAddressLines(company);
  const contactLines = formatBillingCompanyContactLines(company);
  const lines = [
    ...addressLines,
    ...contactLines.filter((line) => !addressLines.includes(line)),
  ];

  if (lines.length === 0) {
    return "";
  }

  const body = lines
    .map(
      (line) =>
        `<tr><td style="padding:0;color:#71717a;font-size:12px;line-height:1.5;">${escapeBillingEmailHtml(line)}</td></tr>`,
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:16px;padding-top:12px;border-top:1px solid #e4e4e7;">
      <tr>
        <td style="padding:12px 0 6px;color:#71717a;font-size:12px;line-height:1.4;text-transform:uppercase;letter-spacing:0.04em;">
          Questions?
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 4px;color:#18181b;font-size:13px;font-weight:600;line-height:1.4;">
          ${escapeBillingEmailHtml(company.name)}
        </td>
      </tr>
      ${body}
    </table>
  `.trim();
}

export function formatBillingEmailFooter(
  companyName: string,
  hasReplyTo: boolean,
): { text: string; html: string } {
  const text = hasReplyTo
    ? `Reply to this email to reach ${companyName}.`
    : `Contact ${companyName} using the information above.`;

  const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">
      <tr>
        <td style="padding:0;color:#a1a1aa;font-size:11px;line-height:1.45;">
          ${escapeBillingEmailHtml(text)}
        </td>
      </tr>
    </table>
  `.trim();

  return { text, html };
}

export function formatBillingEmailNotesHtml(notesText: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">
      <tr>
        <td style="padding:0 0 4px;color:#71717a;font-size:12px;line-height:1.4;text-transform:uppercase;letter-spacing:0.04em;">
          Notes
        </td>
      </tr>
      <tr>
        <td style="padding:0;color:#3f3f46;font-size:13px;line-height:1.5;">
          ${formatBillingEmailMultilineHtml(notesText)}
        </td>
      </tr>
    </table>
  `.trim();
}
