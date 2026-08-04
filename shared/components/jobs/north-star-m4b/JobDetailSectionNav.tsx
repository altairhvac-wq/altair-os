"use client";

import { useMemo } from "react";
import {
  JOB_DETAIL_BILLING_ANCHOR,
  JOB_DETAIL_EQUIPMENT_ANCHOR,
  JOB_DETAIL_SECTION_NAV_ITEMS,
} from "@/shared/lib/jobs/job-detail-anchors";
import type { JobDetailTabId } from "@/shared/lib/jobs/job-detail-tabs";

type JobDetailSectionNavProps = {
  activeTab: JobDetailTabId;
  onTabChange: (tabId: JobDetailTabId) => void;
  showBilling: boolean;
  showEquipment: boolean;
};

export function JobDetailSectionNav({
  activeTab,
  onTabChange,
  showBilling,
  showEquipment,
}: JobDetailSectionNavProps) {
  const items = useMemo(
    () =>
      JOB_DETAIL_SECTION_NAV_ITEMS.filter((item) => {
        if (item.id === JOB_DETAIL_EQUIPMENT_ANCHOR) {
          return showEquipment;
        }
        if (item.id === JOB_DETAIL_BILLING_ANCHOR) {
          return showBilling;
        }
        return true;
      }),
    [showBilling, showEquipment],
  );

  return (
    <div
      role="tablist"
      aria-label="Job sections"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5"
    >
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`job-detail-tab-${item.id}`}
            aria-selected={isActive}
            aria-controls={`job-detail-panel-${item.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(item.id)}
            className={`inline-flex min-h-9 shrink-0 items-center rounded-lg px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass focus-visible:ring-offset-1 ${
              isActive
                ? "bg-altair-stone text-altair-ink-on-paper shadow-[inset_0_-2px_0_0_var(--altair-brass)]"
                : "text-altair-ink-on-paper-secondary hover:bg-altair-stone/70 hover:text-altair-ink-on-paper"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
