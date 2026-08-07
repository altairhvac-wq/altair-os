"use client";

/**
 * Payroll queue stat tiles — panel 17's replacement for the retired
 * TimeQueueTabs pattern (same retirement panels 7–9 performed on
 * Estimates/Invoices). MC v2 metric tiles that double as the queue filter:
 * count-only stats (no invented deltas), clickable, one active at a time.
 */

import {
  altairMcGridGapClass,
  altairMcMetricLabelClass,
  altairMcMetricValueClass,
  altairMcTileClass,
} from "@/shared/design-system/components";
import {
  TIME_WORK_QUEUE_LABELS,
  TIME_WORK_QUEUE_ORDER,
  type TimeWorkQueue,
} from "./time-work-queues";

const QUEUE_DESCRIPTIONS: Record<TimeWorkQueue, string> = {
  "needs-review": "Closed this period, awaiting approval",
  approved: "Ready for payroll",
  active: "On the clock now",
  past: "Previous periods",
};

type PayrollStatStripProps = {
  counts: Record<TimeWorkQueue, number>;
  activeQueue: TimeWorkQueue;
  onQueueChange: (queue: TimeWorkQueue) => void;
};

export function PayrollStatStrip({
  counts,
  activeQueue,
  onQueueChange,
}: PayrollStatStripProps) {
  return (
    <div
      className={`grid grid-cols-2 ${altairMcGridGapClass} lg:grid-cols-4`}
      role="tablist"
      aria-label="Payroll queues"
    >
      {TIME_WORK_QUEUE_ORDER.map((queue) => {
        const isActive = queue === activeQueue;
        return (
          <button
            key={queue}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onQueueChange(queue)}
            className={`${altairMcTileClass} text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40 ${
              isActive
                ? "bg-[var(--surface-card)] ring-1 ring-inset ring-altair-brass/50"
                : "hover:bg-[var(--surface-card)]"
            }`}
          >
            <p className={altairMcMetricLabelClass}>
              {TIME_WORK_QUEUE_LABELS[queue]}
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
