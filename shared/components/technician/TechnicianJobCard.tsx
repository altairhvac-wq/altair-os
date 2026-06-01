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
  StickyNote,
} from "lucide-react";
import { JobSummaryAiAssistant } from "@/shared/components/jobs/JobSummaryAiAssistant";
import { JobWorkflowControls } from "@/shared/components/jobs/JobWorkflowControls";
import { buildGoogleMapsDirectionsUrl, hasCompleteServiceAddress } from "@/shared/lib/maps";
import {
  selectActiveEstimate,
  type JobEstimateSummary,
  type JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
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
import { TechnicianEstimateApprovalSheet } from "./TechnicianEstimateApprovalSheet";
import { TechnicianExpenseSheet } from "./TechnicianExpenseSheet";
import { TechnicianJobEquipmentSummary } from "./TechnicianJobEquipmentSummary";
import { TechnicianJobLaborStatus } from "./TechnicianJobLaborStatus";
import { TechnicianJobShiftStatus } from "./TechnicianJobShiftStatus";
import { TechnicianMaterialSheet } from "./TechnicianMaterialSheet";
import { TechnicianPhotoSheet } from "./TechnicianPhotoSheet";
import type { ServiceItem } from "@/shared/types/service-item";
import {
  technicianFieldActiveCardClass,
  technicianFieldActiveJobPillClass,
  technicianFieldContactPrimaryClass,
  technicianFieldContactSecondaryClass,
  technicianFieldCurrentDeckCardClass,
  technicianFieldEmphasizedCardClass,
  technicianFieldJobDetailsClass,
  technicianFieldJobDetailsSummaryClass,
  technicianFieldUtilityActionClass,
} from "./technician-field-styles";

type TechnicianJobCardProps = {
  job: TechnicianJob;
  timeState: TechnicianTimeStateSnapshot;
  serviceItems: ServiceItem[];
  defaultTaxRate: number;
  canCreateEstimate: boolean;
  canApproveOnSite?: boolean;
  canViewBilling?: boolean;
  aiFeaturesEnabled?: boolean;
  billingContext?: {
    estimates: JobEstimateSummary[];
    invoices: JobInvoiceSummary[];
  };
  canManageTime?: boolean;
  defaultExpanded?: boolean;
  emphasized?: boolean;
  /** Deck context label for the visible card in TechnicianJobDeck. */
  deckBadge?: "current" | "active";
  onTimeStateChange?: (state: TechnicianTimeStateSnapshot) => void;
  onStatusUpdated?: (status: JobStatus) => void;
};

const detailsClass = technicianFieldJobDetailsClass;
const detailsSummaryClass = technicianFieldJobDetailsSummaryClass;

export function TechnicianJobCard({
  job,
  timeState,
  serviceItems,
  defaultTaxRate,
  canCreateEstimate,
  canApproveOnSite = false,
  canViewBilling = false,
  aiFeaturesEnabled = false,
  billingContext,
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
    "material" | "expense" | "photo" | "estimate" | "approve_estimate" | null
  >(null);
  const sentEstimateForApproval = billingContext
    ? selectActiveEstimate(billingContext.estimates.filter((e) => e.status === "sent"))
    : null;
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
  const useBillingGuidance = Boolean(billingContext);
  const showLegacyEstimateButton =
    showCreateEstimate && !useBillingGuidance;

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
      businessContext={billingContext}
      businessActionOptions={{
        canCreateEstimate: showCreateEstimate,
        canViewBilling,
        canApproveOnSite:
          canApproveOnSite && Boolean(sentEstimateForApproval),
      }}
      onFieldEstimateClick={
        showCreateEstimate ? () => setActiveSheet("estimate") : undefined
      }
      onFieldApproveClick={
        canApproveOnSite && sentEstimateForApproval
          ? () => setActiveSheet("approve_estimate")
          : undefined
      }
      onCompleteSheetOpenChange={setCompleteSheetOpen}
      onStatusUpdated={handleStatusUpdated}
    />
  );

  const secondaryActionsRow =
    isActive &&
    (showLegacyEstimateButton || hasPhone || hasEmail || hasMaps) ? (
      <div className="flex gap-1.5">
        {showLegacyEstimateButton ? (
          <button
            type="button"
            disabled={fieldActionsDisabled}
            onClick={() => setActiveSheet("estimate")}
            className={`${technicianFieldContactSecondaryClass} disabled:cursor-not-allowed disabled:opacity-60`}
            title={
              fieldActionsDisabled
                ? completeSheetOpen
                  ? "Finish or cancel complete work before creating an estimate"
                  : "Finish the open form before creating an estimate"
                : undefined
            }
          >
            <Calculator className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
            Estimate
          </button>
        ) : null}
        {hasPhone ? (
          <a
            href={`tel:${job.customerPhone}`}
            className={technicianFieldContactPrimaryClass}
          >
            <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            Call
          </a>
        ) : null}
        {hasMaps ? (
          <a
            href={mapsUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className={technicianFieldContactPrimaryClass}
          >
            <Navigation className="h-3.5 w-3.5 shrink-0 text-cyan-700" />
            Maps
          </a>
        ) : null}
        {hasEmail ? (
          <a
            href={`mailto:${job.customerEmail}`}
            className={technicianFieldContactSecondaryClass}
          >
            <Mail className="h-3.5 w-3.5 shrink-0 text-slate-500" />
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
        className={technicianFieldUtilityActionClass}
        title={
          fieldActionsDisabled
            ? completeSheetOpen
              ? "Finish or cancel complete work before adding a photo"
              : "Finish the open form before adding a photo"
            : undefined
        }
      >
        <Camera className="h-4 w-4 shrink-0 text-violet-600" />
        Photos
      </button>
      <button
        type="button"
        disabled={fieldActionsDisabled}
        onClick={() => setActiveSheet("material")}
        className={technicianFieldUtilityActionClass}
        title={
          fieldActionsDisabled
            ? completeSheetOpen
              ? "Finish or cancel complete work before logging material"
              : "Finish the open form before logging material"
            : undefined
        }
      >
        <Package className="h-4 w-4 shrink-0 text-cyan-700" />
        Materials
      </button>
      <button
        type="button"
        disabled={fieldActionsDisabled}
        onClick={() => setActiveSheet("expense")}
        className={technicianFieldUtilityActionClass}
        title={
          fieldActionsDisabled
            ? completeSheetOpen
              ? "Finish or cancel complete work before logging a receipt"
              : "Finish the open form before logging a receipt"
            : undefined
        }
      >
        <Receipt className="h-4 w-4 shrink-0 text-amber-600" />
        Receipts
      </button>
    </div>
  ) : null;

  const jobDetailsBlock = expanded ? (
    <div className="space-y-1 px-2 pb-1.5 pt-0.5 text-sm text-slate-700">
      <p className="truncate font-medium text-slate-900">{job.customerName}</p>
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
    <p className="truncate px-2 pb-1 text-sm text-slate-700">
      {job.customerName}
    </p>
  );

  const referenceDetails = expanded ? (
    <div className="space-y-1.5 border-t border-slate-100/90 px-2 py-2">
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
          <summary className={detailsSummaryClass}>
            <StickyNote className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            Office notes
          </summary>
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
          ? technicianFieldActiveCardClass
          : emphasized
            ? technicianFieldEmphasizedCardClass
            : deckBadge === "current"
              ? technicianFieldCurrentDeckCardClass
              : "border-slate-200/80 shadow-sm"
      }`}
    >
      <div className="shrink-0 px-2 pt-2">
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            {deckBadge ? (
              <p
                className={
                  isActiveDeckJob
                    ? technicianFieldActiveJobPillClass
                    : "text-[10px] font-medium uppercase tracking-wide text-slate-500"
                }
              >
                {isActiveDeckJob ? "Active Job" : "Current Job"}
              </p>
            ) : null}
            <h2
              className={`truncate text-lg font-semibold leading-tight text-slate-900 ${
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

      {expanded ? (
        <div className="px-2 pb-1">
          <JobSummaryAiAssistant
            jobId={job.id}
            aiFeaturesEnabled={aiFeaturesEnabled}
          />
        </div>
      ) : null}

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
          jobType={job.jobType}
          jobTitle={job.description}
          serviceItems={serviceItems}
          defaultTaxRate={defaultTaxRate}
          aiFeaturesEnabled={aiFeaturesEnabled}
          canDraftDescription={canCreateEstimate}
          onClose={() => setActiveSheet(null)}
        />
      ) : null}

      {activeSheet === "approve_estimate" && sentEstimateForApproval ? (
        <TechnicianEstimateApprovalSheet
          estimateId={sentEstimateForApproval.id}
          estimateNumber={sentEstimateForApproval.estimateNumber}
          jobNumber={job.jobNumber}
          customerName={job.customerName}
          onClose={() => setActiveSheet(null)}
        />
      ) : null}
    </article>
  );
}
