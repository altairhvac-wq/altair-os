type JobsViewTab = "today" | "all";

type JobsViewTabsProps = {
  activeTab: JobsViewTab;
  onTabChange: (tab: JobsViewTab) => void;
  todayCount: number;
  allCount: number;
};

export function JobsViewTabs({
  activeTab,
  onTabChange,
  todayCount,
  allCount,
}: JobsViewTabsProps) {
  const tabs: { id: JobsViewTab; label: string; count: number }[] = [
    { id: "today", label: "Today", count: todayCount },
    { id: "all", label: "All Jobs", count: allCount },
  ];

  return (
    <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`min-w-0 flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>{tab.label}</span>
            <span className="ml-1.5 text-xs font-medium text-slate-400">
              ({tab.count})
            </span>
          </button>
        );
      })}
    </div>
  );
}
