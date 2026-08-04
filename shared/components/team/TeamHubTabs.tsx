"use client";

import {
  adminSegmentedControlClass,
  adminSegmentedItemActiveClass,
  adminSegmentedItemClass,
} from "@/shared/design-system/shell/tokens";
import {
  TEAM_HUB_TAB_LABELS,
  type TeamHubTabId,
} from "@/shared/lib/team/team-hub";

type TeamHubTabsProps = {
  activeTab: TeamHubTabId;
  availableTabs: readonly TeamHubTabId[];
  onTabChange: (tab: TeamHubTabId) => void;
};

export function TeamHubTabs({
  activeTab,
  availableTabs,
  onTabChange,
}: TeamHubTabsProps) {
  if (availableTabs.length <= 1) {
    return null;
  }

  return (
    <div
      className={`${adminSegmentedControlClass} w-full sm:w-auto`}
      role="tablist"
      aria-label="Team views"
    >
      {availableTabs.map((tabId) => {
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
            {TEAM_HUB_TAB_LABELS[tabId]}
          </button>
        );
      })}
    </div>
  );
}
