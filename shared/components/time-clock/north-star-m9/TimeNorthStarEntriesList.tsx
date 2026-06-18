"use client";

import {
  formatDateTime,
  formatDurationMinutes,
  formatTechnicianTimeState,
  formatTimeEntryType,
  type TimeEntry,
} from "@/shared/types/time-entry";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import {
  getNorthStarEntryStatusStyles,
  getNorthStarTechnicianTimeStateStyles,
} from "./time-north-star-styles";

type TimeNorthStarEntriesListProps = {
  entries: TimeEntry[];
  highlightJobId?: string;
};

function resolveTechnicianState(entry: TimeEntry) {
  if (entry.entryType === "break") {
    return "on_break" as const;
  }
  if (entry.entryType === "job_labor") {
    return "working_job" as const;
  }
  return "clocked_in" as const;
}

function EntryStatusBadge({ entry }: { entry: TimeEntry }) {
  const isActive = !entry.endedAt;
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${getNorthStarEntryStatusStyles(isActive)}`}
    >
      {isActive ? "Active" : "Closed"}
    </span>
  );
}

function formatActivityLabel(entry: TimeEntry): string {
  const typeLabel = formatTimeEntryType(entry.entryType);
  return entry.jobNumber ? `${typeLabel} · Job ${entry.jobNumber}` : typeLabel;
}

function MobileEntryCard({
  entry,
  highlighted,
}: {
  entry: TimeEntry;
  highlighted: boolean;
}) {
  return (
    <article
      className={`time-north-star-mobile-entry rounded-xl border px-3.5 py-3.5 shadow-[0_2px_8px_rgba(3,7,12,0.06)] ${
        highlighted
          ? "border-[rgba(201,164,77,0.35)] bg-[rgba(201,164,77,0.08)] ring-1 ring-[rgba(201,164,77,0.18)]"
          : "border-[rgba(138,99,36,0.14)] bg-[#FBF7EF]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-[#17130E]">
            {entry.technicianName}
          </p>
          <p className="mt-1 text-sm font-medium text-[#4F4638]">
            {formatActivityLabel(entry)}
          </p>
        </div>
        <EntryStatusBadge entry={entry} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[rgba(138,99,36,0.10)] pt-2.5 text-xs">
        <div>
          <dt className="font-semibold uppercase tracking-[0.08em] text-[#6B6255]">
            Started
          </dt>
          <dd className="mt-0.5 font-medium text-[#4F4638]">
            {formatDateTime(entry.startedAt)}
          </dd>
        </div>
        <div>
          <dt className="font-semibold uppercase tracking-[0.08em] text-[#6B6255]">
            Duration
          </dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-[#17130E]">
            {entry.durationMinutes != null
              ? formatDurationMinutes(entry.durationMinutes)
              : "Active"}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function TimeNorthStarActiveTechnicianCard({ entry }: { entry: TimeEntry }) {
  const state = resolveTechnicianState(entry);

  return (
    <article className="time-north-star-active-card relative overflow-hidden rounded-[1rem] border border-[rgba(138,99,36,0.14)] bg-[#FBF7EF] px-3.5 py-3.5 shadow-[0_3px_12px_rgba(3,7,12,0.08)] sm:px-4 sm:py-4">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(201,164,77,0.35)] to-transparent"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-[#17130E]">
            {entry.technicianName}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B6255]">
            Current activity
          </p>
          <p className="mt-0.5 text-sm font-medium text-[#4F4638]">
            {formatActivityLabel(entry)}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${getNorthStarTechnicianTimeStateStyles(state)}`}
        >
          {formatTechnicianTimeState(state)}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[rgba(138,99,36,0.10)] pt-2.5">
        <p className="text-xs text-[#6B6255]">
          Started {formatDateTime(entry.startedAt)}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A6324]">
          On clock
        </p>
      </div>
    </article>
  );
}

export function TimeNorthStarEntriesList({
  entries,
  highlightJobId,
}: TimeNorthStarEntriesListProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <>
      <div className="time-north-star-mobile-list space-y-2.5 md:hidden">
        {entries.map((entry) => (
          <MobileEntryCard
            key={entry.id}
            entry={entry}
            highlighted={Boolean(
              highlightJobId && entry.jobId === highlightJobId,
            )}
          />
        ))}
      </div>

      <div className="time-north-star-ledger hidden overflow-x-auto md:block">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className={`${lt.tableHeaderCell} px-4 py-3 text-left`}>
                Technician
              </th>
              <th className={`${lt.tableHeaderCell} px-4 py-3 text-left`}>
                Type
              </th>
              <th className={`${lt.tableHeaderCell} px-4 py-3 text-left`}>
                Job
              </th>
              <th className={`${lt.tableHeaderCell} px-4 py-3 text-left`}>
                Started
              </th>
              <th className={`${lt.tableHeaderCell} px-4 py-3 text-left`}>
                Duration
              </th>
              <th className={`${lt.tableHeaderCell} px-4 py-3 text-left`}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const highlighted = Boolean(
                highlightJobId && entry.jobId === highlightJobId,
              );

              return (
                <tr
                  key={entry.id}
                  className={
                    highlighted
                      ? "time-north-star-row-selected"
                      : "time-north-star-row"
                  }
                >
                  <td className={`px-4 py-3.5 ${lt.tablePrimaryText}`}>
                    {entry.technicianName}
                  </td>
                  <td
                    className={`time-north-star-meta-cell px-4 py-3.5 text-sm ${lt.tableSecondaryText}`}
                  >
                    {formatTimeEntryType(entry.entryType)}
                  </td>
                  <td
                    className={`time-north-star-meta-cell px-4 py-3.5 text-sm ${lt.tableSecondaryText}`}
                  >
                    {entry.jobNumber ?? "—"}
                  </td>
                  <td
                    className={`time-north-star-meta-cell px-4 py-3.5 text-sm ${lt.tableDateText}`}
                  >
                    {formatDateTime(entry.startedAt)}
                  </td>
                  <td
                    className={`px-4 py-3.5 text-sm tabular-nums ${lt.tableMetricText}`}
                  >
                    {entry.durationMinutes != null
                      ? formatDurationMinutes(entry.durationMinutes)
                      : "Active"}
                  </td>
                  <td className="px-4 py-3.5">
                    <EntryStatusBadge entry={entry} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
