import { Briefcase, Calendar, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import {
  formatSubcontractJobStatus,
  type SubcontractJob,
} from "@/shared/types/network";
import { SubcontractJobCard } from "./SubcontractJobCard";

type SubcontractJobDetailsPanelProps = {
  job: SubcontractJob | null;
  onClose: () => void;
};

export function SubcontractJobDetailsPanel({
  job,
  onClose,
}: SubcontractJobDetailsPanelProps) {
  const amount =
    job?.direction === "sent"
      ? job.payoutAmount
      : job?.direction === "received"
        ? job.earnedAmount
        : job?.budget;

  return (
    <aside className="flex min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-full lg:min-h-0 lg:w-[400px] lg:flex-none lg:shrink-0">
      <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {job ? job.title : "Job details"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {job
              ? `${job.jobNumber} · ${formatSubcontractJobStatus(job.status)}`
              : "Select a subcontract job to view details"}
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
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/5 ring-1 ring-slate-200">
              <Briefcase className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">
              No job selected
            </p>
            <p className="mt-1 max-w-[240px] text-xs leading-relaxed text-slate-500">
              Select a job from the list to review scope, partner, and payout
              details.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <SubcontractJobCard job={job} compact />

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs font-medium text-slate-500">Direction</p>
                <p className="mt-1 text-sm font-bold capitalize text-slate-900">
                  {job.direction.replace("-", " ")}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-xs font-medium text-slate-500">Created</p>
                <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {formatDate(job.createdAt)}
                </div>
              </div>
              {job.completedDate ? (
                <div className="col-span-2 rounded-xl border border-slate-100 p-3">
                  <p className="text-xs font-medium text-slate-500">Completed</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {formatDate(job.completedDate)}
                  </p>
                </div>
              ) : null}
            </div>

            {amount != null ? (
              <div className="rounded-xl border border-slate-900/10 bg-slate-900 p-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {job.direction === "sent"
                    ? "Payout amount"
                    : job.direction === "received"
                      ? "Earned amount"
                      : "Budget"}
                </p>
                <p className="mt-1 text-2xl font-black">
                  {formatCurrency(amount)}
                </p>
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-100 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Scope
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {job.description}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
