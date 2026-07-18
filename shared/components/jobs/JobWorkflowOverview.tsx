"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { JobNextActionCard } from "@/shared/components/jobs/JobNextActionCard";
import { JobWorkflowDocumentHost } from "@/shared/components/jobs/JobWorkflowDocumentHost";
import { JobWorkflowTimeline } from "@/shared/components/jobs/JobWorkflowTimeline";
import type { JobWorkflowDocument } from "@/shared/lib/jobs/job-workflow-documents";
import type {
  JobEstimateSummary,
  JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import { resolveJobWorkflow } from "@/shared/lib/workflow";
import type { Customer } from "@/shared/types/customer";
import type { Technician } from "@/shared/types/dispatch";
import type { CustomerEquipment } from "@/shared/types/customer-equipment";
import type { JobAttachment } from "@/shared/types/job-attachment";
import type { JobDetail } from "@/shared/types/job";
import type { JobMaterial } from "@/shared/types/job-material";
import type { ServiceItem } from "@/shared/types/service-item";
import { shouldAcceptServerWorkflowStatus } from "@/shared/types/job-workflow";

type JobWorkflowOverviewProps = {
  job: Pick<
    JobDetail,
    | "id"
    | "customerId"
    | "customerName"
    | "customerEmail"
    | "customerPhone"
    | "customerCompany"
    | "serviceAddress"
    | "city"
    | "state"
    | "zip"
    | "jobNumber"
    | "jobType"
    | "description"
    | "notes"
    | "status"
    | "assignedTechnicianId"
    | "assignedTechnician"
    | "arrivedAt"
    | "workStartedAt"
    | "completedAt"
    | "completionNotes"
    | "createdAt"
    | "scheduledDate"
    | "priority"
  >;
  customers: Customer[];
  technicians: Technician[];
  serviceItems: ServiceItem[];
  equipment: CustomerEquipment[];
  materials: JobMaterial[];
  attachments: JobAttachment[];
  billingContext?: {
    estimates: JobEstimateSummary[];
    invoices: JobInvoiceSummary[];
  };
  canUpdateStatus: boolean;
  canViewBilling: boolean;
  canEditJob: boolean;
  canAssignTechnician: boolean;
  aiFeaturesEnabled?: boolean;
  northStar?: boolean;
};

export function JobWorkflowOverview({
  job,
  customers,
  technicians,
  serviceItems,
  equipment,
  materials,
  attachments,
  billingContext,
  canUpdateStatus,
  canViewBilling,
  canEditJob,
  canAssignTechnician,
  aiFeaturesEnabled = false,
  northStar = false,
}: JobWorkflowOverviewProps) {
  const [status, setStatus] = useState(job.status);
  const [document, setDocument] = useState<JobWorkflowDocument | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

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

  const destinationContext = useMemo(
    () => ({
      stages: workflow.progress.stages,
      primaryAction: workflow.primaryAction,
      jobId: job.id,
      customerId: job.customerId,
      canViewBilling,
      canCreateEstimate: canViewBilling,
      canEditJob,
      canAssignTechnician,
      canUpdateStatus,
      estimates: billingContext?.estimates ?? [],
      invoices: billingContext?.invoices ?? [],
      jobStatus: status,
    }),
    [
      billingContext?.estimates,
      billingContext?.invoices,
      canAssignTechnician,
      canEditJob,
      canUpdateStatus,
      canViewBilling,
      job.customerId,
      job.id,
      status,
      workflow.primaryAction,
      workflow.progress.stages,
    ],
  );

  const jobDetail = job as JobDetail;

  return (
    <div className="flex flex-col gap-2">
      <JobWorkflowTimeline
        stages={workflow.progress.stages}
        progress={workflow.progress}
        destinationContext={destinationContext}
        northStar={northStar}
        onOpenDocument={(next, trigger) => {
          triggerRef.current = trigger;
          setDocument(next);
        }}
      />
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
        onOpenDocument={(next) => {
          triggerRef.current = null;
          setDocument(next);
        }}
      />
      <JobWorkflowDocumentHost
        job={jobDetail}
        customers={customers}
        technicians={technicians}
        serviceItems={serviceItems}
        equipment={equipment}
        materials={materials}
        attachments={attachments}
        estimates={billingContext?.estimates ?? []}
        invoices={billingContext?.invoices ?? []}
        canEditJob={canEditJob}
        canAssignTechnician={canAssignTechnician}
        canUpdateStatus={canUpdateStatus}
        canViewBilling={canViewBilling}
        aiFeaturesEnabled={aiFeaturesEnabled}
        northStar={northStar}
        document={document}
        onDocumentChange={setDocument}
        triggerElementRef={triggerRef}
      />
    </div>
  );
}
