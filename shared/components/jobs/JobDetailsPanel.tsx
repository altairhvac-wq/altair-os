"use client";

import { Calendar, MapPin, User, Wrench, X } from "lucide-react";
import { listDetailPanelClass } from "@/shared/components/layout/list-detail-layout";
import {
  formatScheduledDate,
  formatScheduledTime,
  type Job,
  type JobFormData,
} from "@/shared/types/job";
import type { Customer } from "@/shared/types/customer";
import { JobCard } from "./JobCard";
import { JobForm } from "./JobForm";
import { JobPriorityBadge } from "./JobPriorityBadge";
import { JobStatusBadge } from "./JobStatusBadge";
import {
  adminDetailsBodyClass,
  adminDetailsClass,
  adminDetailsSummaryClass,
  adminMetaRowClass,
  adminPanelBodyClass,
} from "@/shared/lib/admin-density";

type PanelMode = "detail" | "create" | "empty";

type JobDetailsPanelProps = {
  mode: PanelMode;
  job: Job | null;
  customers: Customer[];
  onClose: () => void;
  onCreateSubmit: (data: JobFormData) => void;
  onCreateCancel: () => void;
  createError?: string | null;
  isSubmitting?: boolean;
  createInitialData?: Partial<JobFormData>;
};

export function JobDetailsPanel({
  mode,
  job,
  customers,
  onClose,
  onCreateSubmit,
  onCreateCancel,
  createError,
  isSubmitting = false,
  createInitialData,
}: JobDetailsPanelProps) {
  const title =
    mode === "create"
      ? "New job"
      : mode === "detail" && job
        ? job.jobNumber
        : "Job details";

  return (
    <aside
      className={`${listDetailPanelClass(mode !== "empty")} flex min-h-0 min-w-0 flex-[1_1_45%] flex-col overflow-hidden admin-card max-lg:min-h-[12rem] lg:h-full lg:w-[400px] lg:flex-none lg:shrink-0`}
    >
      <div className="admin-panel-header admin-section-header flex shrink-0 items-start justify-between py-2">
        <div className="min-w-0 pr-2">
          <h2 className="admin-heading-section sm:text-base">{title}</h2>
          {mode === "empty" ? (
            <p className="admin-text-helper mt-0.5 text-xs">Select a job</p>
          ) : null}
        </div>
        {mode !== "empty" ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className={adminPanelBodyClass}>
        {mode === "empty" ? (
          <div className="flex h-full flex-col items-center justify-center px-2 py-6 text-center">
            <div className="admin-empty-state w-full max-w-xs">
              <div className="admin-empty-icon mx-auto">
                <Wrench className="h-6 w-6 text-slate-400" />
              </div>
              <p className="admin-heading-section mt-3 text-sm">No job selected</p>
              <p className="admin-text-helper mx-auto mt-0.5 max-w-[220px] text-xs">
                Click a row to open details.
              </p>
            </div>
          </div>
        ) : null}

        {mode === "create" ? (
          <JobForm
            customers={customers}
            initialData={createInitialData}
            onSubmit={onCreateSubmit}
            onCancel={onCreateCancel}
            error={createError}
            isSubmitting={isSubmitting}
          />
        ) : null}

        {mode === "detail" && job ? (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <JobStatusBadge status={job.status} />
              <JobPriorityBadge priority={job.priority} />
            </div>

            <JobCard job={job} />

            <div className="rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-sm text-slate-700">
              <div className={adminMetaRowClass}>
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>
                  {job.serviceAddress}, {job.city}, {job.state} {job.zip}
                </span>
              </div>
              <div className={`mt-1.5 ${adminMetaRowClass}`}>
                <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>{job.assignedTechnician ?? "Unassigned"}</span>
                <span className="text-slate-300" aria-hidden>
                  ·
                </span>
                <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>
                  {formatScheduledDate(job.scheduledDate)}{" "}
                  {formatScheduledTime(job.scheduledDate)}
                </span>
              </div>
              <div className={`mt-1.5 ${adminMetaRowClass}`}>
                <Wrench className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>{job.jobType}</span>
              </div>
            </div>

            {job.description ? (
              <details className={adminDetailsClass} open>
                <summary className={adminDetailsSummaryClass}>
                  <span>Description</span>
                </summary>
                <div className={adminDetailsBodyClass}>
                  <p className="text-sm leading-snug text-slate-600">
                    {job.description}
                  </p>
                </div>
              </details>
            ) : null}

            {job.notes ? (
              <details className={adminDetailsClass}>
                <summary className={adminDetailsSummaryClass}>
                  <span>Notes</span>
                </summary>
                <div className={adminDetailsBodyClass}>
                  <p className="text-sm leading-snug text-slate-600">{job.notes}</p>
                </div>
              </details>
            ) : null}

            <div className="flex gap-2 border-t border-slate-100 pt-2.5">
              <button
                type="button"
                className="min-h-11 flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Edit job
              </button>
              <button
                type="button"
                className="min-h-11 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                View customer
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
