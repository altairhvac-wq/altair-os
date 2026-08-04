import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ScheduleMonthGrid } from "@/shared/components/schedule/ScheduleMonthGrid";
import { ScheduleViewTabs } from "@/shared/components/schedule/ScheduleViewTabs";
import { ScheduleWeekStrip } from "@/shared/components/schedule/ScheduleWeekStrip";
import { dispatchMissionClasses as dm } from "@/shared/components/dispatch/dispatch-board-presentation";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { formatDateInTimeZone } from "@/shared/lib/datetime";
import type {
  ScheduleMonthDaySummary,
  ScheduleMonthNavigation,
} from "@/shared/lib/schedule-month";
import type {
  ScheduleWeekDaySummary,
  ScheduleWeekNavigation,
} from "@/shared/lib/schedule-week";
import type { ScheduleViewMode } from "@/shared/lib/schedule-view";

type SchedulePageViewProps =
  | {
      view: "week";
      days: ScheduleWeekDaySummary[];
      navigation: ScheduleWeekNavigation;
      timeZone: string;
    }
  | {
      view: "month";
      days: ScheduleMonthDaySummary[];
      navigation: ScheduleMonthNavigation;
      timeZone: string;
    };

function formatWeekRangeLabel(
  weekStartDateOnly: string,
  weekEndDateOnly: string,
  timeZone: string,
): string {
  const start = formatDateInTimeZone(weekStartDateOnly, timeZone, {
    month: "short",
    day: "numeric",
  });
  const end = formatDateInTimeZone(weekEndDateOnly, timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${start} – ${end}`;
}

function formatMonthLabel(monthStartDateOnly: string, timeZone: string): string {
  return formatDateInTimeZone(monthStartDateOnly, timeZone, {
    month: "long",
    year: "numeric",
  });
}

function scheduleHref(view: ScheduleViewMode, dateOnly: string): string {
  return view === "month"
    ? `/schedule?view=month&date=${dateOnly}`
    : `/schedule?date=${dateOnly}`;
}

export function SchedulePageView(props: SchedulePageViewProps) {
  const { view, days, navigation, timeZone } = props;

  const rangeLabel =
    view === "week"
      ? formatWeekRangeLabel(
          navigation.weekStartDateOnly,
          navigation.weekEndDateOnly,
          timeZone,
        )
      : formatMonthLabel(navigation.monthStartDateOnly, timeZone);

  const prevHref = scheduleHref(
    view,
    view === "week"
      ? navigation.prevWeekDateOnly
      : navigation.prevMonthDateOnly,
  );
  const nextHref = scheduleHref(
    view,
    view === "week"
      ? navigation.nextWeekDateOnly
      : navigation.nextMonthDateOnly,
  );
  const prevLabel = view === "week" ? "Previous week" : "Previous month";
  const nextLabel = view === "week" ? "Next week" : "Next month";
  const subtitle =
    view === "week"
      ? "Week overview · open a day on the dispatch board"
      : "Month overview · open a day on the dispatch board";

  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="wide">
        <div className={`${dm.pageCanvas} p-2 sm:p-3`}>
          <MasterContentStack density="compact">
            <div className={dm.boardSurface}>
              <div className={dm.boardHeader}>
                <div className="min-w-0">
                  <h1 className={dm.boardHeaderTitle}>Schedule</h1>
                  <p className={dm.boardHeaderSubtitle}>{subtitle}</p>
                </div>

                <div className="flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:gap-2">
                  <ScheduleViewTabs
                    activeView={view}
                    dateOnly={navigation.referenceDateOnly}
                  />
                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <Link
                      href={prevHref}
                      aria-label={prevLabel}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-altair-border bg-white/[0.04] text-altair-paper transition-colors hover:border-altair-border-strong hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                    </Link>
                    <p className="min-w-[9.5rem] text-center text-xs font-semibold tabular-nums text-altair-paper sm:min-w-[11rem] sm:text-sm">
                      {rangeLabel}
                    </p>
                    <Link
                      href={nextHref}
                      aria-label={nextLabel}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-altair-border bg-white/[0.04] text-altair-paper transition-colors hover:border-altair-border-strong hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>

              <div className={`${dm.boardBody} overflow-y-auto`}>
                {view === "week" ? (
                  <ScheduleWeekStrip days={days} />
                ) : (
                  <ScheduleMonthGrid days={days} />
                )}
              </div>
            </div>
          </MasterContentStack>
        </div>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
