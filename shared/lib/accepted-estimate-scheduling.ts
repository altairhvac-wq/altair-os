import type { Estimate } from "@/shared/types/estimate";
import type { JobStatus } from "@/shared/types/job";

export type AcceptedEstimateJobSchedulingContext = {
  status: JobStatus;
  assignedTechnicianId?: string | null;
  assignedTechnician?: string | null;
};

export type AcceptedEstimateSchedulingPreview = {
  id: string;
  estimateNumber: string;
  customerName: string;
  total: number;
  approvedAt?: string;
  jobId?: string;
  jobNumber?: string;
  openHref: string;
};

function isJobUnassigned(
  job: AcceptedEstimateJobSchedulingContext,
): boolean {
  return !job.assignedTechnicianId && !job.assignedTechnician;
}

/**
 * Approved estimates that still need owner action to convert, link, or schedule work.
 */
export function isApprovedEstimateNeedingScheduling(
  estimate: Pick<
    Estimate,
    "status" | "jobId" | "archivedAt" | "deletedAt"
  >,
  linkedJob?: AcceptedEstimateJobSchedulingContext | null,
): boolean {
  if (estimate.status !== "approved") {
    return false;
  }

  if (estimate.archivedAt || estimate.deletedAt) {
    return false;
  }

  if (!estimate.jobId) {
    return true;
  }

  if (!linkedJob) {
    return true;
  }

  if (linkedJob.status === "completed" || linkedJob.status === "cancelled") {
    return false;
  }

  if (linkedJob.status === "scheduled" && isJobUnassigned(linkedJob)) {
    return true;
  }

  return false;
}

export function resolveAcceptedEstimateSchedulingHref(estimate: {
  id: string;
  jobId?: string;
}): string {
  if (estimate.jobId) {
    return `/jobs/${estimate.jobId}`;
  }

  return `/estimates/${estimate.id}`;
}

function compareAcceptedEstimateScheduling(
  left: Estimate,
  right: Estimate,
): number {
  const leftApproved = left.approvedAt ? Date.parse(left.approvedAt) : Number.NaN;
  const rightApproved = right.approvedAt
    ? Date.parse(right.approvedAt)
    : Number.NaN;

  if (Number.isFinite(leftApproved) && Number.isFinite(rightApproved)) {
    if (leftApproved !== rightApproved) {
      return rightApproved - leftApproved;
    }
  } else if (left.approvedAt !== right.approvedAt) {
    return (right.approvedAt ?? "").localeCompare(left.approvedAt ?? "");
  }

  const leftCreated = Date.parse(left.createdAt);
  const rightCreated = Date.parse(right.createdAt);

  if (Number.isFinite(leftCreated) && Number.isFinite(rightCreated)) {
    if (leftCreated !== rightCreated) {
      return rightCreated - leftCreated;
    }
  }

  return left.id.localeCompare(right.id);
}

export function selectAcceptedEstimatesNeedingScheduling(
  estimates: Estimate[],
  jobsById: ReadonlyMap<string, AcceptedEstimateJobSchedulingContext>,
): Estimate[] {
  return estimates
    .filter((estimate) =>
      isApprovedEstimateNeedingScheduling(
        estimate,
        estimate.jobId ? jobsById.get(estimate.jobId) : null,
      ),
    )
    .sort(compareAcceptedEstimateScheduling);
}

export function buildAcceptedEstimateSchedulingPreview(
  estimate: Estimate,
): AcceptedEstimateSchedulingPreview {
  return {
    id: estimate.id,
    estimateNumber: estimate.estimateNumber,
    customerName: estimate.customerName,
    total: estimate.total,
    approvedAt: estimate.approvedAt,
    jobId: estimate.jobId,
    jobNumber: estimate.jobNumber,
    openHref: resolveAcceptedEstimateSchedulingHref(estimate),
  };
}

function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}

export function formatAcceptedEstimateSchedulingTitle(count: number): string {
  if (count <= 0) {
    return "Estimate accepted — schedule this job";
  }

  if (count === 1) {
    return "Estimate accepted — schedule this job";
  }

  return "Accepted estimates need scheduling";
}

export function formatAcceptedEstimateSchedulingDescription(
  count: number,
): string {
  if (count <= 0) {
    return "Accepted work is waiting for scheduling";
  }

  if (count === 1) {
    return "Customer approved — assign or schedule the linked job";
  }

  return `${count} accepted ${pluralize(count, "estimate")} need scheduling or conversion`;
}

export function formatAcceptedEstimateSchedulingListHref(count: number): string {
  return count === 1 ? "/estimates?status=approved" : "/estimates?status=approved";
}
