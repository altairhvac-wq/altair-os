"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Clock, FileText, Inbox } from "lucide-react";
import type { ActionQueueItem, OfficeQueueItem } from "./sample-data";
import { usePaletteTokens } from "./palette-context";

const officeTypeIcons = {
  estimate: FileText,
  invoice: FileText,
  job: Clock,
  lead: Inbox,
} as const;

type ColorLabActionColumnProps = {
  actionQueue: ActionQueueItem[];
  officeQueue: OfficeQueueItem[];
};

export function ColorLabActionColumn({ actionQueue, officeQueue }: ColorLabActionColumnProps) {
  const t = usePaletteTokens();

  const urgencyStyles = {
    now: { badge: t.urgencyNowBadge, dot: t.urgencyNowDot },
    today: { badge: t.urgencyTodayBadge, dot: t.urgencyTodayDot },
    soon: { badge: "", dot: t.urgencySoonDot },
  } as const;

  return (
    <div className="relative flex flex-col gap-4 p-4 sm:p-5 lg:p-6 lg:pr-7">
      <div aria-hidden="true" className={t.columnRail} />
      <div className={t.columnHeader}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${t.urgencyDangerIcon}`} aria-hidden="true" />
              <p className={t.eyebrowLight}>Action now</p>
            </div>
            <h3 className={`mt-1 ${t.workspaceSubheading}`}>Blockers on jobs & billing</h3>
            <p className={`text-xs ${t.meta}`}>Clear these to protect schedule and cash</p>
          </div>
          <Link href="/invoices?status=overdue" className={`shrink-0 ${t.link}`}>
            View all
          </Link>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {actionQueue.map((item) => {
          const style = urgencyStyles[item.urgency];
          const soonBadge = `${style.badge} ${t.soonBadge} ring-1 ${t.soonBadgeRing}`;

          return (
            <li key={item.id}>
              <Link href="/invoices" className={`group block ${t.row}`}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`truncate text-sm font-semibold ${t.workspaceSubheading} group-hover:opacity-90`}>
                      {item.title}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1 ${
                        item.urgency === "soon" ? soonBadge : `${style.badge} ring-1`
                      }`}
                    >
                      {item.urgency}
                    </span>
                  </div>
                  <p className={`mt-0.5 truncate ${t.meta}`}>{item.meta}</p>
                  {item.impact ? (
                    <p className={`mt-0.5 truncate text-[11px] ${t.meta}`}>{item.impact}</p>
                  ) : null}
                </div>
                {item.amount ? (
                  <span className={`shrink-0 text-sm font-bold tabular-nums ${t.workspaceSubheading}`}>
                    {item.amount}
                  </span>
                ) : null}
                <ArrowUpRight className={`h-3.5 w-3.5 shrink-0 ${t.workspaceRowArrow}`} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className={`mt-auto border-t ${t.columnDivider} pt-3`}>
        <p className={t.labelMuted}>Office follow-ups</p>
        <ul className="mt-2 flex flex-col gap-1">
          {officeQueue.map((item) => {
            const Icon = officeTypeIcons[item.type];
            return (
              <li key={item.id}>
                <Link
                  href="/jobs"
                  className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${t.officeHover}`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${t.workspaceIconMuted} ${t.workspaceIconHover}`}
                    aria-hidden="true"
                  />
                  <span className={`min-w-0 flex-1 truncate font-medium ${t.bodyPrimary}`}>{item.title}</span>
                  <span className={`shrink-0 ${t.meta}`}>{item.meta}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
