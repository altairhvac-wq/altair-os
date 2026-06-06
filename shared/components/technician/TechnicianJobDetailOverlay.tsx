"use client";

import { useState } from "react";
import { useFormatDemoDisplayName } from "@/shared/components/display/FounderMarketingDisplayContext";
import { FocusedDocumentOverlay } from "@/shared/components/layout/FocusedDocumentOverlay";
import type { JobBillingSummariesByJobId } from "@/shared/lib/job-next-business-action";
import type { JobStatus } from "@/shared/types/job";
import type { TechnicianJob } from "@/shared/types/technician";
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
  const formatDisplayName = useFormatDemoDisplayName();
  const displayCustomerName = formatDisplayName(job.customerName);

  return (
    <FocusedDocumentOverlay
      isOpen
      onClose={onClose}
      closeDisabled={closeDisabled}
      closeVariant="back"
      title={displayCustomerName}
      subtitle={`${job.jobNumber} · ${job.jobType}`}
      headerAside={<TechnicianJobStatusBadge status={job.status} />}
      ariaLabel={`${displayCustomerName}, job ${job.jobNumber}`}
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
