import {
  ArrowRightLeft,
  Ban,
  Camera,
  CheckCircle2,
  ClipboardList,
  History,
  MapPin,
  Navigation,
  Package,
  Play,
  User,
  UserMinus,
} from "lucide-react";
import type { JobActivity, JobActivityType } from "@/shared/types/job-activity";
import {
  formatJobActivityAttribution,
  formatJobActivityDetails,
  formatJobActivityLabel,
  formatJobActivityTimestamp,
} from "@/shared/types/job-activity";

type JobActivityTimelineProps = {
  activities: JobActivity[];
};

const ACTIVITY_ICONS: Record<
  JobActivityType,
  typeof History
> = {
  job_created: ClipboardList,
  technician_assigned: User,
  technician_unassigned: UserMinus,
  start_route: Navigation,
  start_work: Play,
  complete_job: CheckCircle2,
  technician_arrived: MapPin,
  work_started: Play,
  work_completed: CheckCircle2,
  status_changed: ArrowRightLeft,
  job_cancelled: Ban,
  job_attachment_uploaded: Camera,
  job_material_added: Package,
  invoice_created_for_completed_job: CheckCircle2,
  labor_entries_closed: CheckCircle2,
  job_labor_auto_closed: CheckCircle2,
  pending_expenses_resolved: CheckCircle2,
  material_costs_completed: CheckCircle2,
};

const ACTIVITY_ICON_STYLES: Record<JobActivityType, string> = {
  job_created: "bg-cyan-50 text-cyan-700 ring-cyan-600/15",
  technician_assigned: "bg-violet-50 text-violet-700 ring-violet-600/15",
  technician_unassigned: "bg-orange-50 text-orange-700 ring-orange-600/15",
  start_route: "bg-blue-50 text-blue-700 ring-blue-600/15",
  start_work: "bg-amber-50 text-amber-700 ring-amber-600/15",
  complete_job: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  technician_arrived: "bg-teal-50 text-teal-700 ring-teal-600/15",
  work_started: "bg-amber-50 text-amber-700 ring-amber-600/15",
  work_completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  status_changed: "bg-slate-100 text-slate-600 ring-slate-500/15",
  job_cancelled: "bg-red-50 text-red-700 ring-red-600/15",
  job_attachment_uploaded: "bg-blue-50 text-blue-700 ring-blue-600/15",
  job_material_added: "bg-amber-50 text-amber-700 ring-amber-600/15",
  invoice_created_for_completed_job:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  labor_entries_closed: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  job_labor_auto_closed: "bg-slate-100 text-slate-600 ring-slate-500/15",
  pending_expenses_resolved:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  material_costs_completed:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
};

export function JobActivityTimeline({ activities }: JobActivityTimelineProps) {
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
          <p className="text-sm text-slate-600">
            Operational timeline for this job
          </p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">No activity yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Status changes, assignments, and workflow actions will appear here.
          </p>
        </div>
      ) : (
        <ol className="mt-5 space-y-0">
          {activities.map((activity, index) => {
            const Icon = ACTIVITY_ICONS[activity.eventType] ?? History;
            const iconStyle =
              ACTIVITY_ICON_STYLES[activity.eventType] ??
              "bg-slate-100 text-slate-600 ring-slate-500/15";
            const details = formatJobActivityDetails(activity);
            const attribution = formatJobActivityAttribution(activity);
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
                      {formatJobActivityLabel(activity)}
                    </p>
                    <time
                      dateTime={activity.createdAt}
                      className="shrink-0 text-xs text-slate-400"
                    >
                      {formatJobActivityTimestamp(activity.createdAt)}
                    </time>
                  </div>

                  {details ? (
                    <p className="mt-1 text-sm text-slate-600">{details}</p>
                  ) : null}

                  {attribution ? (
                    <p className="mt-1.5 text-xs text-slate-500">
                      {attribution}
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
