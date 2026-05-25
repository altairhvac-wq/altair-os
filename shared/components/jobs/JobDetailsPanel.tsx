import { Calendar, MapPin, User, Wrench, X } from "lucide-react";
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
    <aside className="flex min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-full lg:min-h-0 lg:w-[400px] lg:flex-none lg:shrink-0">
      <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {mode === "create"
              ? "Schedule work and assign a technician"
              : mode === "detail"
                ? "Job details and assignment"
                : "Select a job from the list"}
          </p>
        </div>
        {mode !== "empty" ? (
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
        {mode === "empty" ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <Wrench className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">
              No job selected
            </p>
            <p className="mt-1 max-w-[220px] text-xs text-slate-500">
              Click a row in the table to view full job details here.
            </p>
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
          <div className="space-y-6">
            <JobCard job={job} />

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Service address
              </h3>
              <div className="mt-2 flex gap-2 text-sm text-slate-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p>{job.serviceAddress}</p>
                  <p>
                    {job.city}, {job.state} {job.zip}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Assignment
              </h3>
              <div className="mt-2 space-y-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400" />
                  {job.assignedTechnician ?? "Unassigned"}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {formatScheduledDate(job.scheduledDate)} at{" "}
                  {formatScheduledTime(job.scheduledDate)}
                </div>
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-slate-400" />
                  {job.jobType}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status & priority
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <JobStatusBadge status={job.status} />
                <JobPriorityBadge priority={job.priority} />
              </div>
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
                Edit job
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
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
