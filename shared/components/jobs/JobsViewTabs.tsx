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
    <div className={`${adminSegmentedControlClass} w-full sm:w-auto`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`${adminSegmentedItemClass} sm:px-3 sm:py-1.5 ${
              isActive ? adminSegmentedItemActiveClass : ""
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`ml-1.5 text-xs font-medium ${
                isActive ? "text-slate-500" : "text-slate-400"
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
