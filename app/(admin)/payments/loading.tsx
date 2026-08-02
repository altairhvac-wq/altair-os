import { MasterListPageLoadingState } from "@/shared/design-system/shell";

export default function PaymentsLoading() {
  return (
    <MasterListPageLoadingState
      title="Payments"
      subtitle="Collected payments from the invoice ledger."
      summaryCardCount={3}
      summaryLgColumnsClass="lg:grid-cols-3"
      showViewTabs={false}
      filterControlCount={0}
    />
  );
}
