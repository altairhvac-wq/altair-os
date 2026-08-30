"use client";

import type { LeadsGlanceStat } from "@/shared/lib/leads/leads-glance-stats";
import type { LeadListFilter } from "./lead-work-queues";

type LeadsStatStripProps = {
  stats: LeadsGlanceStat[];
  activeQueue?: LeadListFilter;
  onFilterQueue?: (queue: LeadListFilter) => void;
};

/**
 * Compact inline glance stats for the Leads page header card.
 * Label + number only — same pill pattern as CustomersStatStrip.
 */
export function LeadsStatStrip({
  stats,
  activeQueue,
  onFilterQueue,
}: LeadsStatStripProps) {
  return (
    <dl className="flex max-w-full flex-nowrap items-baseline justify-start gap-x-1.5 overflow-x-auto sm:justify-start lg:justify-center sm:gap-x-2.5">
      {stats.map((stat) => {
        const filterQueue = stat.filterQueue;
        const isInteractive = Boolean(filterQueue && onFilterQueue);
        const isActive = Boolean(filterQueue && filterQueue === activeQueue);

        const labelClass =
          "whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em]";
        const valueClass = "text-sm font-bold tabular-nums";

        if (isInteractive && filterQueue && onFilterQueue) {
          return (
            <div key={stat.id} className="min-w-0 shrink-0">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="m-0">
                <button
                  type="button"
                  onClick={() => onFilterQueue(filterQueue)}
                  aria-label={`${stat.label}: ${stat.value}. Filter leads.`}
                  aria-pressed={isActive}
                  title={stat.detail}
                  className={`inline-flex items-baseline gap-1 rounded-md px-1.5 py-0.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent ${
                    isActive
                      ? "bg-altair-paper-elevated text-altair-ink-on-paper shadow-sm ring-1 ring-altair-ink-on-paper/30"
                      : "bg-altair-ink-on-paper/[0.03] text-altair-ink-on-paper-muted ring-1 ring-altair-border/70 hover:bg-altair-ink-on-paper/5 hover:text-altair-ink-on-paper hover:ring-altair-border-strong"
                  }`}
                >
                  <span
                    className={`${labelClass} ${
                      isActive
                        ? "text-altair-ink-on-paper"
                        : "text-altair-ink-on-paper-muted"
                    }`}
                    aria-hidden="true"
                  >
                    {stat.label}
                  </span>
                  <span
                    className={`${valueClass} ${
                      isActive
                        ? "text-altair-ink-on-paper"
                        : "text-altair-ink-on-paper-secondary"
                    }`}
                    aria-hidden="true"
                  >
                    {stat.value}
                  </span>
                </button>
              </dd>
            </div>
          );
        }

        return (
          <div
            key={stat.id}
            className="flex min-w-0 shrink-0 items-baseline gap-1"
            title={stat.detail}
          >
            <dt className={`${labelClass} text-altair-ink-on-paper-muted`}>
              {stat.label}
            </dt>
            <dd className={`${valueClass} m-0 text-altair-ink-on-paper`}>
              {stat.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
