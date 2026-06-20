import { MasterListPageLoadingState } from "@/shared/design-system/shell";

export function ServiceItemsLoadingState() {
  return (
    <MasterListPageLoadingState
      showViewTabs
      summaryCardCount={0}
      filterControlCount={1}
    />
  );
}
