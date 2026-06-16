import { MasterListPageLoadingState } from "@/shared/design-system/shell";

export function CustomersLoadingState() {
  return (
    <MasterListPageLoadingState
      showViewTabs={false}
      showSecondaryAction
      filterControlCount={2}
      tableRowVariant="customer"
    />
  );
}
