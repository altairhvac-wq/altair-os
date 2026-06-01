"use client";

import { useState } from "react";
import { FocusedDocumentOverlay } from "@/shared/components/layout/FocusedDocumentOverlay";
import type { JobBillingSummariesByJobId } from "@/shared/lib/job-next-business-action";
import { isLiveTechnicianJob } from "@/shared/lib/technician-dispatch-job";
import type { JobStatus } from "@/shared/types/job";
import {
  formatJobPriority,
  getPriorityStyles,
  type TechnicianJob,
} from "@/shared/types/technician";
import type { TechnicianTimeStateSnapshot } from "@/shared/types/time-entry";
import type { ServiceItem } from "@/shared/types/service-item";
import { TechnicianJobFieldDetail } from "./TechnicianJobFieldDetail";
import { TechnicianJobStatusBadge } from "./TechnicianJobStatusBadge";

type TechnicianJobDetailOverlayProps = {
  job: TechnicianJob;
  timeState: TechnicianTimeStateSnapshot;
  serviceItems: ServiceItem[];
  canCreateEstimate: boolean;
  canApproveOnSite: boolean;
  canViewBilling: boolean;
  aiFeaturesEnabled?: boolean;
  billingSummaries: JobBillingSummariesByJobId;
  canManageTime: boolean;
  defaultTaxRate: number;
  onClose: () => void;
  onJobStatusUpdated: (jobId: string, status: JobStatus) => void;
};

export function TechnicianJobDetailOverlay({
  job,
  timeState,
  serviceItems,
  canCreateEstimate,
  canApproveOnSite,
  canViewBilling,
  aiFeaturesEnabled = false,
  billingSummaries,
  canManageTime,
  defaultTaxRate,
  onClose,
  onJobStatusUpdated,
}: TechnicianJobDetailOverlayProps) {
  const [closeDisabled, setCloseDisabled] = useState(false);
  const isLive = isLiveTechnicianJob(job, timeState);

  return (
    <FocusedDocumentOverlay
      isOpen
      onClose={onClose}
      closeDisabled={closeDisabled}
      closeVariant="back"
      title={job.jobNumber}
      subtitle={job.jobType}
      headerAside={
        <>
          <TechnicianJobStatusBadge status={job.status} />
          <span
            className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${getPriorityStyles(job.priority)}`}
          >
            {formatJobPriority(job.priority)}
          </span>
          {isLive ? (
            <span className="inline-flex rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              Active
            </span>
          ) : null}
        </>
      }
      ariaLabel={`Job ${job.jobNumber}`}
    >
      <TechnicianJobFieldDetail
        job={job}
        timeState={timeState}
        serviceItems={serviceItems}
        defaultTaxRate={defaultTaxRate}
        canCreateEstimate={canCreateEstimate}
        canApproveOnSite={canApproveOnSite}
        canViewBilling={canViewBilling}
        aiFeaturesEnabled={aiFeaturesEnabled}
        billingContext={{
          estimates: billingSummaries.estimatesByJobId[job.id] ?? [],
          invoices: billingSummaries.invoicesByJobId[job.id] ?? [],
        }}
        canManageTime={canManageTime}
        showTimeStatus
        onStatusUpdated={(status) => onJobStatusUpdated(job.id, status)}
        onSheetOpenChange={setCloseDisabled}
      />
    </FocusedDocumentOverlay>
  );
}
