import Link from "next/link";
import { AlertTriangle, Clock3 } from "lucide-react";
import type { ReportTimeTrackingSummary } from "@/shared/types/reports-page";
import { formatDateTime } from "@/shared/types/time-entry";
import {
  altairReportCardClass,
  altairReportCardPadTier3Class,
  altairReportMetricLabelClass,
  altairReportMetricValueClass,
  reportIconChipClassName,
} from "@/shared/design-system/components";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type TimeTrackingSummaryCardProps = {
  summary: ReportTimeTrackingSummary;
  variant?: ReportSurfaceVariant;
};

export function TimeTrackingSummaryCard({
  summary,
  variant = "legacy",
}: TimeTrackingSummaryCardProps) {
  const northStar = isNorthStarReportSurface(variant);

  if (northStar) {
    return (
      <div className="min-w-0 space-y-3">
        <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
          <div
            className={`min-w-0 ${altairReportCardClass} ${altairReportCardPadTier3Class}`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={reportIconChipClassName("avgTicket")}
                aria-hidden="true"
              >
                <Clock3 className="h-3.5 w-3.5" />
              </span>
              <p className={altairReportMetricLabelClass}>Today</p>
            </div>
            <p className={`mt-2.5 ${altairReportMetricValueClass}`}>
              {summary.shiftHoursToday}h
            </p>
          </div>
          <div
            className={`min-w-0 ${altairReportCardClass} ${altairReportCardPadTier3Class}`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={reportIconChipClassName("jobs")}
                aria-hidden="true"
              >
                <Clock3 className="h-3.5 w-3.5" />
              </span>
              <p className={altairReportMetricLabelClass}>Open Shifts</p>
            </div>
            <p className={`mt-2.5 ${altairReportMetricValueClass}`}>
              {summary.openShiftCount}
            </p>
          </div>
        </div>

        {summary.staleOpenShifts.length > 0 ? (
          <div
            className={`${altairReportCardClass} border-altair-danger/40 bg-altair-danger/10 p-3.5`}
            role="alert"
          >
            {/* The icon measures 2.82:1 on this card and stays that way on
                purpose. It is `aria-hidden` and sits beside its own text label,
                so it is decorative under 1.4.11 — nothing is conveyed by it that
                the heading does not already say. Raising it to the 300 step
                would be applying a rule that does not govern this element. */}
            <div className="flex items-center gap-2 text-altair-danger">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="text-sm font-bold text-altair-paper">
                Long-running shifts needing review
              </p>
            </div>
            <p className="mt-1 text-xs text-rose-300/90">
              Open for 12 hours or longer. No records were changed.
            </p>
            <ul className="mt-3 space-y-2">
              {summary.staleOpenShifts.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap justify-between gap-2 text-sm text-altair-paper"
                >
                  <span className="font-semibold">{entry.technicianName}</span>
                  <span className="text-rose-300/90">
                    Since {formatDateTime(entry.startedAt)} · {entry.elapsedHours}
                    h
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className="altair-surface-card p-3.5 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-cyan-700" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">Shift time</h2>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Payroll shift clocks only. Job labor is allocation within shift time.
          </p>
        </div>
        <Link
          href="/team?tab=time-clock"
          className="text-sm font-semibold text-cyan-700 hover:text-cyan-800"
        >
          Review shifts
        </Link>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/80 p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Today
          </dt>
          <dd className="mt-1 text-xl font-bold tabular-nums text-slate-900">
            {summary.shiftHoursToday}h
          </dd>
        </div>
        <div className="rounded-xl bg-white/80 p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Open shifts
          </dt>
          <dd className="mt-1 text-xl font-bold tabular-nums text-slate-900">
            {summary.openShiftCount}
          </dd>
        </div>
      </dl>

      {summary.staleOpenShifts.length > 0 ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5">
          <div className="flex items-center gap-2 text-rose-900">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <p className="text-sm font-bold">
              Long-running shifts needing review
            </p>
          </div>
          <p className="mt-1 text-xs text-rose-700">
            Open for 12 hours or longer. No records were changed.
          </p>
          <ul className="mt-3 space-y-2">
            {summary.staleOpenShifts.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap justify-between gap-2 text-sm text-rose-900"
              >
                <span className="font-semibold">{entry.technicianName}</span>
                <span className="text-rose-700">
                  Since {formatDateTime(entry.startedAt)} · {entry.elapsedHours}h
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
