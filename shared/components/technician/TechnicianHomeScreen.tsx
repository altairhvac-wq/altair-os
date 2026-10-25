import Link from "next/link";
import { ChevronRight, Clock, MapPin } from "lucide-react";
import { PwaInstallBanner } from "@/shared/components/pwa/PwaInstallBanner";
import type { DispatchJobStatus } from "@/shared/types/dispatch";
import { TechnicianJobStatusBadge } from "./TechnicianJobStatusBadge";

/**
 * Technician home — today at a glance over the dark graphite wallpaper.
 *
 * Two glass widgets (Today / Time clock), then the next job as a tappable
 * card when one exists. Every number and name shown is real data passed from
 * the server page — no fabricated stats.
 *
 * Phone audit 2026-10-24: the four-icon app grid that used to sit under the
 * widgets was removed. The bottom tab bar now lists exactly those
 * destinations (Schedule was added to it), so the grid was a third copy of
 * the same menu. The space went to the next job instead, which is what a
 * technician opens the app to find.
 */

export type TechnicianHomeNextJob = {
  id: string;
  customerName: string;
  jobType: string;
  timeLabel: string;
  /** Formatted street address, or null when the job has no usable address. */
  addressLine: string | null;
  status: DispatchJobStatus;
};

type TechnicianHomeScreenProps = {
  greeting: string;
  weekdayLabel: string;
  monthLabel: string;
  dayOfMonth: number;
  openJobCount: number;
  completedTodayCount: number;
  nextJob: TechnicianHomeNextJob | null;
  timeStateLabel: string;
  timeStateDotClass: string;
  clockedSinceLabel: string | null;
};

export function TechnicianHomeScreen({
  greeting,
  weekdayLabel,
  monthLabel,
  dayOfMonth,
  openJobCount,
  completedTodayCount,
  nextJob,
  timeStateLabel,
  timeStateDotClass,
  clockedSinceLabel,
}: TechnicianHomeScreenProps) {
  const openJobsLine =
    openJobCount === 0 && completedTodayCount === 0
      ? "Nothing scheduled"
      : `${openJobCount} open job${openJobCount === 1 ? "" : "s"}${
          completedTodayCount > 0
            ? ` · ${completedTodayCount} done`
            : ""
        }`;

  return (
    <div className="-mx-4 -mt-4 -mb-[max(6rem,calc(5.5rem+env(safe-area-inset-bottom,0px)))] min-h-[calc(100dvh-3.5rem)] bg-[radial-gradient(130%_90%_at_50%_-15%,#333631_0%,#1c1e1b_48%,#0a0a09_100%)] px-5 pb-[max(8rem,calc(7rem+env(safe-area-inset-bottom,0px)))] pt-6 sm:-mx-5 sm:-mt-5">
      {/* Greeting */}
      <header className="px-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c2a05a]">
          {weekdayLabel}, {monthLabel} {dayOfMonth}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          {greeting}
        </h1>
      </header>

      {/* Install nudge (client-only; hides itself once installed/dismissed) */}
      <PwaInstallBanner />

      {/* Widgets */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link
          href="/technician/schedule"
          className="group flex min-h-[9.5rem] touch-manipulation flex-col rounded-[1.5rem] bg-white/[0.07] p-4 ring-1 ring-inset ring-white/10 transition-colors active:bg-white/[0.12]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c2a05a]">
            Today
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums leading-none text-white">
            {dayOfMonth}
          </p>
          <div className="mt-auto space-y-0.5 pt-3">
            <p className="text-[13px] font-semibold text-[#e9e8e4]">
              {openJobsLine}
            </p>
            <p className="text-xs text-[#9b9fa6]">
              {openJobCount > 0 ? "Open schedule" : "Tap to see the week"}
            </p>
          </div>
        </Link>

        <Link
          href="/tech/time"
          className="group flex min-h-[9.5rem] touch-manipulation flex-col rounded-[1.5rem] bg-white/[0.07] p-4 ring-1 ring-inset ring-white/10 transition-colors active:bg-white/[0.12]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c2a05a]">
            Time clock
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${timeStateDotClass}`}
              aria-hidden
            />
            <p className="text-lg font-bold leading-tight text-white">
              {timeStateLabel}
            </p>
          </div>
          <div className="mt-auto pt-3">
            <p className="text-xs text-[#9b9fa6]">
              {clockedSinceLabel
                ? `Since ${clockedSinceLabel}`
                : "Tap to open the time clock"}
            </p>
          </div>
        </Link>
      </div>

      {/* Next job */}
      {nextJob ? (
        <section className="mt-6" aria-label="Next job">
          <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c2a05a]">
            Next up
          </p>
          <Link
            href={`/technician/schedule?jobId=${encodeURIComponent(nextJob.id)}`}
            className="mt-2 flex touch-manipulation items-center gap-3 rounded-[1.5rem] bg-white p-4 shadow-[0_12px_32px_-12px_rgb(0_0_0_/_0.6)] ring-1 ring-inset ring-white/60 transition-transform active:scale-[0.99]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-lg font-bold leading-tight text-slate-900">
                  {nextJob.customerName}
                </p>
                <TechnicianJobStatusBadge
                  status={nextJob.status}
                  className="shrink-0 text-[10px]"
                />
              </div>
              <p className="mt-0.5 truncate text-sm font-medium text-slate-600">
                {nextJob.jobType}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-700">
                <Clock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <span className="font-semibold tabular-nums">
                  {nextJob.timeLabel}
                </span>
              </p>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                  aria-hidden
                />
                <span className="min-w-0 break-words">
                  {nextJob.addressLine ?? "No address — contact dispatch"}
                </span>
              </p>
            </div>
            <ChevronRight
              className="h-6 w-6 shrink-0 text-slate-300"
              aria-hidden
            />
          </Link>
        </section>
      ) : null}
    </div>
  );
}
