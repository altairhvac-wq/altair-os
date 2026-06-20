import { MasterListPageLoadingState } from "@/shared/design-system/shell";

export function CustomersLoadingState() {
  return (
    <MasterListPageLoadingState
      showViewTabs
      showSecondaryAction
      filterControlCount={1}
      tableRowVariant="customer"
    />
  );
}
