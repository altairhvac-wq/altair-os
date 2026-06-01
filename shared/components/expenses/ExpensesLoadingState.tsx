import { ListCommandCenterLoadingState } from "@/shared/components/layout/ListCommandCenterLoadingState";

export function ExpensesLoadingState() {
  return (
    <ListCommandCenterLoadingState
      summaryCardCount={4}
      showViewTabs={false}
      filterControlCount={3}
    />
  );
}
