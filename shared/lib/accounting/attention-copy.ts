/**
 * The sentence the owner reads for each thing on the QuickBooks "Needs
 * attention" list: what happened, then what to do. One fixed sentence per
 * reason, filled with plain facts (amounts, names, an address) that the sync
 * engine recorded. Never a QuickBooks error message.
 *
 * Pure. Safe in client components.
 */

export type AttentionEntity = "customer" | "item" | "invoice" | "payment";

export type AttentionFacts = {
  readonly label?: string;
  readonly altairTotal?: number;
  readonly quickbooksTotal?: number;
  readonly altairTax?: number;
  readonly quickbooksTax?: number;
  readonly address?: string;
  readonly quickbooksErrorCode?: string;
  readonly blockedBy?: string;
};

export type AttentionCopy = {
  readonly sentence: string;
  /** Show "Try again". */
  readonly canRetry: boolean;
  /** Show "Mark as handled" (somebody dealt with it in QuickBooks). */
  readonly canMarkHandled: boolean;
};

const money = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value)
    ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "an amount";

const thing: Record<AttentionEntity, string> = {
  customer: "this customer",
  item: "this price book item",
  invoice: "this invoice",
  payment: "this payment",
};

export function describeAttention(code: string | null, entity: AttentionEntity, facts: AttentionFacts): AttentionCopy {
  switch (code) {
    case "total_mismatch": {
      const difference =
        typeof facts.altairTotal === "number" && typeof facts.quickbooksTotal === "number"
          ? Math.abs(facts.altairTotal - facts.quickbooksTotal)
          : undefined;
      const direction =
        typeof facts.altairTotal === "number" && typeof facts.quickbooksTotal === "number" && facts.quickbooksTotal < facts.altairTotal
          ? "lower"
          : "higher";
      return {
        sentence: `QuickBooks worked out ${money(facts.quickbooksTax)} in sales tax. Altair has ${money(facts.altairTax)}. The invoice is in QuickBooks, but its total is ${money(difference)} ${direction}. Check the tax rate for ${facts.address || "the job address"} in QuickBooks, or correct the rate on this invoice in Altair.`,
        canRetry: true,
        canMarkHandled: true,
      };
    }
    case "tax_off_in_quickbooks":
      return {
        sentence: `This invoice has ${money(facts.altairTax)} in sales tax, but sales tax is turned off in your QuickBooks, so the invoice there is ${money(facts.quickbooksTotal)}. Turn on sales tax in QuickBooks, then press Try again.`,
        canRetry: true,
        canMarkHandled: true,
      };
    case "invoice_already_paid":
      return {
        sentence: "QuickBooks says this invoice is already paid in full. Someone may have recorded the payment there by hand. Altair did not send it again.",
        canRetry: true,
        canMarkHandled: true,
      };
    case "invoice_not_sent":
      return {
        sentence: `The invoice ${facts.blockedBy ? `${facts.blockedBy} ` : ""}has not reached QuickBooks, so its payment waits. Fix the invoice first; the payment follows on its own.`,
        canRetry: true,
        canMarkHandled: false,
      };
    case "customer_not_sent":
      return {
        sentence: `The customer ${facts.blockedBy ? `"${facts.blockedBy}" ` : ""}could not be added to QuickBooks, so ${thing[entity]} waits. It goes on its own once the customer does.`,
        canRetry: true,
        canMarkHandled: false,
      };
    case "item_not_sent":
      return {
        sentence: `The price book item ${facts.blockedBy ? `"${facts.blockedBy}" ` : ""}could not be added to QuickBooks, so ${thing[entity]} waits. It goes on its own once the item does.`,
        canRetry: true,
        canMarkHandled: false,
      };
    case "void_has_payments":
      return {
        sentence: "This invoice was voided in Altair, but QuickBooks has a payment on it and will not void it. Remove the payment from the invoice in QuickBooks, then press Try again.",
        canRetry: true,
        canMarkHandled: true,
      };
    case "quickbooks_unavailable":
      return {
        sentence: "QuickBooks kept failing to take this, so Altair stopped trying on its own. Press Try again; if it fails again, tell us and we will look into it.",
        canRetry: true,
        canMarkHandled: true,
      };
    case "rejected":
    default:
      return {
        sentence:
          entity === "customer"
            ? `QuickBooks refused this customer${facts.quickbooksErrorCode ? ` (QuickBooks error ${facts.quickbooksErrorCode})` : ""}. Check the name, email and address in Altair, then press Try again.`
            : entity === "item"
              ? `QuickBooks refused this price book item${facts.quickbooksErrorCode ? ` (QuickBooks error ${facts.quickbooksErrorCode})` : ""}. Check its name and price in Altair, then press Try again.`
              : `QuickBooks refused ${thing[entity]}${facts.quickbooksErrorCode ? ` (QuickBooks error ${facts.quickbooksErrorCode})` : ""}. Check it in Altair, then press Try again. If it keeps happening, tell us the error number.`,
        canRetry: true,
        canMarkHandled: true,
      };
  }
}
