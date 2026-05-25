import {
  ArrowRightLeft,
  Ban,
  Camera,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  History,
  Navigation,
  Play,
  Receipt,
  Send,
  Settings2,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import type {
  OperationalActivity,
  OperationalActivityEventType,
} from "@/shared/types/operational-activity";
import {
  formatOperationalActivityDetails,
  formatOperationalActivityLabel,
  formatOperationalActivityTimestamp,
} from "@/shared/types/operational-activity";

type OperationalActivityTimelineProps = {
  activities: OperationalActivity[];
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

const ACTIVITY_ICONS: Record<
  OperationalActivityEventType,
  typeof History
> = {
  customer_created: UserPlus,
  equipment_added: Settings2,
  equipment_updated: Settings2,
  warranty_expiration_recorded: ShieldCheck,
  job_created: ClipboardList,
  job_status_changed: ArrowRightLeft,
  technician_assigned: User,
  estimate_created: ClipboardList,
  estimate_approved: CheckCircle2,
  estimate_converted_to_invoice: Receipt,
  invoice_created: Receipt,
  invoice_sent: Send,
  payment_recorded: DollarSign,
  invoice_paid: CheckCircle2,
  job_attachment_uploaded: Camera,
  expense_receipt_uploaded: Receipt,
  status_changed: ArrowRightLeft,
};

const ACTIVITY_ICON_STYLES: Record<OperationalActivityEventType, string> = {
  customer_created: "bg-cyan-50 text-cyan-700 ring-cyan-600/15",
  equipment_added: "bg-violet-50 text-violet-700 ring-violet-600/15",
  equipment_updated: "bg-violet-50 text-violet-700 ring-violet-600/15",
  warranty_expiration_recorded: "bg-amber-50 text-amber-700 ring-amber-600/15",
  job_created: "bg-cyan-50 text-cyan-700 ring-cyan-600/15",
  job_status_changed: "bg-slate-100 text-slate-600 ring-slate-500/15",
  technician_assigned: "bg-violet-50 text-violet-700 ring-violet-600/15",
  estimate_created: "bg-cyan-50 text-cyan-700 ring-cyan-600/15",
  estimate_approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  estimate_converted_to_invoice: "bg-violet-50 text-violet-700 ring-violet-600/15",
  invoice_created: "bg-cyan-50 text-cyan-700 ring-cyan-600/15",
  invoice_sent: "bg-blue-50 text-blue-700 ring-blue-600/15",
  payment_recorded: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  invoice_paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  job_attachment_uploaded: "bg-blue-50 text-blue-700 ring-blue-600/15",
  expense_receipt_uploaded: "bg-amber-50 text-amber-700 ring-amber-600/15",
  status_changed: "bg-slate-100 text-slate-600 ring-slate-500/15",
};

const WORKFLOW_ICON_OVERRIDES: Record<string, typeof History> = {
  start_route: Navigation,
  start_work: Play,
  complete_job: CheckCircle2,
  job_cancelled: Ban,
};

export function OperationalActivityTimeline({
  activities,
  title = "Activity",
  description = "Operational timeline",
  emptyTitle = "No activity yet",
  emptyDescription = "Workflow events will appear here as work progresses.",
}: OperationalActivityTimelineProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
          <History className="h-4 w-4 text-slate-500" />
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </h2>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">{emptyTitle}</p>
          <p className="mt-1 text-xs text-slate-500">{emptyDescription}</p>
        </div>
      ) : (
        <ol className="mt-5 space-y-0">
          {activities.map((activity, index) => {
            const Icon =
              WORKFLOW_ICON_OVERRIDES[activity.rawEventType] ??
              ACTIVITY_ICONS[activity.eventType];
            const details = formatOperationalActivityDetails(activity);
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
                      {formatOperationalActivityLabel(activity)}
                    </p>
                    <time
                      dateTime={activity.createdAt}
                      className="shrink-0 text-xs text-slate-400"
                    >
                      {formatOperationalActivityTimestamp(activity.createdAt)}
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
