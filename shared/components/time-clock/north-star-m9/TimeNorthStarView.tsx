"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertCircle, Clock, FileText } from "lucide-react";
import { JobContextFilterBanner } from "@/shared/components/layout/JobContextFilterBanner";
import {
  MasterContentStack,
  MasterPageHeader,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import type { TimeEntry } from "@/shared/types/time-entry";
import {
  TimeNorthStarActiveTechnicianCard,
  TimeNorthStarEntriesList,
} from "./TimeNorthStarEntriesList";
import { TimeNorthStarReviewQueueHeading } from "./TimeNorthStarReviewQueueHeading";

export type TimeNorthStarViewProps = {
  entries: TimeEntry[];
  activeEntries: TimeEntry[];
  canViewAll: boolean;
  initialJobId?: string;
  initialJobLabel?: string;
};

function matchesJobFilter(entry: TimeEntry, jobId?: string): boolean {
  return !jobId || entry.jobId === jobId;
}

export function TimeNorthStarView({
  entries,
  activeEntries,
  canViewAll,
  initialJobId,
  initialJobLabel,
}: TimeNorthStarViewProps) {
  const [technicianFilter, setTechnicianFilter] = useState<string>("all");

  const technicians = useMemo(() => {
    const scopedEntries = initialJobId
      ? entries.filter((entry) => matchesJobFilter(entry, initialJobId))
      : entries;
    const names = new Set(scopedEntries.map((entry) => entry.technicianName));
    return Array.from(names).sort();
  }, [entries, initialJobId]);

  const filteredActiveEntries = useMemo(() => {
    return activeEntries.filter(
      (entry) =>
        matchesJobFilter(entry, initialJobId) &&
        (technicianFilter === "all" ||
          entry.technicianName === technicianFilter),
    );
  }, [activeEntries, initialJobId, technicianFilter]);

  const filteredEntries = useMemo(() => {
    return entries.filter(
      (entry) =>
        matchesJobFilter(entry, initialJobId) &&
        (technicianFilter === "all" ||
          entry.technicianName === technicianFilter),
    );
  }, [entries, initialJobId, technicianFilter]);

  if (!canViewAll) {
    return (
      <MasterShellPage density="compact" className={lt.pageCanvas}>
        <MasterPageHeader
          eyebrow="Labor control"
          title="Time & labor review"
          subtitle="Canonical shift, break, and job-labor entries for payroll accuracy."
          density="compact"
          surfaceVariant="northStar"
          className={`north-star-time-page-header ${lt.pageHeader}`}
          eyebrowClassName={lt.pageHeaderEyebrow}
          titleClassName={lt.pageHeaderTitle}
          subtitleClassName={lt.pageHeaderSubtitle}
        />
        <MasterContentStack
          density="compact"
          className="time-north-star-brief min-w-0 px-3 sm:px-3.5 lg:px-5"
        >
          <div className="flex items-start gap-3 rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-4 py-3.5 text-sm text-[#4F4638]">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-[#8A6324]"
              aria-hidden="true"
            />
            You do not have permission to view company time entries.
          </div>
        </MasterContentStack>
      </MasterShellPage>
    );
  }

  const activeEmptyMessage = initialJobId
    ? "No active labor entries for this job."
    : "No technicians are currently on the clock.";

  const entriesEmptyMessage = initialJobId
    ? "No time entries for this job yet."
    : "No time entries yet.";

  return (
    <MasterShellPage density="compact" className={lt.pageCanvas}>
      <MasterPageHeader
        eyebrow="Labor control"
        title="Time & labor review"
        subtitle="Canonical shift, break, and job-labor entries for payroll accuracy."
        density="compact"
        surfaceVariant="northStar"
        className={`north-star-time-page-header ${lt.pageHeader}`}
        eyebrowClassName={lt.pageHeaderEyebrow}
        titleClassName={lt.pageHeaderTitle}
        subtitleClassName={lt.pageHeaderSubtitle}
        primaryAction={
          <Link
            href="/reports"
            className={`north-star-time-primary-action ${lt.primaryAction} justify-center sm:justify-start`}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Payroll review
          </Link>
        }
        secondaryAction={
          <Link
            href="/time-clock"
            className={`north-star-time-secondary-action ${lt.secondaryAction} justify-center sm:justify-start`}
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            Shift exceptions
          </Link>
        }
      />

      <MasterContentStack
        density="compact"
        className="time-north-star-brief min-w-0 space-y-3 px-3 sm:space-y-3.5 sm:px-3.5 lg:px-5"
      >
        {initialJobId && initialJobLabel ? (
          <JobContextFilterBanner
            jobLabel={initialJobLabel}
            clearHref="/time"
          />
        ) : null}

        <section className="north-star-list-surface rounded-[1.25rem]">
          <div className="shrink-0 border-b border-[rgba(138,99,36,0.12)] px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A6324]">
              Live labor
            </p>
            <h2 className="mt-0.5 text-sm font-bold text-[#17130E]">
              Active technicians
            </h2>
            <p className="mt-0.5 text-[11px] leading-snug text-[#6B6255]">
              Technicians currently clocked in, on break, or working a job.
            </p>
          </div>

          <div className="px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
            {filteredActiveEntries.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-4 py-6 text-center text-sm text-[#6B6255]">
                {activeEmptyMessage}
              </p>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredActiveEntries.map((entry) => (
                  <TimeNorthStarActiveTechnicianCard
                    key={entry.id}
                    entry={entry}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="north-star-list-surface overflow-hidden rounded-[1.25rem]">
          <TimeNorthStarReviewQueueHeading
            entryCount={filteredEntries.length}
            jobLabel={initialJobLabel}
          />

          <div className={`time-north-star-filter-bar ${lt.filterBar} shrink-0`}>
            <label className="flex flex-col gap-1.5 text-sm text-[#4F4638] sm:flex-row sm:items-center sm:gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B6255]">
                Technician
              </span>
              <select
                value={technicianFilter}
                onChange={(event) => setTechnicianFilter(event.target.value)}
                className={`${lt.filterSelect} sm:min-w-[12rem]`}
              >
                <option value="all">All technicians</option>
                {technicians.map((technician) => (
                  <option key={technician} value={technician}>
                    {technician}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filteredEntries.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#6B6255] sm:px-5">
              {entriesEmptyMessage}
            </p>
          ) : (
            <div className="px-3 pb-3 sm:px-4 sm:pb-4 lg:px-5 lg:pb-5">
              <TimeNorthStarEntriesList
                entries={filteredEntries}
                highlightJobId={initialJobId}
              />
            </div>
          )}
        </section>
      </MasterContentStack>
    </MasterShellPage>
  );
}
