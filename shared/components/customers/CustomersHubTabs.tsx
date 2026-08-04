"use client";

import {
  adminSegmentedControlClass,
  adminSegmentedItemActiveClass,
  adminSegmentedItemClass,
} from "@/shared/design-system/shell/tokens";
import {
  CUSTOMERS_HUB_TAB_IDS,
  CUSTOMERS_HUB_TAB_LABELS,
  type CustomersHubTabId,
} from "@/shared/lib/customers/customers-hub";

type CustomersHubTabsProps = {
  activeTab: CustomersHubTabId;
  onTabChange: (tab: CustomersHubTabId) => void;
};

export function CustomersHubTabs({
  activeTab,
  onTabChange,
}: CustomersHubTabsProps) {
  return (
    <div
      className={`${adminSegmentedControlClass} w-full sm:w-auto`}
      role="tablist"
      aria-label="Customers views"
    >
      {CUSTOMERS_HUB_TAB_IDS.map((tabId) => {
        const isActive = activeTab === tabId;

        return (
          <button
            key={tabId}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tabId)}
            className={`${adminSegmentedItemClass} sm:px-3 sm:py-1.5 ${
              isActive ? adminSegmentedItemActiveClass : ""
            }`}
          >
            {CUSTOMERS_HUB_TAB_LABELS[tabId]}
          </button>
        );
      })}
    </div>
  );
}
