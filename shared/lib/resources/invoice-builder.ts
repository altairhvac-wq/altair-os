/**
 * HVAC Invoice Builder: the money math behind /insights/hvac-invoice-template.
 *
 * ============ INTEGER CENTS, ALWAYS ============
 * Every amount is parsed from the visitor's text straight into integer cents,
 * and every quantity into integer thousandths, so no binary fraction ever
 * reaches a total. A line is `round(qty_thousandths x price_cents / 1000)`;
 * tax is `round(taxable_cents x rate_thousandths_of_a_percent / 100000)`.
 * Both products stay far below 2^53 for any invoice a person could type.
 *
 * The only rounding is to the nearest cent, half up, once per line and once
 * for the tax, which is how the totals on a paper invoice are worked out.
 *
 * No React, no imports: a verifier can drive it directly.
 */

/** "$1,234.5" / "1234.50" / "-3" -> cents. Anything unparseable is 0. */
export function parseCents(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, "");
  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(cleaned);
  if (!match || (match[2] === "" && (match[3] ?? "") === "")) return 0;
  const whole = match[2] === "" ? 0 : Number.parseInt(match[2].slice(0, 12), 10);
  const fraction = (match[3] ?? "").padEnd(3, "0").slice(0, 3);
  // Third decimal rounds the cent, half up.
  const thousandths = whole * 1000 + Number.parseInt(fraction, 10);
  const cents = Math.round(thousandths / 10);
  return match[1] === "-" ? -cents : cents;
}

/** "0.75" -> 750 thousandths. Negative quantities are treated as 0. */
export function parseThousandths(raw: string): number {
  const cleaned = raw.replace(/[,\s]/g, "");
  const match = /^(\d*)(?:\.(\d*))?$/.exec(cleaned);
  if (!match || (match[1] === "" && (match[2] ?? "") === "")) return 0;
  const whole = match[1] === "" ? 0 : Number.parseInt(match[1].slice(0, 9), 10);
  const fraction = (match[2] ?? "").padEnd(3, "0").slice(0, 3);
  return whole * 1000 + Number.parseInt(fraction, 10);
}

/** Half-up rounding of a non-negative or negative integer ratio, symmetric. */
function roundDiv(numerator: number, denominator: number): number {
  const sign = numerator < 0 ? -1 : 1;
  return sign * Math.floor((Math.abs(numerator) + denominator / 2) / denominator);
}

export type InvoiceLineKind = "labor" | "part" | "refrigerant" | "fee";

export type InvoiceLine = {
  readonly id: string;
  readonly kind: InvoiceLineKind;
  readonly description: string;
  /** Part number, for parts. */
  readonly partNumber: string;
  /** Hours for labor, pounds for refrigerant, quantity for parts and fees. */
  readonly qty: string;
  /** Rate per hour or unit price, dollars as typed. */
  readonly price: string;
  readonly taxable: boolean;
};

export function lineAmountCents(line: Pick<InvoiceLine, "qty" | "price">): number {
  return roundDiv(parseThousandths(line.qty) * parseCents(line.price), 1000);
}

export type DiscountMode = "amount" | "percent";
export type PaymentMode = "full" | "deposit" | "progress";

export type InvoiceTotalsInput = {
  readonly lines: readonly InvoiceLine[];
  /** Sales tax rate in percent as typed, e.g. "7" or "8.875". */
  readonly taxRate: string;
  readonly discountMode: DiscountMode;
  /** Dollars, or percent of the subtotal. */
  readonly discount: string;
  /** When on, the discount lowers the taxed amount in proportion. */
  readonly discountReducesTax: boolean;
  /** Already paid (deposit received), dollars. */
  readonly amountPaid: string;
};

export type InvoiceTotals = {
  readonly lineCents: readonly number[];
  readonly laborCents: number;
  /** Parts and refrigerant. */
  readonly partsCents: number;
  readonly feesCents: number;
  readonly subtotalCents: number;
  readonly taxableCents: number;
  readonly discountCents: number;
  readonly taxBaseCents: number;
  readonly taxCents: number;
  readonly totalCents: number;
  readonly paidCents: number;
  readonly balanceCents: number;
};

/** Thousandths of a percent: "8.875" -> 8875. */
function parseRateThousandths(raw: string): number {
  return Math.min(100_000, parseThousandths(raw));
}

export function calculateInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotals {
  const lineCents = input.lines.map(lineAmountCents);
  let laborCents = 0;
  let partsCents = 0;
  let feesCents = 0;
  let taxableCents = 0;
  input.lines.forEach((line, index) => {
    const cents = lineCents[index];
    if (line.kind === "labor") laborCents += cents;
    else if (line.kind === "part" || line.kind === "refrigerant") partsCents += cents;
    else feesCents += cents;
    if (line.taxable) taxableCents += cents;
  });
  const subtotalCents = laborCents + partsCents + feesCents;

  const rawDiscount =
    input.discountMode === "percent"
      ? roundDiv(Math.max(0, subtotalCents) * parseRateThousandths(input.discount), 100_000)
      : Math.abs(parseCents(input.discount));
  const discountCents = Math.min(Math.max(0, subtotalCents), rawDiscount);

  // A discount that lowers tax does so in proportion to the taxable share of
  // the subtotal (all of it, when every line is taxable).
  const taxDiscount =
    input.discountReducesTax && subtotalCents > 0
      ? roundDiv(discountCents * Math.max(0, taxableCents), subtotalCents)
      : 0;
  const taxBaseCents = Math.max(0, taxableCents - taxDiscount);
  const taxCents = roundDiv(taxBaseCents * parseRateThousandths(input.taxRate), 100_000);
  const totalCents = subtotalCents - discountCents + taxCents;
  const paidCents = Math.max(0, parseCents(input.amountPaid));
  return {
    lineCents,
    laborCents,
    partsCents,
    feesCents,
    subtotalCents,
    taxableCents,
    discountCents,
    taxBaseCents,
    taxCents,
    totalCents,
    paidCents,
    balanceCents: totalCents - paidCents,
  };
}

/** A deposit requested on this invoice, as a percent of the total. */
export function depositRequestCents(totalCents: number, percent: string): number {
  return roundDiv(Math.max(0, totalCents) * parseRateThousandths(percent), 100_000);
}

/** Integer cents -> "$1,234.56" (negative as "-$12.00"). */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(cents));
  const dollars = Math.floor(abs / 100).toLocaleString("en-US");
  const rest = String(abs % 100).padStart(2, "0");
  return `${sign}$${dollars}.${rest}`;
}

/** Thousandths -> "0.75", "2", "1.125". */
export function formatQty(raw: string): string {
  const t = parseThousandths(raw);
  const whole = Math.floor(t / 1000);
  const frac = String(t % 1000).padStart(3, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : String(whole);
}
