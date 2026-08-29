"use client";

import type { JobsGlanceStat } from "@/shared/lib/jobs/jobs-glance-stats";
import type { JobStatus } from "@/shared/types/job";
import { JobsViewTabs, type TodayAllViewTab } from "./JobsViewTabs";

type JobsStatStripProps = {
  stats: JobsGlanceStat[];
  activeStatus?: JobStatus | "all";
  onFilterStatus?: (status: JobStatus | "all") => void;
  viewTab: TodayAllViewTab;
  onViewTabChange: (tab: TodayAllViewTab) => void;
  todayCount: number;
  allCount: number;
};

/**
 * Consolidated Jobs header row: Today/All view toggle + status glance pills.
 * Label + number only — same pill pattern as CustomersStatStrip / LeadsStatStrip.
 * Status counts are scoped to the active view; Today/All counts remain view totals.
 */
export function JobsStatStrip({
  stats,
  activeStatus = "all",
  onFilterStatus,
  viewTab,
  onViewTabChange,
  todayCount,
  allCount,
}: JobsStatStripProps) {
  return (
    <div className="flex max-w-full flex-nowrap items-center justify-start gap-x-2 overflow-x-auto sm:justify-center sm:gap-x-3">
      <div className="shrink-0" title="View totals (active jobs)">
        <JobsViewTabs
          activeTab={viewTab}
          onTabChange={onViewTabChange}
          todayCount={todayCount}
          allCount={allCount}
        />
      </div>

      <div
        className="hidden h-5 w-px shrink-0 bg-altair-border/80 sm:block"
        aria-hidden="true"
      />

      <dl
        className="flex max-w-full flex-nowrap items-baseline gap-x-1.5 sm:gap-x-2"
        title="Status counts within the current view"
      >
        {stats.map((stat) => {
          const filterStatus = stat.filterStatus;
          const isInteractive = Boolean(filterStatus && onFilterStatus);
          const isActive = Boolean(
            filterStatus && filterStatus === activeStatus,
          );

          const labelClass =
            "whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em]";
          const valueClass = "text-sm font-bold tabular-nums";

          if (isInteractive && filterStatus && onFilterStatus) {
            return (
              <div key={stat.id} className="min-w-0 shrink-0">
                <dt className="sr-only">{stat.label}</dt>
                <dd className="m-0">
                  <button
                    type="button"
                    onClick={() =>
                      onFilterStatus(isActive ? "all" : filterStatus)
                    }
                    aria-label={`${stat.label}: ${stat.value}. Filter jobs in this view.`}
                    aria-pressed={isActive}
                    title={stat.detail}
                    className={`inline-flex items-baseline gap-1 rounded-md px-1.5 py-0.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent ${
                      isActive
                        ? "bg-altair-paper-elevated text-altair-ink-on-paper shadow-sm ring-1 ring-altair-ink-on-paper/30"
                        : "bg-altair-ink-on-paper/[0.03] text-altair-ink-on-paper-muted ring-1 ring-altair-border/70 hover:bg-altair-ink-on-paper/5 hover:text-altair-ink-on-paper hover:ring-altair-border-strong"
                    }`}
                  >
                    <span
                      className={`${labelClass} ${
                        isActive
                          ? "text-altair-ink-on-paper"
                          : "text-altair-ink-on-paper-muted"
                      }`}
                      aria-hidden="true"
                    >
                      {stat.label}
                    </span>
                    <span
                      className={`${valueClass} ${
                        isActive
                          ? "text-altair-ink-on-paper"
                          : "text-altair-ink-on-paper-secondary"
                      }`}
                      aria-hidden="true"
                    >
                      {stat.value}
                    </span>
                  </button>
                </dd>
              </div>
            );
          }

          return (
            <div
              key={stat.id}
              className="flex min-w-0 shrink-0 items-baseline gap-1"
              title={stat.detail}
            >
              <dt className={`${labelClass} text-altair-ink-on-paper-muted`}>
                {stat.label}
              </dt>
              <dd className={`${valueClass} m-0 text-altair-ink-on-paper`}>
                {stat.value}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
