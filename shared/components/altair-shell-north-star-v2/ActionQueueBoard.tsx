import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Clock, FileText, Inbox } from "lucide-react";
import type { ActionQueueItem, OfficeQueueItem } from "./sample-data";
import { missionZoneClass, missionRowClass, missionEyebrowClass } from "./mission-tokens";

const urgencyStyles = {
  now: {
    badge: "bg-red-950/60 text-red-300 ring-red-500/25",
    dot: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]",
  },
  today: {
    badge: "bg-amber-950/60 text-amber-300 ring-amber-500/25",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
  },
  soon: {
    badge: "bg-slate-800/80 text-slate-400 ring-slate-600/30",
    dot: "bg-slate-500",
  },
} as const;

const officeTypeIcons = {
  estimate: FileText,
  invoice: FileText,
  job: Clock,
  lead: Inbox,
} as const;

type ActionQueueBoardProps = {
  items: ActionQueueItem[];
  officeQueue: OfficeQueueItem[];
};

export function ActionQueueBoard({ items, officeQueue }: ActionQueueBoardProps) {
  return (
    <section aria-label="Action now" className={missionZoneClass}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-red-500/5 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/15 to-transparent"
      />

      <div className="relative flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400/80" aria-hidden="true" />
              <p className={missionEyebrowClass}>Action now</p>
            </div>
            <h2 className="mt-1 text-lg font-semibold text-white">What needs you first</h2>
          </div>
          <Link
            href="/invoices?status=overdue"
            className="shrink-0 text-xs font-medium text-cyan-400/80 transition-colors hover:text-cyan-300"
          >
            View all
          </Link>
        </div>

        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const style = urgencyStyles[item.urgency];
            return (
              <li key={item.id}>
                <Link href="/invoices" className={`group block ${missionRowClass}`}>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-200 group-hover:text-white">
                        {item.title}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1 ${style.badge}`}
                      >
                        {item.urgency}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{item.meta}</p>
                  </div>
                  {item.amount ? (
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-300">
                      {item.amount}
                    </span>
                  ) : null}
                  <ArrowUpRight
                    className="h-3.5 w-3.5 shrink-0 text-slate-600 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-400"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-slate-800/50 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            Office queue
          </p>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {officeQueue.map((item) => {
              const Icon = officeTypeIcons[item.type];
              return (
                <li key={item.id}>
                  <Link
                    href="/jobs"
                    className="group flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-slate-950/40"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-slate-600 group-hover:text-slate-400" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-slate-400 group-hover:text-slate-300">
                      {item.title}
                    </span>
                    <span className="shrink-0 text-slate-600">{item.meta}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
