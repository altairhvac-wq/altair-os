import { MasterDetailPageLoadingState } from "@/shared/design-system/shell";

type EstimateDetailLoadingStateProps = {
  showBackLink?: boolean;
};

export function EstimateDetailLoadingState({
  showBackLink = true,
}: EstimateDetailLoadingStateProps) {
  return (
    <MasterDetailPageLoadingState
      showBackLink={showBackLink}
      showProfileCard
      showSummaryGrid
      sectionCount={2}
    />
  );
}
