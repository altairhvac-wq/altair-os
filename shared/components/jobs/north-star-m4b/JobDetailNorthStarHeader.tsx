"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  Calendar,
  MapPin,
  Pencil,
  Truck,
  User,
} from "lucide-react";
import { updateJobAction } from "@/app/actions/jobs";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { JobForm, jobToFormData } from "@/shared/components/jobs/JobForm";
import { JobPriorityBadge } from "@/shared/components/jobs/JobPriorityBadge";
import { JobStatusBadge } from "@/shared/components/jobs/JobStatusBadge";
import { JobWorkflowControls } from "@/shared/components/jobs/JobWorkflowControls";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
import { formatActionError } from "@/shared/lib/operational-errors";
import type {
  JobEstimateSummary,
  JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import type { Customer } from "@/shared/types/customer";
import type { JobDetail, JobFormData } from "@/shared/types/job";
import {
  formatJobProfitabilityCurrency,
  formatJobProfitabilityLaborHours,
  type JobProfitabilitySnapshot,
} from "@/shared/types/job-profitability";
import { shouldAcceptServerWorkflowStatus } from "@/shared/types/job-workflow";

type JobDetailNorthStarHeaderProps = {
  job: JobDetail;
  customers: Customer[];
  scheduledLabel: string;
  canUpdateStatus: boolean;
  canEditJob: boolean;
  canManageCustomers: boolean;
  canViewFinancials: boolean;
  aiFeaturesEnabled?: boolean;
  canCreateEstimate?: boolean;
  canViewBilling?: boolean;
  billingContext?: {
    estimates: JobEstimateSummary[];
    invoices: JobInvoiceSummary[];
  };
  profitability?: JobProfitabilitySnapshot | null;
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
  onStatusUpdated,
});

export function JobDetailNorthStarHeader({
  job,
  customers,
  scheduledLabel,
  canUpdateStatus,
  canEditJob,
  canManageCustomers,
  canViewFinancials,
  aiFeaturesEnabled = false,
  canCreateEstimate,
  canViewBilling,
  billingContext,
  profitability,
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
      scheduledLabel,
      canUpdateStatus,
      canEditJob,
      canManageCustomers,
      canViewFinancials,
      aiFeaturesEnabled,
      canCreateEstimate,
      canViewBilling,
      billingContext,
      profitability,
    },
    status,
    handleStatusUpdated,
  );

  const isAssigned = Boolean(job.assignedTechnicianId);
  const locationLine = `${job.serviceAddress} · ${job.city}, ${job.state} ${job.zip}`;
  const estimateCount = billingContext?.estimates.length ?? 0;
  const invoiceCount = billingContext?.invoices.length ?? 0;

  if (isEditing) {
    return (
      <div className={dt.heroShell}>
        <div aria-hidden="true" className={dt.heroAccentRail} />
        <div className="space-y-4">
          <div>
            <p className={dt.heroEyebrow}>Edit job</p>
            <h1 className={`mt-1 ${dt.heroTitle}`}>{job.jobNumber}</h1>
            <p className={`mt-1 ${dt.heroMeta}`}>
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
      </div>
    );
  }

  return (
    <>
      <div className={dt.heroShell}>
        <div aria-hidden="true" className={dt.heroAccentRail} />

        <JobWorkflowControls {...sharedWorkflowProps} section="banners" />

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={dt.heroEyebrow}>Job command</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className={dt.heroTitle}>{job.jobNumber}</h1>
              <JobStatusBadge status={status} />
              <JobPriorityBadge priority={job.priority} />
            </div>
            <p className={`mt-1 ${dt.heroCompany}`}>{job.jobType}</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            {canEditJob ? (
              <button
                type="button"
                onClick={handleEditClick}
                className={dt.tertiaryAction}
              >
                <Pencil className="h-4 w-4" />
                Edit job
              </button>
            ) : null}
            <Link href="/dispatch" className={dt.tertiaryAction}>
              <Truck className="h-4 w-4" />
              Open dispatch
            </Link>
          </div>
        </div>

        <div className={dt.metaStrip}>
          <div className={dt.metaRow}>
            <User className={dt.metaIcon} />
            <CustomerNameLink
              customerId={job.customerId}
              customerName={job.customerName}
              canManageCustomers={canManageCustomers}
              linkClassName="font-semibold text-[#F3EBDD] transition-colors hover:text-[#FFF9EA]"
            />
          </div>
          <div className={`mt-1 ${dt.metaRow}`}>
            <MapPin className={dt.metaIcon} />
            <span className="truncate">{locationLine}</span>
          </div>
          <div className={`mt-1 ${dt.metaRow}`}>
            <Calendar className={dt.metaIcon} />
            <span>{scheduledLabel}</span>
            <span className="text-[#8A6324]">·</span>
            <User className={dt.metaIcon} />
            <span>{isAssigned ? job.assignedTechnician : "Unassigned"}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 border-t border-[rgba(201,164,77,0.14)] pt-4 sm:grid-cols-2 lg:grid-cols-4">
          {canViewFinancials && profitability ? (
            <>
              <div>
                <p className={dt.heroStatLabel}>Collected</p>
                <p className={dt.heroStatValue}>
                  {formatJobProfitabilityCurrency(profitability.revenue.collected)}
                </p>
              </div>
              <div>
                <p className={dt.heroStatLabel}>Gross profit</p>
                <p className={dt.heroStatValue}>
                  {formatJobProfitabilityCurrency(profitability.grossProfit)}
                </p>
              </div>
              <div>
                <p className={dt.heroStatLabel}>Labor</p>
                <p className={`${dt.heroStatValue} text-base`}>
                  {formatJobProfitabilityLaborHours(profitability.labor.totalHours)}
                </p>
              </div>
              <div>
                <p className={dt.heroStatLabel}>Invoices</p>
                <p className={dt.heroStatValue}>{profitability.activeInvoiceCount}</p>
              </div>
            </>
          ) : canViewBilling ? (
            <>
              <div>
                <p className={dt.heroStatLabel}>Estimates</p>
                <p className={dt.heroStatValue}>{estimateCount}</p>
              </div>
              <div>
                <p className={dt.heroStatLabel}>Invoices</p>
                <p className={dt.heroStatValue}>{invoiceCount}</p>
              </div>
              <div>
                <p className={dt.heroStatLabel}>Technician</p>
                <p className={`${dt.heroStatValue} text-base`}>
                  {isAssigned ? job.assignedTechnician : "Unassigned"}
                </p>
              </div>
              <div>
                <p className={dt.heroStatLabel}>Priority</p>
                <p className={`${dt.heroStatValue} text-base capitalize`}>
                  {job.priority}
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className={dt.heroStatLabel}>Technician</p>
                <p className={`${dt.heroStatValue} text-base`}>
                  {isAssigned ? job.assignedTechnician : "Unassigned"}
                </p>
              </div>
              <div>
                <p className={dt.heroStatLabel}>Priority</p>
                <p className={`${dt.heroStatValue} text-base capitalize`}>
                  {job.priority}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
