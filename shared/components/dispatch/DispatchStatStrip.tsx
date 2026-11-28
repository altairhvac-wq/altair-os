"use client";

import type { DispatchBoardMetrics } from "@/shared/types/dispatch";
import { dispatchMissionClasses as dm } from "./dispatch-board-presentation";

type DispatchStatStripProps = {
  metrics: DispatchBoardMetrics;
};

/**
 * Compact inline Dispatch KPIs — sits opposite the board title in one row.
 * On Time excludes completed jobs missing arrived_at from the denominator.
 */
export function DispatchStatStrip({ metrics }: DispatchStatStripProps) {
  const onTimeLabel =
    metrics.onTimePercent === null ? "—" : `${metrics.onTimePercent}%`;
  const onTimeTitle =
    metrics.onTimeEligibleCount === 0
      ? "On time: no completed jobs with arrival time yet. Jobs without arrived_at are excluded, not counted late."
      : `On time: ${metrics.onTimeCount} of ${metrics.onTimeEligibleCount} completed with arrival · arrived_at ≤ scheduled_at. Jobs missing arrival time are excluded, not penalized.`;

  const stats = [
    {
      id: "jobs-today",
      label: "Jobs Today",
      value: String(metrics.jobsToday),
      title: "Non-cancelled jobs on today's operational board",
    },
    {
      // "On site", not "In progress" (UI audit 2026-11-12, B10): this counts
      // technicians who have arrived or are working. The Work page lists
      // "On site" and "In progress" separately, so the old label read 1 here
      // while Work read "In progress 0" for the same job.
      id: "in-progress",
      label: "On Site",
      value: String(metrics.inProgress),
      title: "Jobs where the technician has arrived or is working",
    },
    {
      id: "completed",
      label: "Completed",
      value: String(metrics.completed),
      title: "Jobs completed today",
    },
    {
      id: "on-time",
      label: "On Time",
      value: onTimeLabel,
      title: onTimeTitle,
    },
  ] as const;

  return (
    <dl className={dm.metricStrip}>
      {stats.map((stat) => (
        <div key={stat.id} className={dm.metricTile} title={stat.title}>
          <dt className={dm.metricLabel}>{stat.label}</dt>
          <dd className={`${dm.metricValue} m-0`}>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
