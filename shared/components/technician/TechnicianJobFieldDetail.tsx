"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, Clock, Mail, MapPin } from "lucide-react";
import { JobSummaryAiAssistant } from "@/shared/components/jobs/JobSummaryAiAssistant";
import { JobWorkflowControls } from "@/shared/components/jobs/JobWorkflowControls";
import { hasCompleteServiceAddress } from "@/shared/lib/maps";
import {
  selectActiveEstimate,
  type JobEstimateSummary,
  type JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import { resolveJobWorkflow } from "@/shared/lib/workflow";
import { InvoicePaymentCollectionCard } from "@/shared/components/invoices/InvoicePaymentCollectionCard";
import { canRecordInvoicePayment } from "@/shared/types/invoice-payment";
import { isActiveInvoice } from "@/shared/types/invoice";
import type { JobStatus } from "@/shared/types/job";
import { shouldAcceptServerWorkflowStatus } from "@/shared/types/job-workflow";
import { getCreateEstimateJobBlockReason } from "@/shared/types/estimate";
import {
  formatTechnicianJobAddress,
  formatTechnicianJobTime,
  type TechnicianJob,
} from "@/shared/types/technician";
import type { TechnicianTimeStateSnapshot } from "@/shared/types/time-entry";
import type { ServiceItem } from "@/shared/types/service-item";
import { TechnicianEstimateApprovalSheet } from "./TechnicianEstimateApprovalSheet";
import { TechnicianEstimateSheet } from "./TechnicianEstimateSheet";
import { TechnicianExpenseSheet } from "./TechnicianExpenseSheet";
import { TechnicianJobCommandCenter } from "./TechnicianJobCommandCenter";
import { TechnicianJobEquipmentSummary } from "./TechnicianJobEquipmentSummary";
import { TechnicianJobLaborStatus } from "./TechnicianJobLaborStatus";
import { TechnicianJobShiftStatus } from "./TechnicianJobShiftStatus";
import { TechnicianJobWorkHistory } from "./TechnicianJobWorkHistory";
import { TechnicianMaterialSheet } from "./TechnicianMaterialSheet";
import { TechnicianPhotoSheet } from "./TechnicianPhotoSheet";
import {
  technicianFieldContactSecondaryClass,
  technicianFieldContextBlockClass,
  technicianFieldJobDetailsClass,
  technicianFieldJobDetailsSummaryClass,
  technicianFieldReferenceSectionClass,
  technicianFieldSectionLabelClass,
  technicianFieldWorkflowSurfaceClass,
} from "./technician-field-styles";

type TechnicianJobFieldDetailProps = {
  job: TechnicianJob;
  timeState: TechnicianTimeStateSnapshot;
  serviceItems: ServiceItem[];
  defaultTaxRate: number;
  canCreateEstimate: boolean;
  canApproveOnSite?: boolean;
  canViewBilling?: boolean;
  canCollectPayment?: boolean;
  onlinePaymentsEnabled?: boolean;
  smsSendingConfigured?: boolean;
  aiFeaturesEnabled?: boolean;
  billingContext?: {
    estimates: JobEstimateSummary[];
    invoices: JobInvoiceSummary[];
  };
  canManageTime?: boolean;
  showTimeStatus?: boolean;
  onStatusUpdated?: (status: JobStatus) => void;
  onSheetOpenChange?: (hasOpenSheet: boolean) => void;
};

function selectPayableInvoiceForCollection(
  invoices: JobInvoiceSummary[],
): JobInvoiceSummary | null {
  return (
    invoices
      .filter(
        (invoice) =>
          isActiveInvoice(invoice) && canRecordInvoicePayment(invoice),
      )
      .sort(
        (left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )[0] ?? null
  );
}

export function TechnicianJobFieldDetail({
  job,
  timeState,
  serviceItems,
  defaultTaxRate,
  canCreateEstimate,
  canApproveOnSite = false,
  canViewBilling = false,
  canCollectPayment = false,
  onlinePaymentsEnabled = false,
  smsSendingConfigured = false,
  aiFeaturesEnabled = false,
  billingContext,
  canManageTime = false,
  showTimeStatus = false,
  onStatusUpdated,
  onSheetOpenChange,
}: TechnicianJobFieldDetailProps) {
  const [status, setStatus] = useState(job.status);
  const [activeSheet, setActiveSheet] = useState<
    "material" | "expense" | "photo" | "estimate" | "approve_estimate" | null
  >(null);
  const [editingEstimateId, setEditingEstimateId] = useState<string | null>(
    null,
  );
  const sentEstimateForApproval = billingContext
    ? selectActiveEstimate(billingContext.estimates.filter((e) => e.status === "sent"))
    : null;
  const [completeSheetOpen, setCompleteSheetOpen] = useState(false);
  const [workHistoryRefreshKey, setWorkHistoryRefreshKey] = useState(0);

  useEffect(() => {
    setStatus((current) =>
      shouldAcceptServerWorkflowStatus(current, job.status) ? job.status : current,
    );
  }, [job.status]);

  useEffect(() => {
    if (status === "completed" || status === "cancelled") {
      setActiveSheet(null);
      setEditingEstimateId(null);
      setCompleteSheetOpen(false);
    }
  }, [status]);

  useEffect(() => {
    onSheetOpenChange?.(activeSheet !== null || completeSheetOpen);
  }, [activeSheet, completeSheetOpen, onSheetOpenChange]);

  function handleStatusUpdated(nextStatus: JobStatus) {
    setStatus(nextStatus);
    onStatusUpdated?.(nextStatus);
  }

  const addressParts = {
    serviceAddress: job.serviceAddress,
    city: job.city,
    state: job.state,
    zip: job.zip,
  };
  const hasCompleteAddress = hasCompleteServiceAddress(addressParts);
  const hasEmail = Boolean(job.customerEmail?.trim());
  const isActive = status !== "completed" && status !== "cancelled";
  const fieldActionsDisabled = activeSheet !== null || completeSheetOpen;
  const showCreateEstimate =
    canCreateEstimate &&
    Boolean(job.customerId?.trim()) &&
    getCreateEstimateJobBlockReason(status) === null;
  const useBillingGuidance = Boolean(billingContext);
  const payableInvoice = billingContext
    ? selectPayableInvoiceForCollection(billingContext.invoices)
    : null;
  const showPaymentCollection =
    canCollectPayment && payableInvoice !== null;
  const showLegacyEstimateButton =
    showCreateEstimate && !useBillingGuidance;

  const workflow = useMemo(
    () =>
      resolveJobWorkflow(
        {
          jobId: job.id,
          customerId: job.customerId,
          status,
          estimates: billingContext?.estimates ?? [],
          invoices: billingContext?.invoices ?? [],
        },
        {
          canCreateEstimate: showCreateEstimate,
          canViewBilling,
          canApproveOnSite:
            canApproveOnSite && Boolean(sentEstimateForApproval),
        },
      ),
    [
      billingContext?.estimates,
      billingContext?.invoices,
      canApproveOnSite,
      canViewBilling,
      job.customerId,
      job.id,
      sentEstimateForApproval,
      showCreateEstimate,
      status,
    ],
  );

  function openEstimateSheet(estimateId?: string | null) {
    setEditingEstimateId(estimateId ?? null);
    setActiveSheet("estimate");
  }

  function scrollToNotes() {
    const target = document.getElementById("technician-job-notes");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <div className="space-y-5 px-4 py-4">
        <div className={technicianFieldContextBlockClass}>
          <p className="flex items-start gap-2 leading-snug">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <span className="min-w-0 break-words">
              {hasCompleteAddress
                ? formatTechnicianJobAddress(job)
                : "No address — contact dispatch"}
            </span>
          </p>
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            {formatTechnicianJobTime(job.scheduledDate)}
          </p>
          {canManageTime && showTimeStatus ? (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <TechnicianJobShiftStatus jobId={job.id} timeState={timeState} compact />
              <TechnicianJobLaborStatus jobId={job.id} timeState={timeState} compact />
            </div>
          ) : null}
        </div>

        <TechnicianJobCommandCenter
          jobId={job.id}
          customerId={job.customerId}
          status={status}
          workflow={workflow}
          address={addressParts}
          customerPhone={job.customerPhone}
          canUpdateStatus
          canCreateEstimate={showCreateEstimate}
          canApproveOnSite={
            canApproveOnSite && Boolean(sentEstimateForApproval)
          }
          aiFeaturesEnabled={aiFeaturesEnabled}
          disabled={fieldActionsDisabled}
          onStatusUpdated={handleStatusUpdated}
          onCompleteSheetOpenChange={setCompleteSheetOpen}
          onCreateQuote={
            showCreateEstimate ? () => openEstimateSheet(null) : undefined
          }
          onContinueQuote={
            showCreateEstimate
              ? (estimateId) => openEstimateSheet(estimateId)
              : undefined
          }
          onCaptureApproval={
            canApproveOnSite && sentEstimateForApproval
              ? () => setActiveSheet("approve_estimate")
              : undefined
          }
          onOpenPhotos={
            isActive ? () => setActiveSheet("photo") : undefined
          }
          onOpenNotes={scrollToNotes}
          onOpenMaterials={
            isActive ? () => setActiveSheet("material") : undefined
          }
          onOpenReceipts={
            isActive ? () => setActiveSheet("expense") : undefined
          }
        />

        {showPaymentCollection && payableInvoice ? (
          <section>
            <InvoicePaymentCollectionCard
              invoiceId={payableInvoice.id}
              jobId={job.id}
              balanceDue={payableInvoice.balanceDue}
              onlinePaymentsEnabled={onlinePaymentsEnabled}
              smsSendingConfigured={smsSendingConfigured}
              fieldVariant
            />
          </section>
        ) : null}

        <details className={technicianFieldJobDetailsClass}>
          <summary className={technicianFieldJobDetailsSummaryClass}>
            Additional job controls
          </summary>
          <div className={`${technicianFieldWorkflowSurfaceClass} m-3 mt-0`}>
            <p className="mb-3 text-xs leading-relaxed text-slate-500">
              Fallback controls if you need the previous next-step layout.
              Prefer the command center above when possible.
            </p>
            <JobWorkflowControls
              jobId={job.id}
              customerId={job.customerId}
              initialStatus={status}
              status={status}
              serviceAddress={job.serviceAddress}
              city={job.city}
              state={job.state}
              zip={job.zip}
              canUpdateStatus
              aiFeaturesEnabled={aiFeaturesEnabled}
              layout="stack"
              fieldActionFirst
              showMobileHint
              competingSheetActive={activeSheet !== null || completeSheetOpen}
              businessContext={billingContext}
              businessActionOptions={{
                canCreateEstimate: showCreateEstimate,
                canViewBilling,
                canApproveOnSite:
                  canApproveOnSite && Boolean(sentEstimateForApproval),
              }}
              onFieldEstimateClick={
                showCreateEstimate
                  ? () => openEstimateSheet(null)
                  : undefined
              }
              onFieldFinishEstimateClick={
                showCreateEstimate
                  ? (estimateId) => openEstimateSheet(estimateId)
                  : undefined
              }
              onFieldApproveClick={
                canApproveOnSite && sentEstimateForApproval
                  ? () => setActiveSheet("approve_estimate")
                  : undefined
              }
              onCompleteSheetOpenChange={setCompleteSheetOpen}
              onStatusUpdated={handleStatusUpdated}
            />
          </div>
        </details>

        {isActive && (showLegacyEstimateButton || hasEmail) ? (
          <section className="space-y-3">
            <div>
              <h3 className={technicianFieldSectionLabelClass}>
                More contact options
              </h3>
              <div className="mt-2 flex gap-2">
                {hasEmail ? (
                  <a
                    href={`mailto:${job.customerEmail}`}
                    className={technicianFieldContactSecondaryClass}
                  >
                    <Mail className="h-4 w-4 shrink-0 text-slate-500" />
                    Email
                  </a>
                ) : null}
                {showLegacyEstimateButton ? (
                  <button
                    type="button"
                    disabled={fieldActionsDisabled}
                    onClick={() => openEstimateSheet(null)}
                    className={`${technicianFieldContactSecondaryClass} disabled:cursor-not-allowed disabled:opacity-60`}
                    title={
                      fieldActionsDisabled
                        ? completeSheetOpen
                          ? "Finish or cancel complete work before creating an estimate"
                          : "Finish the open form before creating an estimate"
                        : undefined
                    }
                  >
                    <Calculator className="h-4 w-4 shrink-0 text-indigo-600" />
                    Estimate
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <div id="technician-job-notes">
          <TechnicianJobWorkHistory
            key={`${job.id}-${workHistoryRefreshKey}`}
            jobId={job.id}
            notes={job.notes}
            description={job.description}
          />
        </div>

        <section className={technicianFieldReferenceSectionClass}>
          <h3 className={technicianFieldSectionLabelClass}>Reference</h3>
          <div className="mt-2 space-y-2">
            <JobSummaryAiAssistant
              jobId={job.id}
              aiFeaturesEnabled={aiFeaturesEnabled}
              variant="field"
            />

            <TechnicianJobEquipmentSummary customerId={job.customerId} />
          </div>
        </section>
      </div>

      {activeSheet === "material" ? (
        <TechnicianMaterialSheet
          jobId={job.id}
          jobNumber={job.jobNumber}
          serviceItems={serviceItems}
          onClose={() => setActiveSheet(null)}
          onSaved={() =>
            setWorkHistoryRefreshKey((current) => current + 1)
          }
        />
      ) : null}

      {activeSheet === "expense" ? (
        <TechnicianExpenseSheet
          jobId={job.id}
          jobNumber={job.jobNumber}
          onClose={() => setActiveSheet(null)}
          onSaved={() =>
            setWorkHistoryRefreshKey((current) => current + 1)
          }
        />
      ) : null}

      {activeSheet === "photo" ? (
        <TechnicianPhotoSheet
          jobId={job.id}
          jobNumber={job.jobNumber}
          onClose={() => setActiveSheet(null)}
          onUploaded={() =>
            setWorkHistoryRefreshKey((current) => current + 1)
          }
        />
      ) : null}

      {activeSheet === "estimate" ? (
        <TechnicianEstimateSheet
          jobId={job.id}
          jobNumber={job.jobNumber}
          customerName={job.customerName}
          jobType={job.jobType}
          jobTitle={job.description}
          estimateId={editingEstimateId ?? undefined}
          serviceItems={serviceItems}
          defaultTaxRate={defaultTaxRate}
          aiFeaturesEnabled={aiFeaturesEnabled}
          canDraftDescription={canCreateEstimate}
          onClose={() => {
            setActiveSheet(null);
            setEditingEstimateId(null);
          }}
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
    </>
  );
}
