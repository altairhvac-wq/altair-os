export type BillingSignatureBlockVariant = "estimate" | "invoice";

export type BillingSignatureBlockContent = {
  label: string;
  supportingText: string;
  fields: {
    signature: string;
    printedName: string;
    date: string;
  };
};

const BILLING_SIGNATURE_BLOCK_CONTENT: Record<
  BillingSignatureBlockVariant,
  BillingSignatureBlockContent
> = {
  estimate: {
    label: "Customer Authorization",
    supportingText:
      "By signing, the customer authorizes the proposed work described in this estimate.",
    fields: {
      signature: "Customer signature",
      printedName: "Printed name",
      date: "Date",
    },
  },
  invoice: {
    label: "Customer Acceptance",
    supportingText:
      "By signing, the customer acknowledges completion of the work and receipt of this invoice.",
    fields: {
      signature: "Customer signature",
      printedName: "Printed name",
      date: "Date",
    },
  },
};

export function getBillingSignatureBlockContent(
  variant: BillingSignatureBlockVariant,
): BillingSignatureBlockContent {
  return BILLING_SIGNATURE_BLOCK_CONTENT[variant];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function formatBillingSignatureBlockText(
  variant: BillingSignatureBlockVariant,
): string {
  const content = getBillingSignatureBlockContent(variant);

  return [
    content.label,
    `${content.fields.signature}: ________________________________`,
    `${content.fields.printedName}: ________________________________`,
    `${content.fields.date}: ________________________________`,
    "",
    content.supportingText,
  ].join("\n");
}

export function formatBillingSignatureBlockHtml(
  variant: BillingSignatureBlockVariant,
): string {
  const content = getBillingSignatureBlockContent(variant);
  const fieldRow = (label: string) =>
    `
      <tr>
        <td style="padding:10px 0 0;color:#52525b;font-size:13px;vertical-align:bottom;white-space:nowrap;width:1%;">${escapeHtml(label)}</td>
        <td style="padding:10px 0 0 12px;border-bottom:1px solid #a1a1aa;color:#18181b;font-size:14px;line-height:1.6;min-width:180px;">&nbsp;</td>
      </tr>
    `.trim();

  return `
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e4e4e7;">
      <div style="color:#71717a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(content.label)}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:14px;">
        <tbody>
          ${fieldRow(content.fields.signature)}
          ${fieldRow(content.fields.printedName)}
          ${fieldRow(content.fields.date)}
        </tbody>
      </table>
      <p style="margin:14px 0 0;color:#71717a;font-size:12px;line-height:1.6;">${escapeHtml(content.supportingText)}</p>
    </div>
  `.trim();
}
