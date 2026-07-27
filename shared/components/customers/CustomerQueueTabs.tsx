import {
  adminSegmentedControlClass,
  adminSegmentedItemActiveClass,
  adminSegmentedItemClass,
} from "@/shared/design-system/shell/tokens";
import {
  CUSTOMER_WORK_QUEUE_LABELS,
  CUSTOMER_WORK_QUEUE_ORDER,
  type CustomerWorkQueue,
} from "./customer-work-queues";

type CustomerQueueTabsProps = {
  activeQueue: CustomerWorkQueue;
  onQueueChange: (queue: CustomerWorkQueue) => void;
  counts: Record<CustomerWorkQueue, number>;
  /** @deprecated Mission Briefing unifies presentation; retained for call-site compatibility. */
  northStar?: boolean;
};

const tabControlLayoutClass =
  "!grid w-full max-w-full min-w-0 grid-cols-4 overflow-hidden sm:!flex sm:w-auto";

export function CustomerQueueTabs({
  activeQueue,
  onQueueChange,
  counts,
}: CustomerQueueTabsProps) {
  const tabs = CUSTOMER_WORK_QUEUE_ORDER.map((queue) => ({
    id: queue,
    label: CUSTOMER_WORK_QUEUE_LABELS[queue],
    count: counts[queue],
  }));

  return (
    <div
      className={`${adminSegmentedControlClass} ${tabControlLayoutClass}`}
      role="tablist"
      aria-label="Customer queues"
    >
      {tabs.map((tab) => {
        const isActive = activeQueue === tab.id;
        const needsAttention = tab.id === "needs-info" && tab.count > 0;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-pressed={isActive}
            onClick={() => onQueueChange(tab.id)}
            className={`${adminSegmentedItemClass} min-w-0 px-1 py-1.5 text-[10px] leading-tight sm:px-3 sm:py-1.5 sm:text-sm ${
              isActive ? adminSegmentedItemActiveClass : ""
            }`}
          >
            <span className="block text-center leading-tight">{tab.label}</span>
            <span
              className={`block text-center text-[10px] font-medium sm:ml-1.5 sm:inline sm:text-xs ${
                needsAttention && !isActive
                  ? "text-altair-warning-foreground"
                  : isActive
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
