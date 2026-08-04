import Link from "next/link";
import {
  adminSegmentedControlClass,
  adminSegmentedItemActiveClass,
  adminSegmentedItemClass,
} from "@/shared/design-system/shell/tokens";
import type { ScheduleViewMode } from "@/shared/lib/schedule-view";

type ScheduleViewTabsProps = {
  activeView: ScheduleViewMode;
  dateOnly: string;
};

const TABS: { id: ScheduleViewMode; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

/** Server-friendly Week/Month toggle — same segmented pattern as Jobs Today/All. */
export function ScheduleViewTabs({
  activeView,
  dateOnly,
}: ScheduleViewTabsProps) {
  return (
    <div
      className={`${adminSegmentedControlClass} w-full shrink-0 sm:w-auto`}
      role="tablist"
      aria-label="Schedule views"
    >
      {TABS.map((tab) => {
        const isActive = activeView === tab.id;
        const href =
          tab.id === "week"
            ? `/schedule?date=${dateOnly}`
            : `/schedule?view=month&date=${dateOnly}`;

        return (
          <Link
            key={tab.id}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={`${adminSegmentedItemClass} inline-flex items-center justify-center sm:px-3 sm:py-1.5 ${
              isActive ? adminSegmentedItemActiveClass : ""
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
