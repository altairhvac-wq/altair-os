import Link from "next/link";
import { formatCurrency } from "@/shared/types/customer";
import type { DashboardData } from "@/shared/types/dashboard";

/**
 * Today — the operating state of the business, above the exception board.
 *
 * The dashboard answered "what is broken?" and nothing else. An owner opening
 * it could not see how many jobs were on today's board, what had been
 * collected, or what was outstanding, even though `DashboardData` already
 * carries all of it — the desktop surface simply never rendered it, while the
 * mobile home did. This closes that gap without inventing a single number.
 *
 * Every value here is read straight from the live snapshot. There is no sample
 * fallback on purpose: fabricated money on an owner's dashboard is worse than
 * an absent strip, so when there is no data the strip does not render.
 *
 * Presentation rules that matter:
 * - Semantic colour is earned, not decorative. Overdue is only danger-toned
 *   when something is actually overdue; at zero it reads as calm neutral.
 * - It is one band with hairline dividers rather than four cards, so the
 *   exception board below stays the heaviest thing on the page.
 */
type TodayStripProps = {
  data: DashboardData;
};

/** Bar sparkline for the 7-day collections series. Pure CSS, no chart library. */
function CollectionsSpark({ series }: { series: { total: number }[] }) {
  const peak = Math.max(...series.map((d) => d.total), 0);
  if (peak <= 0) return null;
  return (
    <div
      className="mt-1.5 flex h-5 items-end gap-[3px]"
      aria-hidden="true"
    >
      {series.map((day, i) => {
        const ratio = day.total / peak;
        return (
          <span
            key={i}
            className="w-full rounded-[1px] bg-[var(--chart-1)]"
            style={{
              // Keep a hairline for empty days so the axis stays readable.
              height: `${Math.max(ratio * 100, 6)}%`,
              opacity: i === series.length - 1 ? 1 : 0.45,
            }}
          />
        );
      })}
    </div>
  );
}

function Cell({
  label,
  value,
  detail,
  tone = "neutral",
  href,
  children,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "danger";
  href?: string;
  children?: React.ReactNode;
}) {
  const body = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-altair-ink-on-paper-muted">
        {label}
      </p>
      <p
        className={`mt-1 text-[1.6rem] font-black leading-none tracking-tight tabular-nums ${
          tone === "danger"
            ? "text-altair-danger"
            : "text-altair-ink-on-paper"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs leading-snug text-altair-ink-on-paper-secondary">
        {detail}
      </p>
      {children}
    </>
  );

  const shared = "min-w-0 flex-1 px-4 py-3.5 first:pl-0 last:pr-0";

  return href ? (
    <Link
      href={href}
      className={`${shared} block rounded-[var(--radius-control)] transition-colors hover:bg-[rgb(28_25_19_/_0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]`}
    >
      {body}
    </Link>
  ) : (
    <div className={shared}>{body}</div>
  );
}

export function MissionControlV2TodayStrip({ data }: TodayStripProps) {
  const { operations, money } = data;

  const jobsDetail =
    operations.totalJobsToday === 0
      ? "Nothing scheduled"
      : `${operations.inProgress} in progress · ${operations.completedToday} done`;

  const collectedDetail =
    money.paymentsTodayCount === 0
      ? "No payments yet today"
      : `${money.paymentsTodayCount} payment${
          money.paymentsTodayCount === 1 ? "" : "s"
        } · ${formatCurrency(money.paymentsThisWeekTotal)} this week`;

  const hasOverdue = money.overdueCount > 0;

  return (
    <section aria-labelledby="mc-today-heading">
      <h2 id="mc-today-heading" className="sr-only">
        Today at a glance
      </h2>
      <div className="flex flex-col divide-y divide-[var(--north-star-section-divider)]/40 sm:flex-row sm:divide-x sm:divide-y-0">
        <Cell
          label="Jobs today"
          value={String(operations.totalJobsToday)}
          detail={jobsDetail}
          href="/work"
        />
        <Cell
          label="Collected today"
          value={formatCurrency(money.paymentsTodayTotal)}
          detail={collectedDetail}
        >
          <CollectionsSpark series={money.paymentsLast7Days} />
        </Cell>
        <Cell
          label="Outstanding"
          value={formatCurrency(money.unpaidTotal)}
          detail={`${money.unpaidCount} unpaid invoice${
            money.unpaidCount === 1 ? "" : "s"
          }`}
          href="/sales"
        />
        <Cell
          label="Overdue"
          value={formatCurrency(money.overdueTotal)}
          /* Danger only when something is actually overdue — a red zero would
             make the calmest possible state look like a problem. */
          tone={hasOverdue ? "danger" : "neutral"}
          detail={
            hasOverdue
              ? `${money.overdueCount} invoice${
                  money.overdueCount === 1 ? "" : "s"
                } past due`
              : "Nothing past due"
          }
          href={hasOverdue ? "/sales" : undefined}
        />
      </div>
    </section>
  );
}
