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
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { JobCustomerQuickActions } from "@/shared/components/jobs/JobCustomerQuickActions";
import { JobWorkflowControls } from "@/shared/components/jobs/JobWorkflowControls";
import type {
  JobEstimateSummary,
  JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import { northStarDispatchTokens as dt } from "@/shared/design-system/north-star/tokens";
import { DispatchPriorityBadge } from "./DispatchPriorityBadge";
import { DispatchStatusBadge } from "./DispatchStatusBadge";

type DispatchDetailsPanelProps = {
  job: DispatchJob;
  technician: Technician | null;
  technicians: Technician[];
  canDispatchJobs: boolean;
  canUpdateJobWorkflow: boolean;
  canManageCustomers?: boolean;
  canViewBilling?: boolean;
  aiFeaturesEnabled?: boolean;
  billingContext?: {
    estimates: JobEstimateSummary[];
    invoices: JobInvoiceSummary[];
  };
  assignError: string | null;
  assignSuccess?: string | null;
  isAssignmentBusy: boolean;
  isOtherAssignmentPending?: boolean;
  northStar?: boolean;
  onClose: () => void;
  onAssign: (jobId: string, technicianId: string) => void;
  onUnassign?: (jobId: string) => void;
  onStatusUpdated?: (jobId: string, status: DispatchJob["status"]) => void;
  lockBodyScroll?: boolean;
  enableEscapeClose?: boolean;
};

export function DispatchDetailsPanel({
  job,
  technician,
  technicians,
  canDispatchJobs,
  canUpdateJobWorkflow,
  canManageCustomers = false,
  canViewBilling = false,
  aiFeaturesEnabled = false,
  billingContext,
  assignError,
  assignSuccess = null,
  isAssignmentBusy,
  isOtherAssignmentPending = false,
  northStar = false,
  onClose,
  onAssign,
  onUnassign,
  onStatusUpdated,
  lockBodyScroll = true,
  enableEscapeClose = false,
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
  const fullAddress = formatFullAddress(job);
  const hasAddress = Boolean(fullAddress.trim());
  const hasApprovedEstimate = billingContext?.estimates.some(
    (estimate) => estimate.status === "approved",
  );

  useEffect(() => {
    setSelectedTechnicianId(job.technicianId ?? "");
  }, [job.id, job.technicianId]);

  const isAssignmentControlsDisabled =
    isAssignmentBusy || isOtherAssignmentPending;

  useScrollLock(lockBodyScroll);
  useSheetEscape(onClose, enableEscapeClose);

  function handleAssignClick() {
    if (!canSubmitAssignment) {
      return;
    }

    onAssign(job.id, selectedTechnicianId);
  }

  function handleUnassignClick() {
    if (!showUnassign || isAssignmentControlsDisabled) {
      return;
    }

    onUnassign?.(job.id);
  }

  const shellClass = northStar
    ? dt.detailPanelShell
    : "admin-panel flex h-full max-h-full min-h-0 flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl";

  const headerClass = northStar
    ? dt.detailPanelHeader
    : "admin-panel-header flex shrink-0 items-start justify-between px-4 pb-4 sm:px-5 overlay-header-safe-mobile lg:py-4";

  const titleClass = northStar
    ? dt.detailPanelTitle
    : "text-base font-bold text-slate-900";

  const customerLinkClass = northStar
    ? dt.detailPanelCustomerLink
    : "text-xs text-slate-500 transition-colors hover:text-cyan-700";

  const closeButtonClass = northStar ? dt.detailPanelCloseButton : "admin-icon-btn";

  const bodyClass = northStar
    ? dt.detailPanelBody
    : "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-5";

  const sectionLabelClass = northStar
    ? dt.detailSectionLabel
    : "text-xs font-semibold uppercase tracking-wide text-slate-500";

  const identityCardClass = northStar
    ? dt.detailIdentityCard
    : "rounded-xl border border-slate-100 bg-white p-3 sm:p-4";

  const identityServiceClass = northStar
    ? dt.detailIdentityService
    : "text-sm text-slate-600";

  const identityMetaClass = northStar
    ? dt.detailIdentityMeta
    : "text-xs text-slate-500";

  const sectionDividerClass = northStar
    ? `space-y-3 border-b ${dt.detailSectionDivider} pb-4`
    : "space-y-3 border-b border-slate-100 pb-4";

  const addressIconClass = northStar
    ? "mt-0.5 h-4 w-4 shrink-0 text-[#D6BE78]"
    : "mt-0.5 h-4 w-4 shrink-0 text-slate-400";

  const assignmentCardClass = northStar
    ? dt.detailAssignmentCard
    : "rounded-xl border border-slate-100 bg-white p-3";

  const techAvatarClass = northStar
    ? dt.detailTechAvatar
    : "flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-white";

  const techNameClass = northStar
    ? dt.detailTechName
    : "text-sm font-semibold text-slate-900";

  const techRoleClass = northStar
    ? dt.detailTechRole
    : "text-xs text-slate-500";

  const techPhoneClass = northStar
    ? `${dt.detailTechPhone} mt-2 flex items-center gap-2`
    : "mt-2 flex items-center gap-2 text-xs text-slate-600";

  const unassignButtonClass = northStar
    ? dt.detailSecondaryButton
    : "inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2";

  const selectClass = northStar
    ? dt.detailSelect
    : "w-full min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60 sm:py-2";

  const assignButtonClass = northStar
    ? dt.detailPrimaryButton
    : "w-full min-h-11 rounded-lg bg-cyan-600 px-3 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2";

  const changeAssignmentDividerClass = northStar
    ? `space-y-2 border-t ${dt.detailSectionDivider} pt-3`
    : "space-y-2 border-t border-slate-100 pt-3";

  const unassignedClass = northStar
    ? dt.detailUnassignedBanner
    : "flex items-center gap-2 text-sm text-amber-700";

  const estimateHintClass = northStar
    ? dt.detailEstimateHint
    : "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900";

  const permissionNoteClass = northStar
    ? dt.detailPermissionNote
    : "rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600";

  const descriptionClass = northStar
    ? dt.detailBodyText
    : "mt-2 text-sm leading-relaxed text-slate-600";

  const footerDividerClass = northStar
    ? `flex gap-2 border-t ${dt.detailFooterDivider} pt-3`
    : "flex gap-2 border-t border-slate-100 pt-3";

  const footerLinkClass = northStar
    ? dt.detailFooterLink
    : "flex min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:py-2";

  const noTechniciansClass = northStar
    ? dt.detailMutedText
    : "text-xs text-slate-500";

  const pendingNoteClass = northStar
    ? `${dt.detailPendingNote} mt-2`
    : "mt-2 text-xs text-amber-700";

  return (
    <div className={shellClass}>
      {northStar ? (
        <div className={dt.detailPanelTopAccent} aria-hidden />
      ) : null}
      <div className={headerClass}>
        <div className="min-w-0 pr-3">
          <h2 id="dispatch-job-modal-title" className={titleClass}>
            {job.jobNumber}
          </h2>
          <p className={northStar ? dt.detailPanelSubtitle : "mt-0.5 text-xs text-slate-500"}>
            <CustomerNameLink
              customerId={job.customerId}
              customerName={job.customerName}
              canManageCustomers={canManageCustomers}
              linkClassName={customerLinkClass}
            />
          </p>
          {northStar ? (
            <p className="mt-1 truncate text-xs font-medium text-[#B8AD9E]">
              {job.jobType}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className={closeButtonClass}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className={bodyClass}>
        <div className="space-y-5">
          <section className={identityCardClass}>
            {!northStar ? (
              <div className="flex items-start justify-between gap-3">
                <p className={identityServiceClass}>{job.jobType}</p>
                <DispatchPriorityBadge priority={job.priority} />
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <p className={`${identityServiceClass} font-semibold text-[#FFF8E8]`}>
                  {job.jobType}
                </p>
                <DispatchPriorityBadge priority={job.priority} northStar />
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <DispatchStatusBadge status={job.status} northStar={northStar} />
              <span className={identityMetaClass}>
                {formatDispatchDate(job.scheduledDate)} ·{" "}
                <span className={northStar ? "font-semibold text-[#F3EBDD]" : ""}>
                  {formatDispatchTime(job.scheduledDate)}
                </span>
              </span>
            </div>
          </section>

          <div className={sectionDividerClass}>
            <h3 className={sectionLabelClass}>Workflow</h3>
            {canUpdateJobWorkflow ? (
              <div className={northStar ? "dispatch-north-star-workflow mt-2" : "mt-0"}>
                <JobWorkflowControls
                  jobId={job.id}
                  customerId={job.customerId}
                  initialStatus={job.status}
                  serviceAddress={job.serviceAddress}
                  city={job.city}
                  state={job.state}
                  zip={job.zip}
                  canUpdateStatus={canUpdateJobWorkflow}
                  aiFeaturesEnabled={aiFeaturesEnabled}
                  canCorrectStatus={canDispatchJobs}
                  canReopenJob={canDispatchJobs}
                  businessContext={billingContext}
                  businessActionOptions={{
                    canCreateEstimate: canViewBilling,
                    canViewBilling,
                  }}
                  reopenSnapshot={{
                    workStartedAt: job.workStartedAt,
                    arrivedAt: job.arrivedAt,
                    assignedTechnicianId: job.technicianId,
                  }}
                  layout="stack"
                  onStatusUpdated={(status) => onStatusUpdated?.(job.id, status)}
                />
              </div>
            ) : (
              <p className={permissionNoteClass}>
                You do not have permission to update this job&apos;s workflow.
              </p>
            )}
          </div>

          <section className="space-y-2">
            <h3 className={sectionLabelClass}>Contact</h3>
            <JobCustomerQuickActions
              customerPhone={job.customerPhone}
              customerEmail={job.customerEmail}
              serviceAddress={job.serviceAddress}
              city={job.city}
              state={job.state}
              zip={job.zip}
              northStar={northStar}
            />
          </section>

          {hasAddress ? (
            <section>
              <h3 className={sectionLabelClass}>Site context</h3>
              <div
                className={
                  northStar
                    ? `${dt.detailSiteContextCard} mt-2`
                    : "mt-2 flex gap-2 text-sm text-slate-700"
                }
              >
                {northStar ? (
                  <div className="flex gap-3">
                    <div className={dt.detailSiteContextIconWrap}>
                      <MapPin className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#D6BE78]">
                        Service address
                      </p>
                      <p className={`${dt.detailSiteContextAddress} mt-1 break-words`}>
                        {fullAddress}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <MapPin className={addressIconClass} />
                    <p className="min-w-0 break-words">{fullAddress}</p>
                  </>
                )}
              </div>
            </section>
          ) : null}

          <section>
            <h3 className={sectionLabelClass}>Assigned technician</h3>
            {isOtherAssignmentPending ? (
              <p className={pendingNoteClass} role="status">
                Another assignment is still in progress.
              </p>
            ) : null}
            {isAssigned ? (
              <div className="mt-2 space-y-3">
                <div className={assignmentCardClass}>
                  <div className="flex items-center gap-3">
                    <div className={techAvatarClass}>
                      {displayTechnician?.initials ?? "?"}
                    </div>
                    <div>
                      <p className={techNameClass}>
                        {displayTechnician?.name ?? "Assigned technician"}
                      </p>
                      <p className={techRoleClass}>
                        {displayTechnician?.role ?? "Team member"}
                      </p>
                    </div>
                  </div>
                  {displayTechnician?.phone ? (
                    <div className={techPhoneClass}>
                      <Phone className="h-3.5 w-3.5" />
                      {displayTechnician.phone}
                    </div>
                  ) : null}
                </div>

                {showUnassign && onUnassign ? (
                  <button
                    type="button"
                    onClick={handleUnassignClick}
                    disabled={isAssignmentControlsDisabled}
                    className={unassignButtonClass}
                  >
                    <UserMinus className="h-4 w-4" />
                    {isAssignmentBusy ? "Unassigning..." : "Unassign technician"}
                  </button>
                ) : null}

                {canDispatchJobs && technicians.length > 0 ? (
                  <div className={changeAssignmentDividerClass}>
                    <label
                      htmlFor="change-technician"
                      className={sectionLabelClass}
                    >
                      Change assignment
                    </label>
                    <select
                      id="change-technician"
                      value={selectedTechnicianId}
                      onChange={(event) =>
                        setSelectedTechnicianId(event.target.value)
                      }
                      disabled={isAssignmentControlsDisabled}
                      className={selectClass}
                    >
                      <option value="">Select a team member</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name}
                        </option>
                      ))}
                    </select>
                    {assignError ? (
                      <p className="break-words text-xs text-red-600" role="alert">
                        {assignError}
                      </p>
                    ) : null}
                    {assignSuccess ? (
                      <p className="text-xs text-emerald-700">{assignSuccess}</p>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleAssignClick}
                      disabled={!canSubmitAssignment || isAssignmentControlsDisabled}
                      className={assignButtonClass}
                    >
                      {isAssignmentBusy ? "Assigning..." : "Change technician"}
                    </button>
                  </div>
                ) : canDispatchJobs && (assignError || assignSuccess) ? (
                  <div className={changeAssignmentDividerClass}>
                    {assignError ? (
                      <p className="break-words text-xs text-red-600" role="alert">
                        {assignError}
                      </p>
                    ) : null}
                    {assignSuccess ? (
                      <p className="text-xs text-emerald-700">{assignSuccess}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-2 space-y-3">
                <div className="space-y-2">
                  <div className={unassignedClass}>
                    <User className="h-4 w-4 shrink-0" />
                    Unassigned — awaiting dispatch
                  </div>
                  {hasApprovedEstimate ? (
                    <p className={estimateHintClass}>
                      Approved estimate ready to schedule
                    </p>
                  ) : null}
                </div>

                {canDispatchJobs && technicians.length > 0 ? (
                  <div className="space-y-2">
                    <label
                      htmlFor="assign-technician"
                      className={sectionLabelClass}
                    >
                      Assign technician
                    </label>
                    <select
                      id="assign-technician"
                      value={selectedTechnicianId}
                      onChange={(event) =>
                        setSelectedTechnicianId(event.target.value)
                      }
                      disabled={isAssignmentControlsDisabled}
                      className={selectClass}
                    >
                      <option value="">Select a team member</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name}
                        </option>
                      ))}
                    </select>
                    {assignError ? (
                      <p className="break-words text-xs text-red-600" role="alert">
                        {assignError}
                      </p>
                    ) : null}
                    {assignSuccess ? (
                      <p className="text-xs text-emerald-700">{assignSuccess}</p>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleAssignClick}
                      disabled={!canSubmitAssignment || isAssignmentControlsDisabled}
                      className={assignButtonClass}
                    >
                      {isAssignmentBusy ? "Assigning..." : "Assign technician"}
                    </button>
                  </div>
                ) : canDispatchJobs ? (
                  <p className={noTechniciansClass}>
                    No team members are available. Add active company members
                    to enable assignments.
                  </p>
                ) : null}
              </div>
            )}
          </section>

          {job.description ? (
            <section>
              <h3 className={sectionLabelClass}>Description</h3>
              <p className={`mt-2 ${descriptionClass}`}>{job.description}</p>
            </section>
          ) : null}

          {job.notes ? (
            <section>
              <h3 className={sectionLabelClass}>Notes</h3>
              <p className={`mt-2 ${descriptionClass}`}>{job.notes}</p>
            </section>
          ) : null}

          <div className={footerDividerClass}>
            <Link href={`/jobs/${job.id}`} className={footerLinkClass}>
              View full job details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
