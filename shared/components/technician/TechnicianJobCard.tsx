"use client";

import { useEffect, useState } from "react";
import {
  Camera,
  Calculator,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Mail,
  MapPin,
  Navigation,
  Package,
  Phone,
  Receipt,
} from "lucide-react";
import { JobWorkflowControls } from "@/shared/components/jobs/JobWorkflowControls";
import { buildGoogleMapsDirectionsUrl, hasCompleteServiceAddress } from "@/shared/lib/maps";
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
import { TechnicianEstimateSheet } from "./TechnicianEstimateSheet";
import { TechnicianExpenseSheet } from "./TechnicianExpenseSheet";
import { TechnicianJobEquipmentSummary } from "./TechnicianJobEquipmentSummary";
import { TechnicianJobLaborStatus } from "./TechnicianJobLaborStatus";
import { TechnicianJobShiftStatus } from "./TechnicianJobShiftStatus";
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

const secondaryActionClass =
  "inline-flex min-h-10 min-w-0 touch-manipulation flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors";

const utilityActionClass =
  "inline-flex min-h-10 min-w-0 touch-manipulation flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-1.5 text-[11px] font-semibold transition-colors";

const detailsClass = "rounded-lg border border-slate-200 bg-slate-50/80";
const detailsSummaryClass =
  "flex min-h-9 cursor-pointer list-none items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-slate-600 marker:content-none [&::-webkit-details-marker]:hidden";

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
  const mapsUrl = buildGoogleMapsDirectionsUrl({
    serviceAddress: job.serviceAddress,
    city: job.city,
    state: job.state,
    zip: job.zip,
  });
  const hasPhone = Boolean(job.customerPhone?.trim());
  const hasEmail = Boolean(job.customerEmail?.trim());
  const hasMaps = Boolean(mapsUrl);
  const isActive = status !== "completed" && status !== "cancelled";
  const fieldActionsDisabled = activeSheet !== null || completeSheetOpen;
  const hasOpenSheet = activeSheet !== null || completeSheetOpen;
  const showCreateEstimate =
    canCreateEstimate &&
    Boolean(job.customerId?.trim()) &&
    getCreateEstimateJobBlockReason(status) === null;

  const isActiveDeckJob = deckBadge === "active";

  const workflowControls = (
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
      showMobileHint={false}
      competingSheetActive={activeSheet !== null}
      onCompleteSheetOpenChange={setCompleteSheetOpen}
      onStatusUpdated={handleStatusUpdated}
    />
  );

  const secondaryActionsRow =
    isActive &&
    (showCreateEstimate || hasPhone || hasEmail || hasMaps) ? (
      <div className="flex gap-1.5">
        {showCreateEstimate ? (
          <button
            type="button"
            disabled={fieldActionsDisabled}
            onClick={() => setActiveSheet("estimate")}
            className={`${secondaryActionClass} border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60`}
            title={
              fieldActionsDisabled
                ? completeSheetOpen
                  ? "Finish or cancel complete work before creating an estimate"
                  : "Finish the open form before creating an estimate"
                : undefined
            }
          >
            <Calculator className="h-3.5 w-3.5 shrink-0" />
            Estimate
          </button>
        ) : null}
        {hasPhone ? (
          <a
            href={`tel:${job.customerPhone}`}
            className={`${secondaryActionClass} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}
          >
            <Phone className="h-3.5 w-3.5 shrink-0" />
            Call
          </a>
        ) : null}
        {hasMaps ? (
          <a
            href={mapsUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className={`${secondaryActionClass} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          >
            <Navigation className="h-3.5 w-3.5 shrink-0" />
            Maps
          </a>
        ) : null}
        {hasEmail ? (
          <a
            href={`mailto:${job.customerEmail}`}
            className={`${secondaryActionClass} border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100`}
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            Email
          </a>
        ) : null}
      </div>
    ) : null;

  const utilityActionsRow = isActive ? (
    <div className="grid grid-cols-3 gap-1.5">
      <button
        type="button"
        disabled={fieldActionsDisabled}
        onClick={() => setActiveSheet("photo")}
        className={`${utilityActionClass} border-violet-200/80 bg-violet-50/80 text-violet-800 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60`}
        title={
          fieldActionsDisabled
            ? completeSheetOpen
              ? "Finish or cancel complete work before adding a photo"
              : "Finish the open form before adding a photo"
            : undefined
        }
      >
        <Camera className="h-4 w-4 shrink-0" />
        Photos
      </button>
      <button
        type="button"
        disabled={fieldActionsDisabled}
        onClick={() => setActiveSheet("material")}
        className={`${utilityActionClass} border-cyan-200/80 bg-cyan-50/80 text-cyan-800 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60`}
        title={
          fieldActionsDisabled
            ? completeSheetOpen
              ? "Finish or cancel complete work before logging material"
              : "Finish the open form before logging material"
            : undefined
        }
      >
        <Package className="h-4 w-4 shrink-0" />
        Materials
      </button>
      <button
        type="button"
        disabled={fieldActionsDisabled}
        onClick={() => setActiveSheet("expense")}
        className={`${utilityActionClass} border-amber-200/80 bg-amber-50/80 text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60`}
        title={
          fieldActionsDisabled
            ? completeSheetOpen
              ? "Finish or cancel complete work before logging a receipt"
              : "Finish the open form before logging a receipt"
            : undefined
        }
      >
        <Receipt className="h-4 w-4 shrink-0" />
        Receipts
      </button>
    </div>
  ) : null;

  const jobDetailsBlock = expanded ? (
    <div className="space-y-1 px-2 pb-1.5 pt-0.5 text-sm text-slate-700">
      <p className="truncate font-semibold text-slate-900">{job.customerName}</p>
      <p className="flex items-start gap-1 text-xs leading-snug text-slate-600">
        <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" aria-hidden />
        <span className="min-w-0 break-words">
          {hasCompleteAddress
            ? formatTechnicianJobAddress(job)
            : "No address — contact dispatch"}
        </span>
      </p>
      <p className="flex items-center gap-1 text-[11px] text-slate-500">
        <Clock className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
        {formatTechnicianJobTime(job.scheduledDate)}
      </p>
    </div>
  ) : (
    <p className="truncate px-2 pb-1 text-sm font-medium text-slate-700">
      {job.customerName}
    </p>
  );

  const referenceDetails = expanded ? (
    <div className="space-y-1 border-t border-slate-100 px-2 py-1.5">
      <TechnicianJobEquipmentSummary customerId={job.customerId} />

      {hasDescription ? (
        <details className={detailsClass}>
          <summary className={detailsSummaryClass}>
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            Summary
          </summary>
          <p className="border-t border-slate-100 px-2 py-1.5 text-sm leading-snug text-slate-800">
            {job.description}
          </p>
        </details>
      ) : null}

      {hasNotes ? (
        <details className={detailsClass}>
          <summary className={detailsSummaryClass}>Office notes</summary>
          <p className="border-t border-slate-100 px-2 py-1.5 text-sm leading-snug text-slate-700">
            {job.notes}
          </p>
        </details>
      ) : null}
    </div>
  ) : null;

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white ${
        isActiveDeckJob
          ? "border-cyan-500 shadow-lg ring-2 ring-cyan-500/30"
          : emphasized
            ? "border-cyan-400 shadow-md ring-2 ring-cyan-500/20"
            : deckBadge === "current"
              ? "border-slate-300 shadow-md ring-1 ring-slate-200/80"
              : "border-slate-200 shadow-sm"
      }`}
    >
      <div
        className={`shrink-0 px-2 pt-2 ${
          isActiveDeckJob ? "bg-gradient-to-b from-cyan-50/70 to-white" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            {deckBadge ? (
              <p
                className={
                  isActiveDeckJob
                    ? "inline-flex rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                    : "text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                }
              >
                {isActiveDeckJob ? "Active Job" : "Current Job"}
              </p>
            ) : null}
            <h2
              className={`truncate text-lg font-bold leading-tight text-slate-900 ${
                deckBadge ? "mt-0.5" : ""
              }`}
            >
              {job.jobNumber}
            </h2>
            <p className="truncate text-sm text-slate-600">{job.jobType}</p>
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
            className="flex min-h-10 min-w-10 shrink-0 touch-manipulation items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {expanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1">
          <TechnicianJobStatusBadge status={status} />
          <span
            className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${getPriorityStyles(job.priority)}`}
          >
            {formatJobPriority(job.priority)}
          </span>
        </div>

        {jobDetailsBlock}

        {canManageTime && deckBadge ? (
          <div className="space-y-1 px-2 pb-1">
            <TechnicianJobShiftStatus jobId={job.id} timeState={timeState} compact />
            <TechnicianJobLaborStatus jobId={job.id} timeState={timeState} compact />
          </div>
        ) : null}
      </div>

      <div className="space-y-1.5 px-2 py-2">
        {workflowControls}
        {secondaryActionsRow}
        {utilityActionsRow}
      </div>

      {referenceDetails}

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
