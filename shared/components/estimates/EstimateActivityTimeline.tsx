import {
  ArrowRightLeft,
  Ban,
  CheckCircle2,
  ClipboardList,
  History,
  Send,
  XCircle,
} from "lucide-react";
import type {
  EstimateActivity,
  EstimateActivityType,
} from "@/shared/types/estimate-activity";
import {
  formatEstimateActivityAttribution,
  formatEstimateActivityDetails,
  formatEstimateActivityLabel,
  formatEstimateActivityTimestamp,
} from "@/shared/types/estimate-activity";
import { adminCardSectionClass } from "@/shared/lib/admin-density";

type EstimateActivityTimelineProps = {
  activities: EstimateActivity[];
};

const ACTIVITY_ICONS: Record<EstimateActivityType, typeof History> = {
  estimate_created: ClipboardList,
  status_changed: ArrowRightLeft,
  estimate_sent: Send,
  estimate_email_resent: Send,
  estimate_approved: CheckCircle2,
  estimate_declined: XCircle,
  estimate_cancelled: Ban,
  estimate_converted: CheckCircle2,
};

const ACTIVITY_ICON_STYLES: Record<EstimateActivityType, string> = {
  estimate_created: "bg-cyan-50 text-cyan-700 ring-cyan-600/15",
  status_changed: "bg-slate-100 text-slate-600 ring-slate-500/15",
  estimate_sent: "bg-blue-50 text-blue-700 ring-blue-600/15",
  estimate_email_resent: "bg-blue-50 text-blue-700 ring-blue-600/15",
  estimate_approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  estimate_declined: "bg-red-50 text-red-700 ring-red-600/15",
  estimate_cancelled: "bg-amber-50 text-amber-700 ring-amber-600/15",
  estimate_converted: "bg-violet-50 text-violet-700 ring-violet-600/15",
};

export function EstimateActivityTimeline({
  activities,
}: EstimateActivityTimelineProps) {
  return (
    <section className={adminCardSectionClass}>
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
          <History className="h-4 w-4 text-slate-500" />
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Activity
          </h2>
          <p className="text-sm text-slate-600">
            Status changes and customer responses for this estimate
          </p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">No activity yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Sends, approvals, and status changes will appear here.
          </p>
        </div>
      ) : (
        <ol className="mt-5 space-y-0">
          {activities.map((activity, index) => {
            const Icon = ACTIVITY_ICONS[activity.eventType] ?? History;
            const iconStyle =
              ACTIVITY_ICON_STYLES[activity.eventType] ??
              "bg-slate-100 text-slate-600 ring-slate-500/15";
            const details = formatEstimateActivityDetails(activity);
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
                  className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${iconStyle}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatEstimateActivityLabel(activity)}
                    </p>
                    <time
                      dateTime={activity.createdAt}
                      className="shrink-0 text-xs text-slate-400"
                    >
                      {formatEstimateActivityTimestamp(activity.createdAt)}
                    </time>
                  </div>

                  {details ? (
                    <p className="mt-1 text-sm text-slate-600">{details}</p>
                  ) : null}

                  {(() => {
                    const attribution = formatEstimateActivityAttribution(activity);
                    return attribution ? (
                      <p className="mt-1.5 text-xs text-slate-500">{attribution}</p>
                    ) : null;
                  })()}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
