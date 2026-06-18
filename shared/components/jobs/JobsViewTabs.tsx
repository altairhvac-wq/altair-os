import {
  adminSegmentedControlClass,
  adminSegmentedItemActiveClass,
  adminSegmentedItemClass,
} from "@/shared/design-system/shell/tokens";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";

export type TodayAllViewTab = "today" | "all";

type JobsViewTabsProps = {
  activeTab: TodayAllViewTab;
  onTabChange: (tab: TodayAllViewTab) => void;
  todayCount: number;
  allCount: number;
  allTabLabel?: string;
  northStar?: boolean;
};

export function JobsViewTabs({
  activeTab,
  onTabChange,
  todayCount,
  allCount,
  allTabLabel = "All Jobs",
  northStar = false,
}: JobsViewTabsProps) {
  const tabs: { id: TodayAllViewTab; label: string; count: number }[] = [
    { id: "today", label: "Today", count: todayCount },
    { id: "all", label: allTabLabel, count: allCount },
  ];

  if (northStar) {
    return (
      <div className={`${lt.viewTabsControl} w-full sm:w-auto`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onTabChange(tab.id)}
              className={`${lt.viewTabsItem} sm:px-3 sm:py-1.5 ${
                isActive ? lt.viewTabsItemActive : ""
              }`}
            >
              <span>{tab.label}</span>
              <span className={isActive ? lt.viewTabsCountActive : lt.viewTabsCount}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

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
