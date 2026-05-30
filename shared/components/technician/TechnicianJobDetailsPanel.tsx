"use client";

import { Clock, MapPin, User, X } from "lucide-react";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetPanel,
} from "@/shared/components/ui/mobile-sheet";
import {
  adminDetailsBodyClass,
  adminDetailsClass,
  adminDetailsSummaryClass,
  adminMetaRowClass,
} from "@/shared/lib/admin-density";
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
  const hasSummary = Boolean(job.description?.trim());
  const hasNotes = Boolean(job.notes?.trim());

  return (
    <MobileSheet onClose={onClose} ariaLabelledBy={TITLE_ID}>
      <MobileSheetPanel maxWidth="md">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              {job.jobNumber}
              <span className="font-normal text-slate-400"> · </span>
              {job.jobType}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <TechnicianJobStatusBadge status={job.status} />
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${getPriorityStyles(job.priority)}`}
              >
                {formatJobPriority(job.priority)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <MobileSheetBody unstyled className="space-y-2.5 p-3">
          <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-sm text-slate-700">
            <div className={adminMetaRowClass}>
              <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="font-semibold text-slate-900">{job.customerName}</span>
            </div>
            <div className={`mt-1 ${adminMetaRowClass}`}>
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{formatTechnicianJobAddress(job)}</span>
            </div>
            <div className={`mt-1 ${adminMetaRowClass}`}>
              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{formatTechnicianJobTime(job.scheduledDate)}</span>
            </div>
          </div>

          <TechnicianQuickActions job={job} onAction={onQuickAction} />

          {hasSummary ? (
            <details className={adminDetailsClass} open>
              <summary className={adminDetailsSummaryClass}>
                <span>Summary</span>
              </summary>
              <div className={adminDetailsBodyClass}>
                <p className="text-sm leading-snug text-slate-700">{job.description}</p>
              </div>
            </details>
          ) : null}

          {hasNotes ? (
            <details className={adminDetailsClass}>
              <summary className={adminDetailsSummaryClass}>
                <span>Office notes</span>
              </summary>
              <div className={adminDetailsBodyClass}>
                <p className="text-sm leading-snug text-slate-700">{job.notes}</p>
              </div>
            </details>
          ) : null}
        </MobileSheetBody>
      </MobileSheetPanel>
    </MobileSheet>
  );
}
