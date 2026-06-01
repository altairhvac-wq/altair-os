import { ListCommandCenterLoadingState } from "@/shared/components/layout/ListCommandCenterLoadingState";

export function ServiceItemsLoadingState() {
  return (
    <ListCommandCenterLoadingState showViewTabs={false} filterControlCount={2} />
  );
}
