"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useScrollLock, useSheetEscape } from "@/shared/hooks/useScrollLock";
import { MapPin, Phone, User, UserMinus, X } from "lucide-react";
import {
  canUnassignJobTechnician,
  formatDispatchDate,
  formatDispatchTime,
  formatFullAddress,
  hasAssignedJobTechnician,
  type DispatchJob,
  type Technician,
} from "@/shared/types/dispatch";
import { JobCustomerQuickActions } from "@/shared/components/jobs/JobCustomerQuickActions";
import { JobWorkflowControls } from "@/shared/components/jobs/JobWorkflowControls";
import { DispatchPriorityBadge } from "./DispatchPriorityBadge";
import { DispatchStatusBadge } from "./DispatchStatusBadge";

type DispatchDetailsPanelProps = {
  job: DispatchJob;
  technician: Technician | null;
  technicians: Technician[];
  canDispatchJobs: boolean;
  canUpdateJobWorkflow: boolean;
  assignError: string | null;
  assignSuccess?: string | null;
  isAssignmentBusy: boolean;
  onClose: () => void;
  onAssign: (jobId: string, technicianId: string) => void;
  onUnassign?: (jobId: string) => void;
  onStatusUpdated?: (jobId: string, status: DispatchJob["status"]) => void;
  lockBodyScroll?: boolean;
};

export function DispatchDetailsPanel({
  job,
  technician,
  technicians,
  canDispatchJobs,
  canUpdateJobWorkflow,
  assignError,
  assignSuccess = null,
  isAssignmentBusy,
  onClose,
  onAssign,
  onUnassign,
  onStatusUpdated,
  lockBodyScroll = true,
}: DispatchDetailsPanelProps) {
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const isAssigned = hasAssignedJobTechnician(job);
  const assignedTechnicianId = job.technicianId;
  const displayTechnician =
    technician ??
    (assignedTechnicianId
      ? (technicians.find((tech) => tech.id === assignedTechnicianId) ?? null)
      : null);
  const showUnassign = canUnassignJobTechnician(job, canDispatchJobs);
  const hasSelectionChanged =
    Boolean(selectedTechnicianId) &&
    Boolean(job.technicianId) &&
    selectedTechnicianId !== job.technicianId;
  const canSubmitAssignment =
    Boolean(selectedTechnicianId) &&
    (job.technicianId ? hasSelectionChanged : selectedTechnicianId.length > 0);

  useEffect(() => {
    setSelectedTechnicianId(job.technicianId ?? "");
  }, [job.id, job.technicianId]);

  useScrollLock(lockBodyScroll);
  useSheetEscape(onClose, !lockBodyScroll);

  function handleAssignClick() {
    if (!canSubmitAssignment) {
      return;
    }

    onAssign(job.id, selectedTechnicianId);
  }

  function handleUnassignClick() {
    if (!showUnassign || isAssignmentBusy) {
      return;
    }

    onUnassign?.(job.id);
  }

  return (
    <div className="flex h-full max-h-full min-h-0 flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl sm:rounded-2xl">
      <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-4 py-4 sm:px-5">
        <div className="min-w-0 pr-3">
          <h2
            id="dispatch-job-modal-title"
            className="text-base font-bold text-slate-900"
          >
            {job.jobNumber}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">{job.customerName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-5">
        <div className="space-y-5">
            <section className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-600">{job.jobType}</p>
                <DispatchPriorityBadge priority={job.priority} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <DispatchStatusBadge status={job.status} />
                <span className="text-xs text-slate-500">
                  {formatDispatchDate(job.scheduledDate)} ·{" "}
                  {formatDispatchTime(job.scheduledDate)}
                </span>
              </div>
            </section>

            <div className="space-y-3 border-b border-slate-100 pb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Workflow
              </h3>
              {canUpdateJobWorkflow ? (
                <JobWorkflowControls
                  jobId={job.id}
                  customerId={job.customerId}
                  initialStatus={job.status}
                  serviceAddress={job.serviceAddress}
                  city={job.city}
                  state={job.state}
                  zip={job.zip}
                  canUpdateStatus={canUpdateJobWorkflow}
                  canCorrectStatus={canDispatchJobs}
                  canReopenJob={canDispatchJobs}
                  reopenSnapshot={{
                    workStartedAt: job.workStartedAt,
                    arrivedAt: job.arrivedAt,
                    assignedTechnicianId: job.technicianId,
                  }}
                  layout="stack"
                  onStatusUpdated={(status) => onStatusUpdated?.(job.id, status)}
                />
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  You do not have permission to update this job&apos;s workflow.
                </p>
              )}
            </div>

            <JobCustomerQuickActions
              customerPhone={job.customerPhone}
              customerEmail={job.customerEmail}
              serviceAddress={job.serviceAddress}
              city={job.city}
              state={job.state}
              zip={job.zip}
            />

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Service address
              </h3>
              <div className="mt-2 flex gap-2 text-sm text-slate-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <p className="min-w-0 break-words">{formatFullAddress(job)}</p>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Assigned technician
              </h3>
              {isAssigned ? (
                <div className="mt-2 space-y-3">
                  <div className="rounded-xl border border-slate-100 bg-white p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-white">
                        {displayTechnician?.initials ?? "?"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {displayTechnician?.name ?? "Assigned technician"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {displayTechnician?.role ?? "Team member"}
                        </p>
                      </div>
                    </div>
                    {displayTechnician?.phone ? (
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {displayTechnician.phone}
                      </div>
                    ) : null}
                  </div>

                  {showUnassign && onUnassign ? (
                    <button
                      type="button"
                      onClick={handleUnassignClick}
                      disabled={isAssignmentBusy}
                      className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2"
                    >
                      <UserMinus className="h-4 w-4" />
                      {isAssignmentBusy ? "Unassigning..." : "Unassign technician"}
                    </button>
                  ) : null}

                  {canDispatchJobs && technicians.length > 0 ? (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <label
                        htmlFor="change-technician"
                        className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        Change assignment
                      </label>
                      <select
                        id="change-technician"
                        value={selectedTechnicianId}
                        onChange={(event) =>
                          setSelectedTechnicianId(event.target.value)
                        }
                        disabled={isAssignmentBusy}
                        className="w-full min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60 sm:py-2"
                      >
                        <option value="">Select a team member</option>
                        {technicians.map((tech) => (
                          <option key={tech.id} value={tech.id}>
                            {tech.name}
                          </option>
                        ))}
                      </select>
                      {assignError ? (
                        <p className="break-words text-xs text-red-600" role="alert">{assignError}</p>
                      ) : null}
                      {assignSuccess ? (
                        <p className="text-xs text-emerald-700">{assignSuccess}</p>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleAssignClick}
                        disabled={!canSubmitAssignment || isAssignmentBusy}
                        className="w-full min-h-11 rounded-lg bg-cyan-600 px-3 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2"
                      >
                        {isAssignmentBusy ? "Assigning..." : "Change technician"}
                      </button>
                    </div>
                  ) : canDispatchJobs && (assignError || assignSuccess) ? (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      {assignError ? (
                        <p className="break-words text-xs text-red-600" role="alert">{assignError}</p>
                      ) : null}
                      {assignSuccess ? (
                        <p className="text-xs text-emerald-700">{assignSuccess}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-2 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-amber-700">
                    <User className="h-4 w-4" />
                    Unassigned — awaiting dispatch
                  </div>

                  {canDispatchJobs && technicians.length > 0 ? (
                    <div className="space-y-2">
                      <label
                        htmlFor="assign-technician"
                        className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        Assign technician
                      </label>
                      <select
                        id="assign-technician"
                        value={selectedTechnicianId}
                        onChange={(event) =>
                          setSelectedTechnicianId(event.target.value)
                        }
                        disabled={isAssignmentBusy}
                        className="w-full min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60 sm:py-2"
                      >
                        <option value="">Select a team member</option>
                        {technicians.map((tech) => (
                          <option key={tech.id} value={tech.id}>
                            {tech.name}
                          </option>
                        ))}
                      </select>
                      {assignError ? (
                        <p className="break-words text-xs text-red-600" role="alert">{assignError}</p>
                      ) : null}
                      {assignSuccess ? (
                        <p className="text-xs text-emerald-700">{assignSuccess}</p>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleAssignClick}
                        disabled={!canSubmitAssignment || isAssignmentBusy}
                        className="w-full min-h-11 rounded-lg bg-cyan-600 px-3 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2"
                      >
                        {isAssignmentBusy ? "Assigning..." : "Assign technician"}
                      </button>
                    </div>
                  ) : canDispatchJobs ? (
                    <p className="text-xs text-slate-500">
                      No team members are available. Add active company members
                      to enable assignments.
                    </p>
                  ) : null}
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

          <div className="flex gap-2 border-t border-slate-100 pt-3">
            <Link
              href={`/jobs/${job.id}`}
              className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:py-2"
            >
              View full job details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
