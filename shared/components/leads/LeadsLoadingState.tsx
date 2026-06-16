import { ListCommandCenterLoadingState } from "@/shared/components/layout/ListCommandCenterLoadingState";

export function LeadsLoadingState() {
  return (
    <ListCommandCenterLoadingState
      showViewTabs={false}
      filterControlCount={3}
    />
  );
}
