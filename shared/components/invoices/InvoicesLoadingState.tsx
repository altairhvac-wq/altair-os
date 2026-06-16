import { MasterListPageLoadingState } from "@/shared/design-system/shell";

export function InvoicesLoadingState() {
  return (
    <MasterListPageLoadingState
      summaryCardCount={5}
      summaryLgColumnsClass="lg:grid-cols-5"
    />
  );
}
