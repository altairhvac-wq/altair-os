import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { InvoicesNorthStarLoadingState } from "@/shared/components/invoices/north-star-m5a";
import { InvoicesLoadingState } from "@/shared/components/invoices/InvoicesLoadingState";

export default function InvoicesLoading() {
  if (isNorthStarShellEnabled()) {
    return <InvoicesNorthStarLoadingState />;
  }

  return <InvoicesLoadingState />;
}
