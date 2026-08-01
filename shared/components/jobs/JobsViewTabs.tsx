import {
  adminSegmentedControlClass,
  adminSegmentedItemActiveClass,
  adminSegmentedItemClass,
} from "@/shared/design-system/shell/tokens";

export type TodayAllViewTab = "today" | "all";

type JobsViewTabsProps = {
  activeTab: TodayAllViewTab;
  onTabChange: (tab: TodayAllViewTab) => void;
  todayCount: number;
  allCount: number;
  allTabLabel?: string;
  /** @deprecated Mission Control unifies presentation; retained for call-site compatibility. */
  northStar?: boolean;
};

export function JobsViewTabs({
  activeTab,
  onTabChange,
  todayCount,
  allCount,
  allTabLabel = "All Jobs",
}: JobsViewTabsProps) {
  const tabs: { id: TodayAllViewTab; label: string; count: number }[] = [
    { id: "today", label: "Today", count: todayCount },
    { id: "all", label: allTabLabel, count: allCount },
  ];

  return (
    <div
      className={`${adminSegmentedControlClass} w-full sm:w-auto`}
      role="tablist"
      aria-label="Job views"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-pressed={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`${adminSegmentedItemClass} sm:px-3 sm:py-1.5 ${
              isActive ? adminSegmentedItemActiveClass : ""
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`ml-1.5 text-xs font-medium ${
                isActive
                  ? "text-altair-ink-on-paper-secondary"
                  : "text-altair-ink-on-paper-muted"
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
