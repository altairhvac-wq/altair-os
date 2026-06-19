import {
  adminSegmentedControlClass,
  adminSegmentedItemActiveClass,
  adminSegmentedItemClass,
} from "@/shared/design-system/shell/tokens";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import {
  ESTIMATE_WORK_QUEUE_LABELS,
  ESTIMATE_WORK_QUEUE_ORDER,
  type EstimateWorkQueue,
} from "./estimate-work-queues";

type EstimateQueueTabsProps = {
  activeQueue: EstimateWorkQueue;
  onQueueChange: (queue: EstimateWorkQueue) => void;
  counts: Record<EstimateWorkQueue, number>;
  northStar?: boolean;
};

export function EstimateQueueTabs({
  activeQueue,
  onQueueChange,
  counts,
  northStar = false,
}: EstimateQueueTabsProps) {
  const tabs = ESTIMATE_WORK_QUEUE_ORDER.map((queue) => ({
    id: queue,
    label: ESTIMATE_WORK_QUEUE_LABELS[queue],
    count: counts[queue],
  }));

  if (northStar) {
    return (
      <div className={`${lt.viewTabsControl} w-full sm:w-auto`}>
        {tabs.map((tab) => {
          const isActive = activeQueue === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onQueueChange(tab.id)}
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
        const isActive = activeQueue === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onQueueChange(tab.id)}
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
