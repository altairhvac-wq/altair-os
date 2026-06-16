import { MasterDetailPageLoadingState } from "@/shared/design-system/shell";

export function TeamMemberProfileLoadingState() {
  return (
    <MasterDetailPageLoadingState
      showBackLink
      showProfileCard
      showSummaryGrid
      sectionCount={2}
    />
  );
}
