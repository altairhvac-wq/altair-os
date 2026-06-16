import { MasterListPageLoadingState } from "@/shared/design-system/shell";

export function LeadsLoadingState() {
  return (
    <MasterListPageLoadingState
      showViewTabs={false}
      filterControlCount={3}
    />
  );
}
