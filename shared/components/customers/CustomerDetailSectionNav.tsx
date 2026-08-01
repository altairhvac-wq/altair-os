"use client";

import {
  CUSTOMER_DETAIL_TAB_ANCHORS,
  type CustomerDetailTabId,
} from "@/shared/lib/customers/customer-detail-anchors";
import {
  adminSegmentedControlClass,
  adminSegmentedItemActiveClass,
  adminSegmentedItemClass,
} from "@/shared/design-system/shell/tokens";

type CustomerDetailSectionNavProps = {
  activeTab: CustomerDetailTabId;
  onTabChange: (tab: CustomerDetailTabId) => void;
  showBilling: boolean;
  counts?: Partial<Record<CustomerDetailTabId, number>>;
};

const TAB_ORDER: CustomerDetailTabId[] = [
  "jobs",
  "estimates",
  "invoices",
  "payments",
  "notes",
  "files",
  "equipment",
  "activity",
];

const TAB_LABELS: Record<CustomerDetailTabId, string> = {
  jobs: "Jobs",
  estimates: "Estimates",
  invoices: "Invoices",
  payments: "Payments",
  notes: "Notes",
  files: "Files",
  equipment: "Equipment",
  activity: "Activity",
};

/**
 * Segmented customer-profile tab control.
 * Prefer CustomerDetailTabs for the full tabbed workspace; this export remains
 * for call sites that only need the nav chrome.
 */
export function CustomerDetailSectionNav({
  activeTab,
  onTabChange,
  showBilling,
  counts,
}: CustomerDetailSectionNavProps) {
  const tabs = TAB_ORDER.filter((tab) => {
    if (
      !showBilling &&
      (tab === "estimates" || tab === "invoices" || tab === "payments")
    ) {
      return false;
    }
    return true;
  });

  return (
    <nav
      aria-label="Customer sections"
      className={`${adminSegmentedControlClass} !flex w-full max-w-full min-w-0 overflow-x-auto`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        const count = counts?.[tab];

        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab)}
            className={`${adminSegmentedItemClass} shrink-0 px-2.5 py-1.5 text-[11px] sm:px-3 sm:text-sm ${
              isActive ? adminSegmentedItemActiveClass : ""
            }`}
            data-anchor={CUSTOMER_DETAIL_TAB_ANCHORS[tab]}
          >
            <span>{TAB_LABELS[tab]}</span>
            {typeof count === "number" ? (
              <span
                className={`ml-1.5 text-[10px] font-medium sm:text-xs ${
                  isActive
                    ? "text-altair-ink-on-paper-secondary"
                    : "text-altair-ink-on-paper-muted"
                }`}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
