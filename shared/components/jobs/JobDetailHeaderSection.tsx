"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateJobAction } from "@/app/actions/jobs";
import { formatActionError } from "@/shared/lib/operational-errors";
import type {
  JobEstimateSummary,
  JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import type { Customer } from "@/shared/types/customer";
import type { JobDetail, JobFormData } from "@/shared/types/job";
import { JobDetailHeaderWorkflow } from "./JobDetailHeaderWorkflow";
import { JobForm, jobToFormData } from "./JobForm";

type JobDetailHeaderSectionProps = {
  job: JobDetail;
  customers: Customer[];
  scheduledLabel: string;
  canUpdateStatus: boolean;
  canEditJob: boolean;
  canCreateEstimate?: boolean;
  canViewBilling?: boolean;
  billingContext?: {
    estimates: JobEstimateSummary[];
    invoices: JobInvoiceSummary[];
  };
};

export function JobDetailHeaderSection({
  job,
  customers,
  scheduledLabel,
  canUpdateStatus,
  canEditJob,
  canCreateEstimate,
  canViewBilling,
  billingContext,
}: JobDetailHeaderSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
        setEditError(formatActionError(result.error, "We couldn't save job changes. Try again."));
        return;
      }

      setIsEditing(false);
      router.refresh();
    });
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Edit job
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {job.jobNumber}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
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
    );
  }

  return (
    <JobDetailHeaderWorkflow
      job={job}
      scheduledLabel={scheduledLabel}
      canUpdateStatus={canUpdateStatus}
      canEditJob={canEditJob}
      canCreateEstimate={canCreateEstimate}
      canViewBilling={canViewBilling}
      billingContext={billingContext}
      onEdit={handleEditClick}
    />
  );
}
