import { ListCommandCenterLoadingState } from "@/shared/components/layout/ListCommandCenterLoadingState";

export function CustomersLoadingState() {
  return (
    <ListCommandCenterLoadingState
      showViewTabs={false}
      filterControlCount={2}
      tableRowVariant="customer"
    />
  );
}
