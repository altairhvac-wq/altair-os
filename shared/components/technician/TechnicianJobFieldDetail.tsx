"use client";

import { useEffect, useState } from "react";
import {
  Camera,
  Calculator,
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
import {
  buildGoogleMapsDirectionsUrl,
  buildMapsDirectionsUrl,
  hasCompleteServiceAddress,
  openMapsDirectionsUrl,
} from "@/shared/lib/maps";
import {
  selectActiveEstimate,
  type JobEstimateSummary,
  type JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
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
import { TechnicianJobEquipmentSummary } from "./TechnicianJobEquipmentSummary";
import { TechnicianJobLaborStatus } from "./TechnicianJobLaborStatus";
import { TechnicianJobShiftStatus } from "./TechnicianJobShiftStatus";
import { TechnicianMaterialSheet } from "./TechnicianMaterialSheet";
import { TechnicianPhotoSheet } from "./TechnicianPhotoSheet";
import {
  technicianFieldContactPrimaryClass,
  technicianFieldContactSecondaryClass,
  technicianFieldContextBlockClass,
  technicianFieldJobDetailsClass,
  technicianFieldJobDetailsSummaryClass,
  technicianFieldReferenceSectionClass,
  technicianFieldSectionLabelClass,
  technicianFieldUtilityActionClass,
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

const detailsClass = technicianFieldJobDetailsClass;
const detailsSummaryClass = technicianFieldJobDetailsSummaryClass;

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

  useEffect(() => {
    onSheetOpenChange?.(activeSheet !== null || completeSheetOpen);
  }, [activeSheet, completeSheetOpen, onSheetOpenChange]);

  function handleStatusUpdated(nextStatus: JobStatus) {
    setStatus(nextStatus);
    onStatusUpdated?.(nextStatus);
  }

  const hasDescription = Boolean(job.description?.trim());
  const hasNotes = Boolean(job.notes?.trim());
  const addressParts = {
    serviceAddress: job.serviceAddress,
    city: job.city,
    state: job.state,
    zip: job.zip,
  };
  const hasCompleteAddress = hasCompleteServiceAddress(addressParts);
  const [mapsUrl, setMapsUrl] = useState(() =>
    buildGoogleMapsDirectionsUrl(addressParts),
  );

  useEffect(() => {
    setMapsUrl(buildMapsDirectionsUrl(addressParts));
  }, [job.serviceAddress, job.city, job.state, job.zip]);
  const hasPhone = Boolean(job.customerPhone?.trim());
  const hasEmail = Boolean(job.customerEmail?.trim());
  const hasMaps = Boolean(mapsUrl);
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

        <section>
          <h3 className={technicianFieldSectionLabelClass}>Next step</h3>
          <div className={`${technicianFieldWorkflowSurfaceClass} mt-2`}>
            <JobWorkflowControls
              jobId={job.id}
              customerId={job.customerId}
              initialStatus={status}
              serviceAddress={job.serviceAddress}
              city={job.city}
              state={job.state}
              zip={job.zip}
              canUpdateStatus
              aiFeaturesEnabled={aiFeaturesEnabled}
              layout="stack"
              fieldActionFirst
              showMobileHint
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
          </div>
        </section>

        {showPaymentCollection && payableInvoice ? (
          <section>
            <InvoicePaymentCollectionCard
              invoiceId={payableInvoice.id}
              jobId={job.id}
              balanceDue={payableInvoice.balanceDue}
              onlinePaymentsEnabled={onlinePaymentsEnabled}
              fieldVariant
            />
          </section>
        ) : null}

        {isActive ? (
          <section className="space-y-3">
            {(showLegacyEstimateButton || hasPhone || hasEmail || hasMaps) ? (
              <div>
                <h3 className={technicianFieldSectionLabelClass}>Contact</h3>
                <div className="mt-2 flex gap-2">
                  {hasPhone ? (
                    <a
                      href={`tel:${job.customerPhone}`}
                      className={technicianFieldContactPrimaryClass}
                    >
                      <Phone className="h-4 w-4 shrink-0 text-emerald-600" />
                      Call
                    </a>
                  ) : null}
                  {hasMaps ? (
                    <a
                      href={mapsUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => {
                        if (openMapsDirectionsUrl(mapsUrl!)) {
                          event.preventDefault();
                        }
                      }}
                      className={technicianFieldContactPrimaryClass}
                    >
                      <Navigation className="h-4 w-4 shrink-0 text-cyan-700" />
                      Maps
                    </a>
                  ) : null}
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
                      <Calculator className="h-4 w-4 shrink-0 text-indigo-600" />
                      Estimate
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div>
              <h3 className={technicianFieldSectionLabelClass}>Log on site</h3>
              <div className="mt-2 grid grid-cols-3 gap-2">
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
            </div>
          </section>
        ) : null}

        <section className={technicianFieldReferenceSectionClass}>
          <h3 className={technicianFieldSectionLabelClass}>Reference</h3>
          <div className="mt-2 space-y-2">
            <JobSummaryAiAssistant
              jobId={job.id}
              aiFeaturesEnabled={aiFeaturesEnabled}
              variant="field"
            />

            <TechnicianJobEquipmentSummary customerId={job.customerId} />

            {hasDescription ? (
              <details className={detailsClass}>
                <summary className={detailsSummaryClass}>
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  Summary
                </summary>
                <p className="px-3 py-2.5 text-sm leading-snug text-slate-800">
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
                <p className="px-3 py-2.5 text-sm leading-snug text-slate-700">
                  {job.notes}
                </p>
              </details>
            ) : null}
          </div>
        </section>
      </div>

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
    </>
  );
}
