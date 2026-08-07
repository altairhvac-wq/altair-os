"use client";

/**
 * Expense queue stat tiles — panel 19's replacement for the retired
 * ExpenseQueueTabs pattern (same consolidation as Payroll's PayrollStatStrip
 * and panels 7–9 before it). MC v2 metric tiles that double as the queue
 * filter: count-only stats, clickable, one active at a time.
 */

import {
  altairMcGridGapClass,
  altairMcMetricLabelClass,
  altairMcMetricValueClass,
  altairMcTileClass,
} from "@/shared/design-system/components";
import {
  EXPENSE_WORK_QUEUE_LABELS,
  EXPENSE_WORK_QUEUE_ORDER,
  type ExpenseWorkQueue,
} from "./expense-work-queues";

const QUEUE_DESCRIPTIONS: Record<ExpenseWorkQueue, string> = {
  "needs-review": "Submitted, awaiting approval",
  uncategorized: "Missing a category",
  approved: "Cleared for the books",
  past: "Closed and archived records",
};

type ExpenseStatStripProps = {
  counts: Record<ExpenseWorkQueue, number>;
  activeQueue: ExpenseWorkQueue;
  onQueueChange: (queue: ExpenseWorkQueue) => void;
};

export function ExpenseStatStrip({
  counts,
  activeQueue,
  onQueueChange,
}: ExpenseStatStripProps) {
  return (
    <div
      className={`grid grid-cols-2 ${altairMcGridGapClass} lg:grid-cols-4`}
      role="tablist"
      aria-label="Expense queues"
    >
      {EXPENSE_WORK_QUEUE_ORDER.map((queue) => {
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
              {EXPENSE_WORK_QUEUE_LABELS[queue]}
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
