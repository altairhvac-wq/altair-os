import { MasterListPageLoadingState } from "@/shared/design-system/shell";

export function ExpensesLoadingState() {
  return (
    <MasterListPageLoadingState
      summaryCardCount={4}
      showViewTabs={false}
      filterControlCount={3}
    />
  );
}
