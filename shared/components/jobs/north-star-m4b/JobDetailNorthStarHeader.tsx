"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Pencil, Truck } from "lucide-react";
import { updateJobAction } from "@/app/actions/jobs";
import { JobForm, jobToFormData } from "@/shared/components/jobs/JobForm";
import { JobPriorityBadge } from "@/shared/components/jobs/JobPriorityBadge";
import { JobStatusBadge } from "@/shared/components/jobs/JobStatusBadge";
import { JobWorkflowControls } from "@/shared/components/jobs/JobWorkflowControls";
import { ReopenCompletedJobControl } from "@/shared/components/jobs/ReopenCompletedJobControl";
import {
  SectionHeader,
  altairMcCardClass,
  altairMcCardPadClass,
} from "@/shared/design-system/components";
import { formatActionError } from "@/shared/lib/operational-errors";
import type {
  JobEstimateSummary,
  JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import type { Customer } from "@/shared/types/customer";
import type { JobDetail, JobFormData } from "@/shared/types/job";
import { shouldAcceptServerWorkflowStatus } from "@/shared/types/job-workflow";

type JobDetailNorthStarHeaderProps = {
  job: JobDetail;
  customers: Customer[];
  canUpdateStatus: boolean;
  canEditJob: boolean;
  aiFeaturesEnabled?: boolean;
  canCreateEstimate?: boolean;
  canViewBilling?: boolean;
  billingContext?: {
    estimates: JobEstimateSummary[];
    invoices: JobInvoiceSummary[];
  };
};

const workflowControlsProps = (
  props: JobDetailNorthStarHeaderProps,
  status: JobDetail["status"],
  onStatusUpdated: (status: JobDetail["status"]) => void,
) => ({
  jobId: props.job.id,
  customerId: props.job.customerId,
  initialStatus: props.job.status,
  status,
  serviceAddress: props.job.serviceAddress,
  city: props.job.city,
  state: props.job.state,
  zip: props.job.zip,
  canUpdateStatus: props.canUpdateStatus,
  aiFeaturesEnabled: props.aiFeaturesEnabled,
  canCorrectStatus: props.canEditJob,
  canReopenJob: props.canEditJob,
  businessContext: props.billingContext,
  businessActionOptions: {
    canCreateEstimate: props.canCreateEstimate,
    canViewBilling: props.canViewBilling,
  },
  reopenSnapshot: {
    workStartedAt: props.job.workStartedAt,
    arrivedAt: props.job.arrivedAt,
    assignedTechnicianId: props.job.assignedTechnicianId,
  },
  layout: "header" as const,
  reopenVariant: "none" as const,
  onStatusUpdated,
});

export function JobDetailNorthStarHeader({
  job,
  customers,
  canUpdateStatus,
  canEditJob,
  aiFeaturesEnabled = false,
  canCreateEstimate,
  canViewBilling,
  billingContext,
}: JobDetailNorthStarHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(job.status);
  const router = useRouter();

  useEffect(() => {
    setStatus((current) =>
      shouldAcceptServerWorkflowStatus(current, job.status)
        ? job.status
        : current,
    );
  }, [job.status]);

  function handleEditClick() {
    setEditError(null);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setEditError(null);
    setIsEditing(false);
  }

  function handleEditSubmit(data: JobFormData) {
    setEditError(null);

    startTransition(async () => {
      const result = await updateJobAction(job.id, data);

      if (result.error || !result.job) {
        setEditError(
          formatActionError(result.error, "We couldn't save job changes. Try again."),
        );
        return;
      }

      setIsEditing(false);
      router.refresh();
    });
  }

  function handleStatusUpdated(nextStatus: typeof job.status) {
    setStatus(nextStatus);
  }

  const sharedWorkflowProps = workflowControlsProps(
    {
      job,
      customers,
      canUpdateStatus,
      canEditJob,
      aiFeaturesEnabled,
      canCreateEstimate,
      canViewBilling,
      billingContext,
    },
    status,
    handleStatusUpdated,
  );

  if (isEditing) {
    return (
      <section className="space-y-2">
        <SectionHeader title="Edit job" />
        <div className={`${altairMcCardClass} ${altairMcCardPadClass} space-y-4`}>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-altair-ink-on-paper sm:text-xl">
              {job.jobNumber}
            </h1>
            <p className="mt-1 text-xs text-altair-ink-on-paper-muted">
              Update schedule, service address, and job details
            </p>
          </div>

          <JobForm
            key={job.id}
            customers={customers}
            initialData={jobToFormData(job)}
            onSubmit={handleEditSubmit}
            onCancel={handleCancelEdit}
            error={editError}
            isSubmitting={isPending}
            lockStatus
          />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <SectionHeader title="Job" />
      <div className={`${altairMcCardClass} ${altairMcCardPadClass} space-y-2.5`}>
        <JobWorkflowControls {...sharedWorkflowProps} section="banners" />

        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-altair-ink-on-paper sm:text-xl">
                {job.jobNumber}
              </h1>
              <JobStatusBadge status={status} />
              <JobPriorityBadge priority={job.priority} />
            </div>
            <p className="mt-1 text-sm font-semibold text-altair-ink-on-paper-secondary">
              {job.jobType}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-start gap-2">
            {canEditJob ? (
              <button
                type="button"
                onClick={handleEditClick}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-altair-border bg-[var(--surface-tile)] px-2.5 text-xs font-semibold text-altair-ink-on-paper transition-colors hover:bg-altair-stone"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit job
              </button>
            ) : null}
            <Link
              href="/dispatch"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-altair-border bg-[var(--surface-tile)] px-2.5 text-xs font-semibold text-altair-ink-on-paper transition-colors hover:bg-altair-stone"
            >
              <Truck className="h-3.5 w-3.5" />
              Open dispatch
            </Link>
            <ReopenCompletedJobControl
              jobId={job.id}
              status={status}
              canReopenJob={canEditJob}
              reopenSnapshot={{
                workStartedAt: job.workStartedAt,
                arrivedAt: job.arrivedAt,
                assignedTechnicianId: job.assignedTechnicianId,
              }}
              variant="inline"
              onStatusUpdated={handleStatusUpdated}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
