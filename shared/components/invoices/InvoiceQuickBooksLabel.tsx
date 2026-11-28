import Link from "next/link";

/**
 * Where an invoice stands with QuickBooks, in one line on the invoice screen
 * (design screen 3, "On an invoice"). Shown only to people who handle billing,
 * and only once the company has QuickBooks connected and this invoice is in
 * the queue; otherwise nothing is drawn.
 */

export type InvoiceQuickBooksLabelProps =
  | { readonly kind: "sent"; readonly sentAtLabel: string | null }
  | { readonly kind: "waiting" }
  | { readonly kind: "attention"; readonly sentence: string };

export function InvoiceQuickBooksLabel(props: InvoiceQuickBooksLabelProps) {
  if (props.kind === "sent") {
    return (
      <p data-testid="invoice-quickbooks-label" className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-altair-success-surface px-2.5 py-1 text-xs font-semibold text-altair-success-foreground">
        <span aria-hidden="true">✓</span> In QuickBooks{props.sentAtLabel ? ` · sent ${props.sentAtLabel}` : ""}
      </p>
    );
  }
  if (props.kind === "waiting") {
    return (
      <p data-testid="invoice-quickbooks-label" className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-altair-paper-subtle px-2.5 py-1 text-xs font-semibold text-altair-ink-secondary">
        On its way to QuickBooks
      </p>
    );
  }
  return (
    <div data-testid="invoice-quickbooks-label" className="mb-3 rounded-lg bg-altair-danger-surface px-3 py-2 text-xs text-altair-danger-foreground">
      <p className="font-semibold">Not right in QuickBooks yet</p>
      <p className="mt-0.5 leading-5">{props.sentence}</p>
      <Link href="/settings/integrations" className="mt-1 inline-block font-semibold underline underline-offset-2">
        Open QuickBooks settings
      </Link>
    </div>
  );
}
