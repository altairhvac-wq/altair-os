import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { MasterDetailPageLoadingState } from "@/shared/design-system/shell";
import { TeamMemberProfileNorthStarLoadingState } from "@/shared/components/team/north-star-m12";

export function TeamMemberProfileLoadingState() {
  if (isNorthStarShellEnabled()) {
    return <TeamMemberProfileNorthStarLoadingState />;
  }

  return (
    <MasterDetailPageLoadingState
      showBackLink
      showProfileCard
      showSummaryGrid
      sectionCount={2}
    />
  );
}
