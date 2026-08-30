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
            /* `aria-selected` is the tab state. `aria-pressed` is a toggle-button
               attribute and is not supported on this role. */
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`${adminSegmentedItemClass} sm:px-3 sm:py-1.5 ${
              isActive ? adminSegmentedItemActiveClass : ""
            }`}
          >
            <span>{tab.label}</span>
            {/* One tone for both states. The inactive badge used to be
                `-muted`, which measured 4.31:1 against the control's wash, and
                the active/inactive distinction is already carried by the pill
                background and the label weight — it does not need the count to
                dim below AA as well. */}
            <span className="ml-1.5 text-xs font-medium text-altair-ink-on-paper-secondary">
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
