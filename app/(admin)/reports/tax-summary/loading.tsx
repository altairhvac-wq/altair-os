import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { TaxSummaryNorthStarLoadingState } from "@/shared/components/reports/north-star-m8/TaxSummaryNorthStarLoadingState";
import { TaxSummaryLoadingState } from "@/shared/components/reports/TaxSummaryLoadingState";

export default function TaxSummaryLoading() {
  if (isNorthStarShellEnabled()) {
    return <TaxSummaryNorthStarLoadingState />;
  }

  return <TaxSummaryLoadingState />;
}
