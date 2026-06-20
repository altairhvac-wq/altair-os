import { MasterListPageLoadingState } from "@/shared/design-system/shell";

export default function MarketingLoading() {
  return (
    <MasterListPageLoadingState
      title="Marketing"
      subtitle="Turn completed work, service areas, and seasonal reminders into ready-to-post content."
      summaryCardCount={0}
      showViewTabs={false}
      filterControlCount={0}
    />
  );
}
