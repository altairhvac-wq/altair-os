import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import {
  buildDashboardActionRows,
  type DashboardActionRow,
} from "@/shared/lib/dashboard-overview";
import type { DashboardData } from "@/shared/types/dashboard";
import { OVERVIEW_CARD_CLASS, OverviewCardHeader } from "./overview-chrome";

const DOT_CLASS: Record<DashboardActionRow["urgency"], string> = {
  high: "bg-altair-danger text-white",
  medium: "bg-altair-warning text-white",
  low: "bg-[var(--chrome-elevated)] text-white",
};

export function OverviewActionList({
  data,
  rows,
  totalCount,
}: {
  data: DashboardData;
  rows?: DashboardActionRow[];
  totalCount?: number;
}) {
  const resolved =
    rows && totalCount != null
      ? { rows, totalCount }
      : buildDashboardActionRows(data);

  return (
    <section className={OVERVIEW_CARD_CLASS} aria-label="Action required">
      <OverviewCardHeader
        title="Action required"
        count={resolved.totalCount}
        href={resolved.rows[0]?.href}
        hrefLabel="View all"
      />
      {resolved.rows.length === 0 ? (
        <div className="flex items-start gap-3 border-t border-altair-border/40 px-4 py-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-altair-success text-white">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-altair-ink-on-paper">
              Nothing needs attention
            </p>
            <p className="mt-0.5 text-xs text-altair-ink-on-paper-secondary">
              No overdue invoices, unscheduled estimates, open shifts, leads or
              customer records waiting on you.
            </p>
          </div>
        </div>
      ) : (
        <ol className="divide-y divide-altair-border/40 border-t border-altair-border/40">
          {resolved.rows.map((row) => (
            <li key={row.id}>
              <Link
                href={row.href}
                className="grid grid-cols-[2.125rem_1fr_1rem] items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                <span
                  className={`flex h-[2.125rem] w-[2.125rem] items-center justify-center rounded-full text-sm font-black tabular-nums ${DOT_CLASS[row.urgency]}`}
                >
                  {row.count}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-altair-ink-on-paper">
                    {row.title}
                  </span>
                  <span className="block text-xs leading-snug text-altair-ink-on-paper-secondary">
                    {row.detail}
                  </span>
                </span>
                <ChevronRight
                  className="h-4 w-4 text-altair-ink-on-paper-muted"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
