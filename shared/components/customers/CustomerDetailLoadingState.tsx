import { MasterDetailPageLoadingState } from "@/shared/design-system/shell";

export function CustomerDetailLoadingState() {
  return (
    <MasterDetailPageLoadingState
      showBackLink
      showProfileCard
      sectionCount={4}
    />
  );
}
