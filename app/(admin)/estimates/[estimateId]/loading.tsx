import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { EstimateDetailLoadingState } from "@/shared/components/estimates/EstimateDetailLoadingState";
import { EstimateDetailNorthStarLoadingState } from "@/shared/components/estimates/north-star-m5c";

export default function EstimateDetailLoading() {
  if (isNorthStarShellEnabled()) {
    return <EstimateDetailNorthStarLoadingState />;
  }

  return <EstimateDetailLoadingState />;
}
