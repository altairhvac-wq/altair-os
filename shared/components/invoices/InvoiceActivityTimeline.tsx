import {
  ArrowRightLeft,
  Ban,
  ClipboardList,
  DollarSign,
  History,
  Receipt,
  Send,
} from "lucide-react";
import type {
  InvoiceActivity,
  InvoiceActivityType,
} from "@/shared/types/invoice-activity";
import {
  formatInvoiceActivityDetails,
  formatInvoiceActivityLabel,
  formatInvoiceActivityTimestamp,
} from "@/shared/types/invoice-activity";

type InvoiceActivityTimelineProps = {
  activities: InvoiceActivity[];
};

const ACTIVITY_ICONS: Record<InvoiceActivityType, typeof History> = {
  invoice_created: ClipboardList,
  invoice_sent: Send,
  status_changed: ArrowRightLeft,
  invoice_converted_from_estimate: Receipt,
  invoice_voided: Ban,
  invoice_cancelled: Ban,
  payment_recorded: DollarSign,
};

const ACTIVITY_ICON_STYLES: Record<InvoiceActivityType, string> = {
  invoice_created: "bg-cyan-50 text-cyan-700 ring-cyan-600/15",
  invoice_sent: "bg-blue-50 text-blue-700 ring-blue-600/15",
  status_changed: "bg-slate-100 text-slate-600 ring-slate-500/15",
  invoice_converted_from_estimate: "bg-violet-50 text-violet-700 ring-violet-600/15",
  invoice_voided: "bg-slate-100 text-slate-500 ring-slate-400/15",
  invoice_cancelled: "bg-amber-50 text-amber-700 ring-amber-600/15",
  payment_recorded: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
};

export function InvoiceActivityTimeline({
  activities,
}: InvoiceActivityTimelineProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
          <History className="h-4 w-4 text-slate-500" />
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Activity
          </h2>
          <p className="text-sm text-slate-600">Timeline for this invoice</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">No activity yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Invoice events will appear here.
          </p>
        </div>
      ) : (
        <ol className="mt-5 space-y-0">
          {activities.map((activity, index) => {
            const Icon = ACTIVITY_ICONS[activity.eventType];
            const details = formatInvoiceActivityDetails(activity);
            const isLast = index === activities.length - 1;

            return (
              <li key={activity.id} className="relative flex gap-4 pb-5">
                {!isLast ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-[17px] top-9 h-[calc(100%-12px)] w-px bg-slate-200"
                  />
                ) : null}

                <div
                  className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${ACTIVITY_ICON_STYLES[activity.eventType]}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatInvoiceActivityLabel(activity)}
                    </p>
                    <time
                      dateTime={activity.createdAt}
                      className="shrink-0 text-xs text-slate-400"
                    >
                      {formatInvoiceActivityTimestamp(activity.createdAt)}
                    </time>
                  </div>

                  {details ? (
                    <p className="mt-1 text-sm text-slate-600">{details}</p>
                  ) : null}

                  {activity.actorName ? (
                    <p className="mt-1.5 text-xs text-slate-500">
                      by {activity.actorName}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
