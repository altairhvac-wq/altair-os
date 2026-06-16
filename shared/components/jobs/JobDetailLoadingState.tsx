import { MasterDetailPageLoadingState } from "@/shared/design-system/shell";

export function JobDetailLoadingState() {
  return (
    <MasterDetailPageLoadingState
      showBackLink
      showProfileCard
      showSummaryGrid
      sectionCount={4}
    />
  );
}
