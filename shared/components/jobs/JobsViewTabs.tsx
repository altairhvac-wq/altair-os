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
    <div className="flex gap-1 rounded-lg border border-slate-200/90 bg-slate-100/60 p-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`min-w-0 flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition-all ${
              isActive
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
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
