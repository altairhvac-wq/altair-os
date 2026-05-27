"use client";

import { X } from "lucide-react";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetPanel,
} from "@/shared/components/ui/mobile-sheet";
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

const TITLE_ID = "technician-job-details-title";

export function TechnicianJobDetailsPanel({
  job,
  onClose,
  onQuickAction,
}: TechnicianJobDetailsPanelProps) {
  return (
    <MobileSheet onClose={onClose} ariaLabelledBy={TITLE_ID}>
      <MobileSheetPanel maxWidth="md">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Job Details
            </p>
            <h2 id={TITLE_ID} className="text-lg font-bold text-slate-900">
              {job.jobNumber}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <MobileSheetBody unstyled className="space-y-4 p-4">
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
        </MobileSheetBody>
      </MobileSheetPanel>
    </MobileSheet>
  );
}
