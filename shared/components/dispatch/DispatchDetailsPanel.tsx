import { Calendar, MapPin, Phone, User, Wrench, X } from "lucide-react";
import {
  formatDispatchDate,
  formatDispatchTime,
  formatFullAddress,
  type DispatchJob,
  type Technician,
} from "@/shared/types/dispatch";
import { DispatchPriorityBadge } from "./DispatchPriorityBadge";
import { DispatchStatusBadge } from "./DispatchStatusBadge";

type DispatchDetailsPanelProps = {
  job: DispatchJob | null;
  technician: Technician | null;
  onClose: () => void;
};

export function DispatchDetailsPanel({
  job,
  technician,
  onClose,
}: DispatchDetailsPanelProps) {
  const isOpen = job !== null;

  return (
    <aside
      className={`flex min-h-[12rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all lg:min-h-0 lg:w-[380px] lg:shrink-0 ${
        isOpen ? "lg:flex" : "hidden lg:flex"
      }`}
    >
      <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {job ? job.jobNumber : "Job details"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {job ? "Dispatch assignment overview" : "Select a job from the board"}
          </p>
        </div>
        {job ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {!job ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <Wrench className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">
              No job selected
            </p>
            <p className="mt-1 max-w-[220px] text-xs text-slate-500">
              Click a job card on the board to view customer, schedule, and
              assignment details.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {job.customerName}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500">{job.jobType}</p>
                </div>
                <DispatchPriorityBadge priority={job.priority} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <DispatchStatusBadge status={job.status} />
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Schedule
              </h3>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <Calendar className="h-4 w-4 text-slate-400" />
                {formatDispatchDate(job.scheduledDate)} at{" "}
                {formatDispatchTime(job.scheduledDate)}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Service address
              </h3>
              <div className="mt-2 flex gap-2 text-sm text-slate-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <p>{formatFullAddress(job)}</p>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Assigned technician
              </h3>
              {technician ? (
                <div className="mt-2 rounded-xl border border-slate-100 bg-white p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-white">
                      {technician.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {technician.name}
                      </p>
                      <p className="text-xs text-slate-500">{technician.role}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {technician.phone}
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2 text-sm text-amber-700">
                  <User className="h-4 w-4" />
                  Unassigned — awaiting dispatch
                </div>
              )}
            </section>

            {job.description ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {job.description}
                </p>
              </section>
            ) : null}

            {job.notes ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {job.notes}
                </p>
              </section>
            ) : null}

            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Assign tech
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                View job
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
