import { MasterListPageLoadingState } from "@/shared/design-system/shell";

export function ServiceItemsLoadingState() {
  return (
    <MasterListPageLoadingState showViewTabs={false} filterControlCount={2} />
  );
}
