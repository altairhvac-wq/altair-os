"use client";

import { useEffect, useState } from "react";
import {
  Camera,
  Calculator,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  MapPin,
  Package,
  Receipt,
  User,
} from "lucide-react";
import { JobWorkflowControls } from "@/shared/components/jobs/JobWorkflowControls";
import { hasCompleteServiceAddress } from "@/shared/lib/maps";
import type { JobStatus } from "@/shared/types/job";
import {
  formatJobPriority,
  formatTechnicianJobAddress,
  formatTechnicianJobTime,
  getPriorityStyles,
  type TechnicianJob,
} from "@/shared/types/technician";
import { shouldAcceptServerWorkflowStatus } from "@/shared/types/job-workflow";
import { TechnicianJobStatusBadge } from "./TechnicianJobStatusBadge";
import type { TechnicianTimeStateSnapshot } from "@/shared/types/time-entry";
import { getCreateEstimateJobBlockReason } from "@/shared/types/estimate";
import { TechnicianCustomerQuickActions } from "./TechnicianCustomerQuickActions";
import { TechnicianEstimateSheet } from "./TechnicianEstimateSheet";
import { TechnicianExpenseSheet } from "./TechnicianExpenseSheet";
import { TechnicianJobEquipmentSummary } from "./TechnicianJobEquipmentSummary";
import { TechnicianJobLaborStatus } from "./TechnicianJobLaborStatus";
import { TechnicianMaterialSheet } from "./TechnicianMaterialSheet";
import { TechnicianPhotoSheet } from "./TechnicianPhotoSheet";
import type { ServiceItem } from "@/shared/types/service-item";

type TechnicianJobCardProps = {
  job: TechnicianJob;
  timeState: TechnicianTimeStateSnapshot;
  serviceItems: ServiceItem[];
  defaultTaxRate: number;
  canCreateEstimate: boolean;
  canManageTime?: boolean;
  defaultExpanded?: boolean;
  emphasized?: boolean;
  /** Deck context label for the visible card in TechnicianJobDeck. */
  deckBadge?: "current" | "active";
  onTimeStateChange?: (state: TechnicianTimeStateSnapshot) => void;
  onStatusUpdated?: (status: JobStatus) => void;
};

const fieldActionClass =
  "inline-flex min-h-11 min-w-11 touch-manipulation flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors";

const emptyStateClass = "text-sm text-slate-500";

const stickyFooterClass =
  "admin-sticky-footer-inline sticky bottom-0 z-10 shrink-0 space-y-2 p-2.5";

export function TechnicianJobCard({
  job,
  timeState,
  serviceItems,
  defaultTaxRate,
  canCreateEstimate,
  canManageTime = false,
  defaultExpanded = true,
  emphasized = false,
  deckBadge,
  onTimeStateChange,
  onStatusUpdated,
}: TechnicianJobCardProps) {
  const [status, setStatus] = useState(job.status);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [activeSheet, setActiveSheet] = useState<
    "material" | "expense" | "photo" | "estimate" | null
  >(null);
  const [completeSheetOpen, setCompleteSheetOpen] = useState(false);

  useEffect(() => {
    setStatus((current) =>
      shouldAcceptServerWorkflowStatus(current, job.status) ? job.status : current,
    );
  }, [job.status]);

  useEffect(() => {
    if (status === "completed" || status === "cancelled") {
      setActiveSheet(null);
      setCompleteSheetOpen(false);
    }
  }, [status]);

  function handleStatusUpdated(nextStatus: JobStatus) {
    setStatus(nextStatus);
    onStatusUpdated?.(nextStatus);
  }

  const hasDescription = Boolean(job.description?.trim());
  const hasNotes = Boolean(job.notes?.trim());
  const hasCompleteAddress = hasCompleteServiceAddress({
    serviceAddress: job.serviceAddress,
    city: job.city,
    state: job.state,
    zip: job.zip,
  });
  const isActive = status !== "completed" && status !== "cancelled";
  const fieldActionsDisabled = activeSheet !== null || completeSheetOpen;
  const hasOpenSheet = activeSheet !== null || completeSheetOpen;
  const showCreateEstimate =
    canCreateEstimate &&
    Boolean(job.customerId?.trim()) &&
    getCreateEstimateJobBlockReason(status) === null;

  const isActiveDeckJob = deckBadge === "active";

  return (
    <article
      className={`relative flex flex-col rounded-2xl border bg-white ${
        isActiveDeckJob
          ? "border-cyan-400 shadow-md ring-2 ring-cyan-500/35"
          : emphasized
            ? "border-cyan-300 shadow-sm ring-2 ring-cyan-500/20"
            : deckBadge === "current"
              ? "border-slate-300 shadow-md ring-1 ring-slate-200/80"
              : "border-slate-200 shadow-sm"
      }`}
    >
      <div className="shrink-0 border-b border-slate-100 p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {deckBadge ? (
              <p
                className={
                  isActiveDeckJob
                    ? "inline-flex rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-cyan-800"
                    : "text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                }
              >
                {isActiveDeckJob ? "Active Job" : "Current Job"}
              </p>
            ) : null}
            <h2
              className={`truncate text-base font-bold text-slate-900 ${
                deckBadge ? "mt-1" : ""
              }`}
            >
              {job.jobNumber}
            </h2>
            <p className="truncate text-sm text-slate-600">
              {job.jobType}
            </p>
            {!expanded ? (
              <p className="mt-1 truncate text-sm text-slate-700">
                {job.customerName}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            disabled={hasOpenSheet}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse job details" : "Expand job details"}
            title={
              hasOpenSheet
                ? "Close open forms before collapsing this job"
                : undefined
            }
            className="flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {expanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
        </div>

        <div
          className={`mt-2 flex flex-wrap items-center gap-1.5 ${
            isActiveDeckJob ? "rounded-lg bg-cyan-50/70 px-1.5 py-1" : ""
          }`}
        >
          <TechnicianJobStatusBadge status={status} />
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${getPriorityStyles(job.priority)}`}
          >
            {formatJobPriority(job.priority)}
          </span>
        </div>

        {canManageTime && deckBadge ? (
          <TechnicianJobLaborStatus jobId={job.id} timeState={timeState} />
        ) : null}

        {!expanded ? (
          <div className="mt-2 space-y-2">
            <TechnicianCustomerQuickActions job={job} showEmptyState />
            <JobWorkflowControls
              jobId={job.id}
              customerId={job.customerId}
              initialStatus={status}
              serviceAddress={job.serviceAddress}
              city={job.city}
              state={job.state}
              zip={job.zip}
              canUpdateStatus
              layout="stack"
              competingSheetActive={activeSheet !== null}
              onCompleteSheetOpenChange={setCompleteSheetOpen}
              onStatusUpdated={handleStatusUpdated}
            />
          </div>
        ) : null}
      </div>

      {expanded ? (
        <>
          <div className="min-h-0 space-y-2 p-2.5">
            <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-sm text-slate-700">
              <div className="flex items-start gap-2">
                <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="font-semibold text-slate-900">{job.customerName}</span>
              </div>
              <div className="mt-1 flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                {hasCompleteAddress ? (
                  <span className="break-words">{formatTechnicianJobAddress(job)}</span>
                ) : (
                  <span className={emptyStateClass}>
                    No address — contact dispatch
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>{formatTechnicianJobTime(job.scheduledDate)}</span>
              </div>
            </div>

            <TechnicianCustomerQuickActions job={job} showEmptyState />

            {hasDescription ? (
              <details className="rounded-lg border border-slate-200 bg-slate-50/60" open>
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-600 marker:content-none [&::-webkit-details-marker]:hidden">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  Summary
                </summary>
                <p className="border-t border-slate-100 px-2.5 py-2 text-sm leading-snug text-slate-800">
                  {job.description}
                </p>
              </details>
            ) : null}

            <TechnicianJobEquipmentSummary
              customerId={job.customerId}
              expanded={expanded}
            />

            {hasNotes ? (
              <details className="rounded-lg border border-slate-200 bg-slate-50/60">
                <summary className="flex min-h-11 cursor-pointer list-none items-center px-2.5 py-2 text-xs font-semibold text-slate-600 marker:content-none [&::-webkit-details-marker]:hidden">
                  Office notes
                </summary>
                <p className="border-t border-slate-100 px-2.5 py-2 text-sm leading-snug text-slate-700">
                  {job.notes}
                </p>
              </details>
            ) : null}
          </div>

          <div className={stickyFooterClass}>
            <JobWorkflowControls
              jobId={job.id}
              customerId={job.customerId}
              initialStatus={status}
              serviceAddress={job.serviceAddress}
              city={job.city}
              state={job.state}
              zip={job.zip}
              canUpdateStatus
              layout="stack"
              competingSheetActive={activeSheet !== null}
              onCompleteSheetOpenChange={setCompleteSheetOpen}
              onStatusUpdated={handleStatusUpdated}
            />
            {isActive ? (
              <>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    disabled={fieldActionsDisabled}
                    onClick={() => setActiveSheet("material")}
                    className={`${fieldActionClass} border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60`}
                    title={
                      fieldActionsDisabled
                        ? completeSheetOpen
                          ? "Finish or cancel complete work before logging material"
                          : "Finish the open form before logging material"
                        : undefined
                    }
                  >
                    <Package className="h-4 w-4 shrink-0" />
                    <span className="truncate">Material</span>
                  </button>
                  <button
                    type="button"
                    disabled={fieldActionsDisabled}
                    onClick={() => setActiveSheet("expense")}
                    className={`${fieldActionClass} border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60`}
                    title={
                      fieldActionsDisabled
                        ? completeSheetOpen
                          ? "Finish or cancel complete work before logging a receipt"
                          : "Finish the open form before logging a receipt"
                        : undefined
                    }
                  >
                    <Receipt className="h-4 w-4 shrink-0" />
                    <span className="truncate">Receipt</span>
                  </button>
                  <button
                    type="button"
                    disabled={fieldActionsDisabled}
                    onClick={() => setActiveSheet("photo")}
                    className={`${fieldActionClass} border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60`}
                    title={
                      fieldActionsDisabled
                        ? completeSheetOpen
                          ? "Finish or cancel complete work before adding a photo"
                          : "Finish the open form before adding a photo"
                        : undefined
                    }
                  >
                    <Camera className="h-4 w-4 shrink-0" />
                    <span className="truncate">Photo</span>
                  </button>
                  {showCreateEstimate ? (
                    <button
                      type="button"
                      disabled={fieldActionsDisabled}
                      onClick={() => setActiveSheet("estimate")}
                      className={`${fieldActionClass} border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60`}
                      title={
                        fieldActionsDisabled
                          ? completeSheetOpen
                            ? "Finish or cancel complete work before creating an estimate"
                            : "Finish the open form before creating an estimate"
                          : undefined
                      }
                    >
                      <Calculator className="h-4 w-4 shrink-0" />
                      <span className="truncate">Estimate</span>
                    </button>
                  ) : null}
                </div>
                {fieldActionsDisabled ? (
                  <p className="text-[11px] text-slate-500 sm:text-xs">
                    {completeSheetOpen
                      ? "Finish complete work first."
                      : "Close the open form first."}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </>
      ) : null}

      {activeSheet === "material" ? (
        <TechnicianMaterialSheet
          jobId={job.id}
          jobNumber={job.jobNumber}
          serviceItems={serviceItems}
          onClose={() => setActiveSheet(null)}
        />
      ) : null}

      {activeSheet === "expense" ? (
        <TechnicianExpenseSheet
          jobId={job.id}
          jobNumber={job.jobNumber}
          onClose={() => setActiveSheet(null)}
        />
      ) : null}

      {activeSheet === "photo" ? (
        <TechnicianPhotoSheet
          jobId={job.id}
          jobNumber={job.jobNumber}
          onClose={() => setActiveSheet(null)}
        />
      ) : null}

      {activeSheet === "estimate" ? (
        <TechnicianEstimateSheet
          jobId={job.id}
          jobNumber={job.jobNumber}
          customerName={job.customerName}
          serviceItems={serviceItems}
          defaultTaxRate={defaultTaxRate}
          onClose={() => setActiveSheet(null)}
        />
      ) : null}
    </article>
  );
}
