import { EstimateDetailOverlayLoadingState } from "@/shared/components/estimates/EstimateDetailOverlayLoadingState";
import { EstimateDetailOverlayShell } from "@/shared/components/estimates/EstimateDetailOverlayShell";

export default function InterceptedEstimateDetailLoading() {
  return (
    <EstimateDetailOverlayShell title="Loading estimate…">
      <EstimateDetailOverlayLoadingState />
    </EstimateDetailOverlayShell>
  );
}
