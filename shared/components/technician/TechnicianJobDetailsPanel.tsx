import { X } from "lucide-react";
import {
  formatJobPriority,
  formatTechnicianJobAddress,
  formatTechnicianJobTime,
  getPriorityStyles,
  type TechnicianJob,
  type TechnicianQuickAction,
} from "@/shared/types/technician";
import { TechnicianJobStatusBadge } from "./TechnicianJobStatusBadge";
import { TechnicianQuickActions } from "./TechnicianQuickActions";

type TechnicianJobDetailsPanelProps = {
  job: TechnicianJob;
  onClose: () => void;
  onQuickAction: (action: TechnicianQuickAction, job: TechnicianJob) => void;
};

export function TechnicianJobDetailsPanel({
  job,
  onClose,
  onQuickAction,
}: TechnicianJobDetailsPanelProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Close job details"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px]"
      />

      <aside className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md">
        <div className="max-h-[85vh] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Job Details
              </p>
              <h2 className="text-lg font-bold text-slate-900">
                {job.jobNumber}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <div>
              <p className="text-sm font-bold text-slate-900">{job.jobType}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <TechnicianJobStatusBadge status={job.status} />
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getPriorityStyles(job.priority)}`}
                >
                  {formatJobPriority(job.priority)} priority
                </span>
              </div>
            </div>

            <dl className="space-y-3 rounded-xl bg-slate-50 p-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Customer
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  {job.customerName}
                </dd>
                <dd className="text-sm text-slate-600">{job.customerPhone}</dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Service Address
                </dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {formatTechnicianJobAddress(job)}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Scheduled Time
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  {formatTechnicianJobTime(job.scheduledDate)}
                </dd>
              </div>
            </dl>

            {job.description ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </p>
                <p className="mt-1 text-sm text-slate-700">{job.description}</p>
              </div>
            ) : null}

            {job.notes ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </p>
                <p className="mt-1 text-sm text-slate-700">{job.notes}</p>
              </div>
            ) : null}

            <TechnicianQuickActions job={job} onAction={onQuickAction} />
          </div>
        </div>
      </aside>
    </>
  );
}
