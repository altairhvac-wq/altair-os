import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { EstimatesNorthStarLoadingState } from "@/shared/components/estimates/north-star-m5b";
import { EstimatesLoadingState } from "@/shared/components/estimates/EstimatesLoadingState";

export default function EstimatesLoading() {
  if (isNorthStarShellEnabled()) {
    return <EstimatesNorthStarLoadingState />;
  }

  return <EstimatesLoadingState />;
}
