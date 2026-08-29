"use client";

/**
 * Price Book queue stat tiles — panel 18's replacement for the retired
 * ServiceItemQueueTabs pattern (same consolidation as Payroll and Expenses).
 * MC v2 metric tiles that double as the queue filter: count-only stats,
 * clickable, one active at a time.
 */

import {
  altairMcGridGapClass,
  altairMcMetricLabelClass,
  altairMcMetricValueClass,
  altairMcTileClass,
} from "@/shared/design-system/components";
import {
  SERVICE_ITEM_WORK_QUEUE_LABELS,
  SERVICE_ITEM_WORK_QUEUE_ORDER,
  type ServiceItemWorkQueue,
} from "./service-item-work-queues";

const QUEUE_DESCRIPTIONS: Record<ServiceItemWorkQueue, string> = {
  active: "Sellable right now",
  "needs-cleanup": "Missing cost, price, or category",
  inactive: "Hidden from estimates and invoices",
  past: "Archived and deleted items",
};

type ServiceItemStatStripProps = {
  counts: Record<ServiceItemWorkQueue, number>;
  activeQueue: ServiceItemWorkQueue;
  onQueueChange: (queue: ServiceItemWorkQueue) => void;
};

export function ServiceItemStatStrip({
  counts,
  activeQueue,
  onQueueChange,
}: ServiceItemStatStripProps) {
  return (
    <div
      className={`grid grid-cols-2 ${altairMcGridGapClass} lg:grid-cols-4`}
      role="tablist"
      aria-label="Price Book queues"
    >
      {SERVICE_ITEM_WORK_QUEUE_ORDER.map((queue) => {
        const isActive = queue === activeQueue;
        return (
          <button
            key={queue}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onQueueChange(queue)}
            className={`${altairMcTileClass} text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
              isActive
                ? "bg-[var(--surface-card)] ring-1 ring-inset ring-altair-brass/50"
                : "hover:bg-[var(--surface-card)]"
            }`}
          >
            <p className={altairMcMetricLabelClass}>
              {SERVICE_ITEM_WORK_QUEUE_LABELS[queue]}
            </p>
            <p className={altairMcMetricValueClass}>{counts[queue]}</p>
            <p className="mt-1.5 text-xs font-medium text-altair-ink-on-paper-muted">
              {QUEUE_DESCRIPTIONS[queue]}
            </p>
          </button>
        );
      })}
    </div>
  );
}
