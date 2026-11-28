import Link from "next/link";
import type { MonthlyTargetProgress } from "@/shared/lib/business-numbers/job-profit";
import { formatCount, formatDollarsShort } from "@/shared/lib/business-numbers/format";

/**
 * The month's finished jobs against the number that covers the shop's costs
 * (Settings > Numbers, "Your monthly target"). Owner and admin only: the
 * target comes from the shop's costs.
 *
 * It counts the same finished jobs the dashboard's performance chart counts,
 * so the two can never disagree. It is a count of jobs, not of money: the
 * target is how many AVERAGE jobs cover the shop, and the wording says so
 * rather than claiming the costs are paid. Server component: no state, no
 * clock.
 */

type MonthlyTargetCardProps = {
  readonly progress: MonthlyTargetProgress;
  /** The month the count is for, in words ("November"). */
  readonly monthName: string;
  /** The shop costs the target covers, when the company has entered them. */
  readonly monthlyOverhead: number | null;
  readonly className?: string;
};

export function MonthlyTargetCard({ progress, monthName, monthlyOverhead, className = "" }: MonthlyTargetCardProps) {
  const costs = monthlyOverhead !== null ? `${formatDollarsShort(monthlyOverhead)} of shop costs` : "the shop's costs";
  return (
    <section aria-label="Monthly target" className={`rounded-2xl border border-altair-border bg-altair-paper p-4 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-altair-ink-on-paper-muted">{monthName} against your target</h2>
        <Link href="/settings/business-numbers#target" className="text-xs font-semibold text-[var(--brand-metal-text)] underline-offset-2 hover:underline">
          Change target
        </Link>
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight text-altair-ink-on-paper">
        {formatCount(progress.done)} of {formatCount(progress.target)} jobs
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.target}
        aria-valuenow={Math.min(progress.done, progress.target)}
        aria-label={`${formatCount(progress.done)} of ${formatCount(progress.target)} jobs finished in ${monthName}`}
        className="mt-2 h-2 overflow-hidden rounded-full bg-altair-border-strong/40"
      >
        <div className="h-full rounded-full bg-altair-brass" style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-altair-ink-on-paper-secondary">
        {progress.met
          ? `You have finished the number of jobs that covers ${costs} at your average job. Past this, an average job is profit.`
          : `${formatCount(progress.remaining)} more ${progress.remaining === 1 ? "job" : "jobs"} at your average ${progress.remaining === 1 ? "reaches" : "reach"} the number that covers ${costs}.`}
      </p>
    </section>
  );
}
