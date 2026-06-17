import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Clock, FileText, Inbox } from "lucide-react";
import type { ActionQueueItem, OfficeQueueItem } from "./sample-data";
import {
  v3ColumnHeaderClass,
  v3EyebrowLightClass,
  v3LabelMutedClass,
  v3LinkClass,
  v3MetaClass,
  v3RowClass,
  v3WorkspaceSubheadingClass,
} from "./v3-tokens";

const urgencyStyles = {
  now: {
    badge: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
  },
  today: {
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
  },
  soon: {
    badge: "bg-[#EFEAE2] text-[#3D3428] ring-[rgba(41,34,24,0.10)]",
    dot: "bg-slate-400",
  },
} as const;

const officeTypeIcons = {
  estimate: FileText,
  invoice: FileText,
  job: Clock,
  lead: Inbox,
} as const;

type ActionColumnProps = {
  actionQueue: ActionQueueItem[];
  officeQueue: OfficeQueueItem[];
};

export function ActionColumn({ actionQueue, officeQueue }: ActionColumnProps) {
  return (
    <div className="relative flex flex-col gap-4 p-4 sm:p-5 lg:p-6">
      <div className={v3ColumnHeaderClass}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" />
              <p className={v3EyebrowLightClass}>Action now</p>
            </div>
            <h3 className={`mt-1 ${v3WorkspaceSubheadingClass}`}>Blockers on jobs & billing</h3>
            <p className="text-xs text-[rgba(41,34,24,0.65)]">Clear these to protect schedule and cash</p>
          </div>
          <Link href="/invoices?status=overdue" className={`shrink-0 ${v3LinkClass}`}>
            View all
          </Link>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {actionQueue.map((item) => {
          const style = urgencyStyles[item.urgency];
          return (
            <li key={item.id}>
              <Link href="/invoices" className={`group block ${v3RowClass}`}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[#292218] group-hover:text-[#1a1612]">
                      {item.title}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1 ${style.badge}`}
                    >
                      {item.urgency}
                    </span>
                  </div>
                  <p className={`mt-0.5 truncate ${v3MetaClass}`}>{item.meta}</p>
                  {item.impact ? (
                    <p className="mt-0.5 truncate text-[11px] text-[rgba(41,34,24,0.55)]">{item.impact}</p>
                  ) : null}
                </div>
                {item.amount ? (
                  <span className="shrink-0 text-sm font-bold tabular-nums text-[#292218]">{item.amount}</span>
                ) : null}
                <ArrowUpRight
                  className="h-3.5 w-3.5 shrink-0 text-[rgba(41,34,24,0.40)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-700"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto border-t border-[rgba(41,34,24,0.10)] pt-3">
        <p className={v3LabelMutedClass}>Office follow-ups</p>
        <ul className="mt-2 flex flex-col gap-1">
          {officeQueue.map((item) => {
            const Icon = officeTypeIcons[item.type];
            return (
              <li key={item.id}>
                <Link
                  href="/jobs"
                  className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-[#EFEAE2]/80"
                >
                  <Icon
                    className="h-3.5 w-3.5 shrink-0 text-[rgba(41,34,24,0.50)] group-hover:text-[rgba(41,34,24,0.70)]"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-[#3D3428] group-hover:text-[#292218]">
                    {item.title}
                  </span>
                  <span className="shrink-0 text-[rgba(41,34,24,0.55)]">{item.meta}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
