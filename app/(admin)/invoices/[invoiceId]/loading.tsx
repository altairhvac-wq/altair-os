import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { InvoiceDetailLoadingState } from "@/shared/components/invoices/InvoiceDetailLoadingState";
import { InvoiceDetailNorthStarLoadingState } from "@/shared/components/invoices/north-star-m5d/InvoiceDetailNorthStarLoadingState";

export default function InvoiceDetailLoading() {
  if (isNorthStarShellEnabled()) {
    return <InvoiceDetailNorthStarLoadingState />;
  }

  return <InvoiceDetailLoadingState />;
}
