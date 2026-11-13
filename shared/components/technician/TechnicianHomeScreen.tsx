import Link from "next/link";
import { CalendarDays, ChevronRight, Clock, MapPin } from "lucide-react";
import type { DispatchJobStatus } from "@/shared/types/dispatch";
import { TechnicianJobStatusBadge } from "./TechnicianJobStatusBadge";

/**
 * Technician home: what is next, and the clock.
 *
 * A technician opens the app to find the next job, so that is the first
 * thing on the screen and the one primary action. Under it: where the day
 * stands, and the time clock.
 *
 * UI audit 2026-11-12: this screen used to be a dark launcher with a grid of
 * four buttons (Schedule, Time, Receipts, Alerts). The bottom tab bar lists
 * exactly those places, so the grid was a second copy of the navigation and
 * the bottom half of the screen was empty. The grid is gone. The screen is
 * also light now, like every other technician screen.
 *
 * Every number and name here is real data passed from the server page.
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

const CARD_CLASS =
  "rounded-2xl border border-altair-border/40 bg-altair-paper shadow-[var(--elev-hairline),var(--elev-2)]";
const EYEBROW_CLASS =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-altair-ink-on-paper-muted";

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
  const nothingToday = openJobCount === 0 && completedTodayCount === 0;
  const allDone = openJobCount === 0 && completedTodayCount > 0;

  return (
    <div className="space-y-4">
      <header>
        <p className={EYEBROW_CLASS}>
          {weekdayLabel}, {monthLabel} {dayOfMonth}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-altair-ink-on-paper">
          {greeting}
        </h1>
      </header>

      {/* Next job: the one primary action on this screen. */}
      <section aria-label="Next job">
        {nextJob ? (
          <Link
            href={`/technician/schedule?jobId=${encodeURIComponent(nextJob.id)}`}
            data-testid="tech-home-next-job"
            className={`${CARD_CLASS} block touch-manipulation p-4 transition-colors active:bg-altair-paper-subtle`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className={EYEBROW_CLASS}>Next job</p>
              <TechnicianJobStatusBadge status={nextJob.status} className="shrink-0" />
            </div>
            <p className="mt-2 break-words text-xl font-bold leading-tight tracking-tight text-altair-ink-on-paper">
              {nextJob.customerName}
            </p>
            <p className="mt-0.5 text-[15px] text-altair-ink-on-paper-secondary">
              {nextJob.jobType}
            </p>
            <dl className="mt-3 space-y-1.5 text-[15px] text-altair-ink-on-paper">
              <div className="flex items-center gap-2">
                <dt className="sr-only">Time</dt>
                <Clock className="h-4 w-4 shrink-0 text-altair-ink-on-paper-muted" aria-hidden />
                <dd className="font-semibold tabular-nums">{nextJob.timeLabel}</dd>
              </div>
              <div className="flex items-start gap-2">
                <dt className="sr-only">Address</dt>
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-altair-ink-on-paper-muted" aria-hidden />
                <dd className="min-w-0 break-words">
                  {nextJob.addressLine ?? "No address on this job. Check with dispatch."}
                </dd>
              </div>
            </dl>
            <span className="mt-4 flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-[var(--chrome-elevated)] px-4 text-[15px] font-semibold text-white">
              Open job
              <ChevronRight className="h-4 w-4" aria-hidden />
            </span>
          </Link>
        ) : (
          <div className={`${CARD_CLASS} p-4`}>
            <p className={EYEBROW_CLASS}>Next job</p>
            <p className="mt-2 text-lg font-bold tracking-tight text-altair-ink-on-paper">
              {allDone ? "All done for today" : "Nothing scheduled today"}
            </p>
            <p className="mt-1 text-[15px] text-altair-ink-on-paper-secondary">
              {allDone
                ? `You finished ${completedTodayCount} ${completedTodayCount === 1 ? "job" : "jobs"} today.`
                : "No jobs are assigned to you today. The week is on the Schedule tab."}
            </p>
          </div>
        )}
      </section>

      {/* Where the day stands, and the clock. Each opens its own tab. */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/technician/schedule"
          className={`${CARD_CLASS} flex min-h-[7.5rem] touch-manipulation flex-col p-4 transition-colors active:bg-altair-paper-subtle`}
        >
          <p className={`${EYEBROW_CLASS} flex items-center gap-1.5`}>
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            Today
          </p>
          {nothingToday ? (
            <p className="mt-2 text-[15px] font-semibold text-altair-ink-on-paper">
              No jobs
            </p>
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold tabular-nums leading-none text-altair-ink-on-paper">
                {openJobCount}
              </p>
              <p className="mt-1 text-[13px] text-altair-ink-on-paper-secondary">
                {openJobCount === 1 ? "job left" : "jobs left"}
                {completedTodayCount > 0 ? ` · ${completedTodayCount} done` : ""}
              </p>
            </>
          )}
        </Link>

        <Link
          href="/tech/time"
          className={`${CARD_CLASS} flex min-h-[7.5rem] touch-manipulation flex-col p-4 transition-colors active:bg-altair-paper-subtle`}
        >
          <p className={`${EYEBROW_CLASS} flex items-center gap-1.5`}>
            <Clock className="h-3.5 w-3.5" aria-hidden />
            Time clock
          </p>
          <p className="mt-2 flex items-center gap-2 text-[17px] font-bold leading-tight text-altair-ink-on-paper">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${timeStateDotClass}`} aria-hidden />
            {timeStateLabel}
          </p>
          <p className="mt-1 text-[13px] text-altair-ink-on-paper-secondary">
            {clockedSinceLabel ? `Since ${clockedSinceLabel}` : "Open the time clock"}
          </p>
        </Link>
      </div>
    </div>
  );
}
