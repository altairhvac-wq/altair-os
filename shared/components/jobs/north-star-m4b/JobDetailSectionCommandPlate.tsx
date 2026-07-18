"use client";

import { useEffect, useState } from "react";
import { JobAdditionalWorkflowControls } from "@/shared/components/jobs/JobAdditionalWorkflowControls";
import { JobWorkflowControls } from "@/shared/components/jobs/JobWorkflowControls";
import { JobDetailSectionNav } from "./JobDetailSectionNav";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
import type {
  JobEstimateSummary,
  JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import type { JobDetail } from "@/shared/types/job";
import { shouldAcceptServerWorkflowStatus } from "@/shared/types/job-workflow";

type JobDetailSectionCommandPlateProps = {
  job: JobDetail;
  canUpdateStatus: boolean;
  canEditJob: boolean;
  canViewBilling?: boolean;
  canCreateEstimate?: boolean;
  aiFeaturesEnabled?: boolean;
  showBilling: boolean;
  showEquipment: boolean;
  billingContext?: {
    estimates: JobEstimateSummary[];
    invoices: JobInvoiceSummary[];
  };
};

export function JobDetailSectionCommandPlate({
  job,
  canUpdateStatus,
  canEditJob,
  canViewBilling,
  canCreateEstimate,
  aiFeaturesEnabled = false,
  showBilling,
  showEquipment,
  billingContext,
}: JobDetailSectionCommandPlateProps) {
  const [status, setStatus] = useState(job.status);

  useEffect(() => {
    setStatus((current) =>
      shouldAcceptServerWorkflowStatus(current, job.status)
        ? job.status
        : current,
    );
  }, [job.status]);

  return (
    <div className={dt.commandPlate}>
      <JobDetailSectionNav
        showBilling={showBilling}
        showEquipment={showEquipment}
      />
      <JobAdditionalWorkflowControls northStar>
        <JobWorkflowControls
          jobId={job.id}
          customerId={job.customerId}
          initialStatus={job.status}
          status={status}
          serviceAddress={job.serviceAddress}
          city={job.city}
          state={job.state}
          zip={job.zip}
          canUpdateStatus={canUpdateStatus}
          aiFeaturesEnabled={aiFeaturesEnabled}
          canCorrectStatus={canEditJob}
          canReopenJob={canEditJob}
          businessContext={billingContext}
          businessActionOptions={{
            canCreateEstimate,
            canViewBilling,
          }}
          reopenSnapshot={{
            workStartedAt: job.workStartedAt,
            arrivedAt: job.arrivedAt,
            assignedTechnicianId: job.assignedTechnicianId,
          }}
          layout="header"
          section="actions"
          onStatusUpdated={setStatus}
        />
      </JobAdditionalWorkflowControls>
    </div>
  );
}
