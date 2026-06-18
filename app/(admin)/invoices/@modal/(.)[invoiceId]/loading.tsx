import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { InvoiceDetailOverlayLoadingState } from "@/shared/components/invoices/InvoiceDetailOverlayLoadingState";
import { InvoiceDetailOverlayShell } from "@/shared/components/invoices/InvoiceDetailOverlayShell";
import { InvoiceDetailNorthStarOverlayLoadingState } from "@/shared/components/invoices/north-star-m5d/InvoiceDetailNorthStarOverlayLoadingState";

export default function InterceptedInvoiceDetailLoading() {
  const northStar = isNorthStarShellEnabled();

  return (
    <InvoiceDetailOverlayShell title="Loading invoice…">
      {northStar ? (
        <InvoiceDetailNorthStarOverlayLoadingState />
      ) : (
        <InvoiceDetailOverlayLoadingState />
      )}
    </InvoiceDetailOverlayShell>
  );
}
