"use client";

import { useEffect, useMemo, useState } from "react";
import type { Job } from "@/shared/types/job";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import { SearchMatchReason } from "@/shared/components/search/SearchMatchReason";
import {
  altairMcListClass,
  altairMcListRowClass,
} from "@/shared/design-system/components/mc-surface";
import {
  buildJobsTodayScheduleItems,
  jobToScheduleRowModel,
} from "@/shared/lib/jobs-today-schedule";
import { JobScheduleRow } from "./JobScheduleRow";

type JobsTodayCardListProps = {
  jobs: Job[];
  onSelect: (job: Job) => void;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (jobId: string) => void;
  /** @deprecated Mission Control unifies presentation; retained for call-site compatibility. */
  northStar?: boolean;
  /** @deprecated Cues dropped for schedule density; retained for call-site compatibility. */
  billingSummaries?: unknown;
  matchReasons?: Record<string, string>;
  timeZone?: string;
};

function NowMarker({ timeLabel }: { timeLabel: string }) {
  return (
    <div
      className={`${altairMcListRowClass} flex items-center gap-3 py-2`}
      aria-label={`Current time ${timeLabel}`}
    >
      <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-altair-brass sm:w-[4.5rem]">
        Now
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="h-px flex-1 bg-altair-brass/45" />
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-altair-brass">
          {timeLabel}
        </span>
        <span className="h-px flex-1 bg-altair-brass/45" />
      </div>
    </div>
  );
}

function GapMarker({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-3 px-3.5 py-1.5"
      aria-label={`Schedule gap: ${label}`}
    >
      <span className="w-16 shrink-0 sm:w-[4.5rem]" aria-hidden />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="h-px flex-1 border-t border-dashed border-altair-border" />
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.12em] text-altair-ink-on-paper-muted">
          {label}
        </span>
        <span className="h-px flex-1 border-t border-dashed border-altair-border" />
      </div>
    </div>
  );
}

export function JobsTodayCardList({
  jobs,
  onSelect,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
  matchReasons,
  timeZone,
}: JobsTodayCardListProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const scheduleItems = useMemo(() => {
    // Keep search ranking when match reasons are present; otherwise day order.
    const hasSearchRanking =
      Boolean(matchReasons) && Object.keys(matchReasons!).length > 0;

    return buildJobsTodayScheduleItems(jobs, {
      now,
      timeZone,
      preserveOrder: hasSearchRanking,
    });
  }, [jobs, matchReasons, now, timeZone]);

  return (
    <div className={altairMcListClass}>
      <ul className="divide-y divide-altair-border/60">
        {scheduleItems.map((item, index) => {
          if (item.kind === "now") {
            return (
              <li key="schedule-now">
                <NowMarker timeLabel={item.timeLabel} />
              </li>
            );
          }

          if (item.kind === "gap") {
            return (
              <li key={`gap-${index}-${item.label}`}>
                <GapMarker label={item.label} />
              </li>
            );
          }

          const { job } = item;
          const isSelected = selectedIds?.has(job.id) ?? false;
          const baseRow = jobToScheduleRowModel(job, { timeZone });
          const serviceAddress = job.serviceAddress?.trim() ?? "";

          return (
            <li key={job.id} className="min-w-0 max-w-full">
              <JobScheduleRow
                row={{
                  ...baseRow,
                  address: (
                    <>
                      <DemoDisplayName>{job.customerName}</DemoDisplayName>
                      {serviceAddress ? ` · ${serviceAddress}` : null}
                    </>
                  ),
                }}
                selected={isSelected}
                onSelect={() => onSelect(job)}
                ariaLabel={`Open job ${job.jobNumber} for ${job.customerName}`}
                leading={
                  selectionEnabled ? (
                    <div className="flex shrink-0 items-center pl-2">
                      <label
                        className="flex min-h-11 min-w-10 items-center justify-center"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <BulkSelectCheckbox
                          checked={isSelected}
                          ariaLabel={`Select job ${job.jobNumber}`}
                          onChange={() => onToggleSelection?.(job.id)}
                        />
                      </label>
                    </div>
                  ) : undefined
                }
                titleAccessory={
                  matchReasons?.[job.id] ? (
                    <SearchMatchReason
                      reason={matchReasons[job.id]}
                      className="mt-0.5 text-xs text-altair-ink-on-paper-muted"
                    />
                  ) : undefined
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
