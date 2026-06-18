import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { EstimateDetailOverlayLoadingState } from "@/shared/components/estimates/EstimateDetailOverlayLoadingState";
import { EstimateDetailOverlayShell } from "@/shared/components/estimates/EstimateDetailOverlayShell";
import { EstimateDetailNorthStarOverlayLoadingState } from "@/shared/components/estimates/north-star-m5c";

export default function InterceptedEstimateDetailLoading() {
  const northStar = isNorthStarShellEnabled();

  return (
    <EstimateDetailOverlayShell title="Loading estimate…">
      {northStar ? (
        <EstimateDetailNorthStarOverlayLoadingState />
      ) : (
        <EstimateDetailOverlayLoadingState />
      )}
    </EstimateDetailOverlayShell>
  );
}
