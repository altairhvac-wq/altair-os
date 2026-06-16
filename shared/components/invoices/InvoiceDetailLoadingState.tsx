import { MasterDetailPageLoadingState } from "@/shared/design-system/shell";

type InvoiceDetailLoadingStateProps = {
  showBackLink?: boolean;
};

export function InvoiceDetailLoadingState({
  showBackLink = true,
}: InvoiceDetailLoadingStateProps) {
  return (
    <MasterDetailPageLoadingState
      showBackLink={showBackLink}
      showProfileCard
      showSummaryGrid
      sectionCount={2}
    />
  );
}
