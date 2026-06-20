import {
  adminSegmentedControlClass,
  adminSegmentedItemActiveClass,
  adminSegmentedItemClass,
} from "@/shared/design-system/shell/tokens";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import {
  TIME_WORK_QUEUE_LABELS,
  TIME_WORK_QUEUE_ORDER,
  type TimeWorkQueue,
} from "./time-work-queues";

type TimeQueueTabsProps = {
  activeQueue: TimeWorkQueue;
  onQueueChange: (queue: TimeWorkQueue) => void;
  counts: Record<TimeWorkQueue, number>;
  northStar?: boolean;
};

const tabControlLayoutClass =
  "!grid w-full max-w-full min-w-0 grid-cols-4 overflow-hidden sm:!flex sm:w-auto";

export function TimeQueueTabs({
  activeQueue,
  onQueueChange,
  counts,
  northStar = false,
}: TimeQueueTabsProps) {
  const tabs = TIME_WORK_QUEUE_ORDER.map((queue) => ({
    id: queue,
    label: TIME_WORK_QUEUE_LABELS[queue],
    count: counts[queue],
  }));

  if (northStar) {
    return (
      <div className={`${lt.viewTabsControl} ${tabControlLayoutClass}`}>
        {tabs.map((tab) => {
          const isActive = activeQueue === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onQueueChange(tab.id)}
              className={`${lt.viewTabsItem} min-w-0 px-1 py-1.5 text-[10px] leading-tight sm:px-3 sm:py-1.5 sm:text-sm ${
                isActive ? lt.viewTabsItemActive : ""
              }`}
            >
              <span className="block text-center leading-tight">{tab.label}</span>
              <span
                className={`block text-center text-[10px] font-medium sm:ml-1.5 sm:inline sm:text-xs ${
                  isActive ? lt.viewTabsCountActive : lt.viewTabsCount
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

  return (
    <div className={`${adminSegmentedControlClass} ${tabControlLayoutClass}`}>
      {tabs.map((tab) => {
        const isActive = activeQueue === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onQueueChange(tab.id)}
            className={`${adminSegmentedItemClass} min-w-0 px-1 py-1.5 text-[10px] leading-tight sm:px-3 sm:py-1.5 sm:text-sm ${
              isActive ? adminSegmentedItemActiveClass : ""
            }`}
          >
            <span className="block text-center leading-tight">{tab.label}</span>
            <span
              className={`block text-center text-[10px] font-medium sm:ml-1.5 sm:inline sm:text-xs ${
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
