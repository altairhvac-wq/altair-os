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

export function formatBillingEmailCompanyHeaderHtml(
  company: Pick<BillingCompanyContact, "name" | "phone" | "email" | "addressLine1" | "addressLine2" | "city" | "state" | "postalCode">,
): string {
  const contactLines = formatBillingCompanyContactLines(company);
  const addressLines = formatBillingCompanyAddressLines(company);
  const detailLines = [
    ...addressLines,
    ...contactLines.filter((line) => !addressLines.includes(line)),
  ];

  const detailsHtml =
    detailLines.length > 0
      ? detailLines
          .map(
            (line) =>
              `<div style="color:#52525b;font-size:13px;line-height:1.6;">${escapeBillingEmailHtml(line)}</div>`,
          )
          .join("")
      : "";

  return `
    <div style="padding-bottom:20px;border-bottom:2px solid #0f172a;margin-bottom:24px;">
      <div style="color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;">Service provider</div>
      <div style="margin-top:8px;padding-left:16px;border-left:4px solid #0f172a;">
        <div style="color:#0f172a;font-size:28px;font-weight:700;line-height:1.15;letter-spacing:-0.02em;">${escapeBillingEmailHtml(company.name)}</div>
        ${detailsHtml ? `<div style="margin-top:12px;">${detailsHtml}</div>` : ""}
      </div>
    </div>
  `.trim();
}

export function formatBillingEmailDocumentMetaHtml(input: {
  documentKind: BillingEmailDocumentKind;
  documentNumber: string;
  customerName: string;
}): string {
  const documentLabel = input.documentKind === "estimate" ? "Estimate" : "Invoice";
  const preparedLabel =
    input.documentKind === "estimate" ? "Prepared for" : "Bill to";

  return `
    <div style="margin-bottom:20px;">
      <div style="color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;">${documentLabel}</div>
      <div style="margin-top:6px;color:#0f172a;font-size:22px;font-weight:700;line-height:1.2;">${escapeBillingEmailHtml(input.documentNumber)}</div>
      <div style="margin-top:8px;color:#52525b;font-size:14px;line-height:1.5;">
        ${escapeBillingEmailHtml(preparedLabel)} <strong style="color:#18181b;">${escapeBillingEmailHtml(input.customerName)}</strong>
      </div>
    </div>
  `.trim();
}

export function formatBillingEmailGreetingHtml(
  customerName: string,
  intro: string,
): string {
  return `
    <p style="margin:0 0 12px;color:#18181b;font-size:15px;line-height:1.5;">Hello ${escapeBillingEmailHtml(customerName)},</p>
    <p style="margin:0 0 20px;color:#3f3f46;font-size:14px;line-height:1.65;">${intro}</p>
  `.trim();
}

export function formatEstimateTotalHeroHtml(input: {
  total: number;
  issuedDate: string;
  validUntil?: string;
  timeZone?: string;
}): string {
  const validUntilLine = input.validUntil
    ? `Valid until ${formatDate(input.validUntil, input.timeZone)}`
    : "Proposed investment for the described scope of work";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#0f172a;border:2px solid #0f172a;">
      <tr>
        <td style="padding:22px 20px;">
          <div style="color:#cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;">Estimated total</div>
          <div style="margin-top:8px;color:#ffffff;font-size:32px;font-weight:700;line-height:1.15;letter-spacing:-0.02em;">${escapeBillingEmailHtml(formatCurrency(input.total))}</div>
          <div style="margin-top:12px;color:#cbd5e1;font-size:13px;line-height:1.55;">
            Issued ${escapeBillingEmailHtml(formatDate(input.issuedDate, input.timeZone))}
            <br />${escapeBillingEmailHtml(validUntilLine)}
          </div>
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
  const hasPartialPayment = input.amountPaid > 0 && input.balanceDue > 0;
  const heroLabel = isPaidInFull ? "Payment status" : "Amount due";
  const heroValue = isPaidInFull
    ? "Paid in full"
    : formatCurrency(input.balanceDue);

  const paymentMeta = isPaidInFull
    ? `Issued ${formatDate(input.issuedDate, input.timeZone)}`
    : `Payment due by ${formatDate(input.dueDate, input.timeZone)}`;

  const breakdownRows: string[] = [];

  if (hasPartialPayment || (input.amountPaid > 0 && isPaidInFull)) {
    breakdownRows.push(`
      <tr>
        <td style="padding:8px 0 0;color:#94a3b8;font-size:13px;">Invoice total</td>
        <td align="right" style="padding:8px 0 0;color:#f8fafc;font-size:13px;font-weight:600;">${escapeBillingEmailHtml(formatCurrency(input.total))}</td>
      </tr>
    `.trim());

    if (input.amountPaid > 0) {
      breakdownRows.push(`
        <tr>
          <td style="padding:4px 0 0;color:#94a3b8;font-size:13px;">Amount paid</td>
          <td align="right" style="padding:4px 0 0;color:#86efac;font-size:13px;font-weight:600;">${escapeBillingEmailHtml(formatCurrency(input.amountPaid))}</td>
        </tr>
      `.trim());
    }
  }

  const breakdownHtml =
    breakdownRows.length > 0
      ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:16px;padding-top:16px;border-top:1px solid #334155;">
          <tbody>${breakdownRows.join("")}</tbody>
        </table>
      `.trim()
      : "";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#0f172a;border:2px solid #0f172a;">
      <tr>
        <td style="padding:22px 20px;">
          <div style="color:#cbd5e1;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;">${escapeBillingEmailHtml(heroLabel)}</div>
          <div style="margin-top:8px;color:#ffffff;font-size:32px;font-weight:700;line-height:1.15;letter-spacing:-0.02em;">${escapeBillingEmailHtml(heroValue)}</div>
          <div style="margin-top:12px;color:#cbd5e1;font-size:13px;line-height:1.55;">
            Issued ${escapeBillingEmailHtml(formatDate(input.issuedDate, input.timeZone))}
            <br />${escapeBillingEmailHtml(paymentMeta)}
          </div>
          ${breakdownHtml}
        </td>
      </tr>
    </table>
  `.trim();
}

export function formatEstimateApprovalCtaHtml(approvalUrl: string): string {
  const safeUrl = escapeBillingEmailHtml(approvalUrl);

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:0;">
          <a href="${safeUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 28px;border-radius:8px;">
            Review &amp; Sign Estimate
          </a>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:12px 0 0;color:#64748b;font-size:12px;line-height:1.55;">
          Secure link to review this estimate and approve with your signature.
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:8px 0 0;color:#71717a;font-size:11px;line-height:1.5;word-break:break-all;">
          ${safeUrl}
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
  const helperText = isPaidInFull
    ? "Secure link to view this paid invoice."
    : "Secure link to view this invoice and contact the office to pay.";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:0;">
          <a href="${safeUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 28px;border-radius:8px;">
            ${buttonLabel}
          </a>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:12px 0 0;color:#64748b;font-size:12px;line-height:1.55;">
          ${helperText}
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:8px 0 0;color:#71717a;font-size:11px;line-height:1.5;word-break:break-all;">
          ${safeUrl}
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
      <div style="margin-top:24px;padding:18px 16px;border:1px solid #e4e4e7;background:#fafafa;">
        <div style="color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;">Payment status</div>
        <p style="margin:10px 0 0;color:#3f3f46;font-size:14px;line-height:1.65;">
          This invoice is paid in full. Retain it for your records.
          ${phone || email ? " Contact us if you have any questions." : ""}
        </p>
      </div>
    `.trim();
  }

  const contactParts: string[] = [];

  if (phone) {
    contactParts.push(
      `call <strong style="color:#18181b;">${escapeBillingEmailHtml(phone)}</strong>`,
    );
  }

  if (email) {
    contactParts.push(
      `email <strong style="color:#18181b;">${escapeBillingEmailHtml(email)}</strong>`,
    );
  }

  const contactSentence =
    contactParts.length > 0
      ? `Please ${contactParts.join(" or ")} to arrange payment.`
      : input.hasReplyTo
        ? "Reply to this email to arrange payment or ask questions."
        : `Contact ${escapeBillingEmailHtml(input.company.name)} to arrange payment.`;

  return `
    <div style="margin-top:24px;padding:18px 16px;border:1px solid #e4e4e7;background:#fafafa;">
      <div style="color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;">How to pay</div>
      <p style="margin:10px 0 0;color:#3f3f46;font-size:14px;line-height:1.65;">
        ${contactSentence}
        Payment of <strong style="color:#18181b;">${escapeBillingEmailHtml(formatCurrency(input.balanceDue))}</strong>
        is due by <strong style="color:#18181b;">${escapeBillingEmailHtml(formatDate(input.dueDate, input.timeZone))}</strong>.
      </p>
    </div>
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
    return `<p style="margin:0;color:#52525b;font-size:14px;">No line items.</p>`;
  }

  const rows = lineItems
    .map((item) => {
      const lineTotal = calculateLineItemTotal(item.quantity, item.unitPrice);

      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;color:#18181b;font-size:14px;line-height:1.4;">${escapeBillingEmailHtml(item.name)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e4e4e7;color:#52525b;font-size:14px;text-align:center;white-space:nowrap;">${item.quantity}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #e4e4e7;color:#52525b;font-size:14px;text-align:right;white-space:nowrap;">${escapeBillingEmailHtml(formatCurrency(item.unitPrice))}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;color:#18181b;font-size:14px;font-weight:600;text-align:right;white-space:nowrap;">${escapeBillingEmailHtml(formatCurrency(lineTotal))}</td>
        </tr>
      `.trim();
    })
    .join("");

  return `
    <div style="margin-top:20px;">
      <div style="color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:8px;">Line items</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e4e4e7;">
        <thead>
          <tr style="background:#fafafa;">
            <th align="left" style="padding:10px 12px;border-bottom:1px solid #e4e4e7;color:#52525b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Item</th>
            <th align="center" style="padding:10px 8px;border-bottom:1px solid #e4e4e7;color:#52525b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Qty</th>
            <th align="right" style="padding:10px 8px;border-bottom:1px solid #e4e4e7;color:#52525b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Rate</th>
            <th align="right" style="padding:10px 12px;border-bottom:1px solid #e4e4e7;color:#52525b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
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
      "padding:4px 0;color:#52525b;font-size:14px;text-align:left;";
    const valueStyle = [
      "padding:4px 0;color:#18181b;font-size:14px;text-align:right;white-space:nowrap;",
      options?.strong ? "font-weight:700;" : "",
      options?.highlight ? "font-size:16px;font-weight:700;" : "",
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
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:16px;">
      <tbody>${rows.join("")}</tbody>
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
        `<div style="color:#52525b;font-size:13px;line-height:1.6;">${escapeBillingEmailHtml(line)}</div>`,
    )
    .join("");

  return `
    <div style="margin-top:24px;padding-top:18px;border-top:1px solid #e4e4e7;">
      <div style="color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">Questions?</div>
      <div style="color:#18181b;font-size:14px;font-weight:600;margin-bottom:8px;">${escapeBillingEmailHtml(company.name)}</div>
      ${body}
    </div>
  `.trim();
}

export function formatBillingEmailFooter(
  companyName: string,
  hasReplyTo: boolean,
): { text: string; html: string } {
  const text = hasReplyTo
    ? `Reply to this email to reach ${companyName}.`
    : `Contact ${companyName} using the information above.`;

  const html = `<p style="margin:24px 0 0;color:#71717a;font-size:12px;line-height:1.55;">${escapeBillingEmailHtml(text)}</p>`;

  return { text, html };
}

export function formatBillingEmailNotesHtml(notesText: string): string {
  return `
    <div style="margin-top:20px;">
      <div style="color:#64748b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Notes</div>
      <div style="color:#3f3f46;font-size:14px;line-height:1.65;">${formatBillingEmailMultilineHtml(notesText)}</div>
    </div>
  `.trim();
}
