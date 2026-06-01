import { EstimateDetailLoadingState } from "@/shared/components/estimates/EstimateDetailLoadingState";
import { EstimateDetailOverlayShell } from "@/shared/components/estimates/EstimateDetailOverlayShell";

export default function InterceptedEstimateDetailLoading() {
  return (
    <EstimateDetailOverlayShell title="Loading estimate…">
      <EstimateDetailLoadingState />
    </EstimateDetailOverlayShell>
  );
}
