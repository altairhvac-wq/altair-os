"use client";

import {
  adminSegmentedControlClass,
  adminSegmentedItemActiveClass,
  adminSegmentedItemClass,
} from "@/shared/design-system/shell/tokens";
import {
  SALES_HUB_TAB_IDS,
  SALES_HUB_TAB_LABELS,
  type SalesHubTabId,
} from "@/shared/lib/sales/sales-hub";

type SalesHubTabsProps = {
  activeTab: SalesHubTabId;
  onTabChange: (tab: SalesHubTabId) => void;
};

export function SalesHubTabs({ activeTab, onTabChange }: SalesHubTabsProps) {
  return (
    <div
      className={`${adminSegmentedControlClass} w-full sm:w-auto`}
      role="tablist"
      aria-label="Sales views"
    >
      {SALES_HUB_TAB_IDS.map((tabId) => {
        const isActive = activeTab === tabId;

        return (
          <button
            key={tabId}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tabId)}
            className={`${adminSegmentedItemClass} whitespace-nowrap sm:px-2.5 sm:py-1.5 ${
              isActive ? adminSegmentedItemActiveClass : ""
            }`}
          >
            {SALES_HUB_TAB_LABELS[tabId]}
          </button>
        );
      })}
    </div>
  );
}
