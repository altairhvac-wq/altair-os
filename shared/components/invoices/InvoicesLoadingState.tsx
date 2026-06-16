import { MasterListPageLoadingState } from "@/shared/design-system/shell";

export function InvoicesLoadingState() {
  return (
    <MasterListPageLoadingState
      summaryCardCount={3}
      summaryLgColumnsClass="lg:grid-cols-3"
    />
  );
}
