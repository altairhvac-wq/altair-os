import { ListCommandCenterLoadingState } from "@/shared/components/layout/ListCommandCenterLoadingState";

export function InvoicesLoadingState() {
  return (
    <ListCommandCenterLoadingState
      summaryCardCount={3}
      summaryLgColumnsClass="lg:grid-cols-3"
    />
  );
}
