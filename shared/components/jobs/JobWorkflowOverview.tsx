"use client";

import { useEffect, useMemo, useState } from "react";
import { JobNextActionCard } from "@/shared/components/jobs/JobNextActionCard";
import { JobWorkflowTimeline } from "@/shared/components/jobs/JobWorkflowTimeline";
import type {
  JobEstimateSummary,
  JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import { resolveJobWorkflow } from "@/shared/lib/workflow";
import type { JobDetail } from "@/shared/types/job";
import { shouldAcceptServerWorkflowStatus } from "@/shared/types/job-workflow";

type JobWorkflowOverviewProps = {
  job: Pick<
    JobDetail,
    | "id"
    | "customerId"
    | "status"
    | "serviceAddress"
    | "city"
    | "state"
    | "zip"
    | "assignedTechnicianId"
    | "assignedTechnician"
    | "arrivedAt"
    | "workStartedAt"
    | "completedAt"
  >;
  billingContext?: {
    estimates: JobEstimateSummary[];
    invoices: JobInvoiceSummary[];
  };
  canUpdateStatus: boolean;
  canViewBilling: boolean;
  aiFeaturesEnabled?: boolean;
  northStar?: boolean;
};

export function JobWorkflowOverview({
  job,
  billingContext,
  canUpdateStatus,
  canViewBilling,
  aiFeaturesEnabled = false,
  northStar = false,
}: JobWorkflowOverviewProps) {
  const [status, setStatus] = useState(job.status);

  useEffect(() => {
    setStatus((current) =>
      shouldAcceptServerWorkflowStatus(current, job.status)
        ? job.status
        : current,
    );
  }, [job.status]);

  const workflow = useMemo(
    () =>
      resolveJobWorkflow(
        {
          jobId: job.id,
          customerId: job.customerId,
          status,
          assignedTechnicianId: job.assignedTechnicianId,
          assignedTechnician: job.assignedTechnician,
          arrivedAt: job.arrivedAt,
          workStartedAt: job.workStartedAt,
          completedAt: job.completedAt,
          estimates: billingContext?.estimates ?? [],
          invoices: billingContext?.invoices ?? [],
        },
        {
          canCreateEstimate: canViewBilling,
          canViewBilling,
        },
      ),
    [
      billingContext?.estimates,
      billingContext?.invoices,
      canViewBilling,
      job.arrivedAt,
      job.assignedTechnician,
      job.assignedTechnicianId,
      job.completedAt,
      job.customerId,
      job.id,
      job.workStartedAt,
      status,
    ],
  );

  return (
    <div className="flex flex-col gap-2.5">
      <JobNextActionCard
        workflow={workflow}
        jobId={job.id}
        customerId={job.customerId}
        status={status}
        serviceAddress={job.serviceAddress}
        city={job.city}
        state={job.state}
        zip={job.zip}
        canUpdateStatus={canUpdateStatus}
        aiFeaturesEnabled={aiFeaturesEnabled}
        northStar={northStar}
        onStatusUpdated={setStatus}
      />
      <JobWorkflowTimeline
        stages={workflow.progress.stages}
        progress={workflow.progress}
        northStar={northStar}
      />
    </div>
  );
}
