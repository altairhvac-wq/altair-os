import Link from "next/link";
import { AlertTriangle, Clock3 } from "lucide-react";
import type { ReportTimeTrackingSummary } from "@/shared/types/reports-page";
import { formatDateTime } from "@/shared/types/time-entry";

type TimeTrackingSummaryCardProps = {
  summary: ReportTimeTrackingSummary;
  variant?: "default" | "northStar";
};

export function TimeTrackingSummaryCard({
  summary,
  variant = "default",
}: TimeTrackingSummaryCardProps) {
  const northStar = variant === "northStar";

  return (
    <section
      className={
        northStar
          ? "rounded-[1.25rem] border border-[rgba(138,99,36,0.14)] bg-[#FBF7EF] p-4 shadow-[0_3px_12px_rgba(3,7,12,0.06)] sm:p-5"
          : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      }
    >
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
        <Link href="/time-clock" className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">
          Review shifts
        </Link>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/80 p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Today</dt>
          <dd className="mt-1 text-xl font-bold tabular-nums text-slate-900">{summary.shiftHoursToday}h</dd>
        </div>
        <div className="rounded-xl bg-white/80 p-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open shifts</dt>
          <dd className="mt-1 text-xl font-bold tabular-nums text-slate-900">{summary.openShiftCount}</dd>
        </div>
      </dl>

      {summary.staleOpenShifts.length > 0 ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5">
          <div className="flex items-center gap-2 text-rose-900">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <p className="text-sm font-bold">Long-running shifts needing review</p>
          </div>
          <p className="mt-1 text-xs text-rose-700">Open for 12 hours or longer. No records were changed.</p>
          <ul className="mt-3 space-y-2">
            {summary.staleOpenShifts.map((entry) => (
              <li key={entry.id} className="flex flex-wrap justify-between gap-2 text-sm text-rose-900">
                <span className="font-semibold">{entry.technicianName}</span>
                <span className="text-rose-700">Since {formatDateTime(entry.startedAt)} · {entry.elapsedHours}h</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
