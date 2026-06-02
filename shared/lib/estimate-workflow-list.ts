import type {
  BillingOperationalDayOptions,
  BillingWorkflowListSection,
} from "@/shared/lib/billing-workflow-list";
import {
  isDateOnlyOnOperationalDay,
  isTimestampOnOperationalDay,
} from "@/shared/lib/billing-workflow-list";
import { isJobOnOperationalDay } from "@/shared/lib/scheduled-today";
import type { Job } from "@/shared/types/job";
import type { Estimate, EstimateStatus } from "@/shared/types/estimate";

export type EstimateWorkflowGroup = "needs_action" | "approved" | "closed";

const ESTIMATE_WORKFLOW_GROUP_ORDER: readonly EstimateWorkflowGroup[] = [
  "needs_action",
  "approved",
  "closed",
];

const ESTIMATE_WORKFLOW_GROUP_LABELS: Record<EstimateWorkflowGroup, string> = {
  needs_action: "Needs action",
  approved: "Approved",
  closed: "Closed",
};

const NEEDS_ACTION_STATUSES = new Set<string>([
  "draft",
  "sent",
  "viewed",
  "changes_requested",
]);

const APPROVED_STATUSES = new Set<string>([
  "approved",
  "converted",
  "accepted",
]);

const CLOSED_STATUSES = new Set<string>([
  "declined",
  "rejected",
  "cancelled",
  "expired",
]);

export function getEstimateWorkflowGroup(
  status: EstimateStatus | string,
): EstimateWorkflowGroup {
  if (NEEDS_ACTION_STATUSES.has(status)) {
    return "needs_action";
  }

  if (APPROVED_STATUSES.has(status)) {
    return "approved";
  }

  if (CLOSED_STATUSES.has(status)) {
    return "closed";
  }

  return "closed";
}

function compareEstimateRecency(left: Estimate, right: Estimate): number {
  const leftTime = Date.parse(left.createdAt);
  const rightTime = Date.parse(right.createdAt);

  if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }
  } else if (left.createdAt !== right.createdAt) {
    return right.createdAt.localeCompare(left.createdAt);
  }

  return left.id.localeCompare(right.id);
}

function compareEstimatesWithinWorkflowGroup(
  left: Estimate,
  right: Estimate,
  group: EstimateWorkflowGroup,
): number {
  if (group === "needs_action") {
    const statusOrder: Record<string, number> = {
      draft: 0,
      changes_requested: 1,
      sent: 2,
      viewed: 3,
    };
    const leftStatusOrder = statusOrder[left.status] ?? Number.MAX_SAFE_INTEGER;
    const rightStatusOrder =
      statusOrder[right.status] ?? Number.MAX_SAFE_INTEGER;

    if (leftStatusOrder !== rightStatusOrder) {
      return leftStatusOrder - rightStatusOrder;
    }
  }

  return compareEstimateRecency(left, right);
}

export function sortEstimatesForWorkflow(estimates: Estimate[]): Estimate[] {
  return [...estimates].sort((left, right) => {
    const leftGroup = getEstimateWorkflowGroup(left.status);
    const rightGroup = getEstimateWorkflowGroup(right.status);
    const leftGroupOrder = ESTIMATE_WORKFLOW_GROUP_ORDER.indexOf(leftGroup);
    const rightGroupOrder = ESTIMATE_WORKFLOW_GROUP_ORDER.indexOf(rightGroup);

    if (leftGroupOrder !== rightGroupOrder) {
      return leftGroupOrder - rightGroupOrder;
    }

    return compareEstimatesWithinWorkflowGroup(left, right, leftGroup);
  });
}

export function shouldGroupEstimatesForWorkflow(
  statusFilter: EstimateStatus | "all",
): boolean {
  return statusFilter === "all";
}

export function groupEstimatesForWorkflow(
  estimates: Estimate[],
): BillingWorkflowListSection<Estimate>[] {
  const sorted = sortEstimatesForWorkflow(estimates);
  const grouped = new Map<EstimateWorkflowGroup, Estimate[]>();

  for (const estimate of sorted) {
    const group = getEstimateWorkflowGroup(estimate.status);
    const existing = grouped.get(group) ?? [];
    existing.push(estimate);
    grouped.set(group, existing);
  }

  return ESTIMATE_WORKFLOW_GROUP_ORDER.flatMap((group) => {
    const items = grouped.get(group);
    if (!items || items.length === 0) {
      return [];
    }

    return [
      {
        id: group,
        label: ESTIMATE_WORKFLOW_GROUP_LABELS[group],
        items,
      },
    ];
  });
}

export function prepareEstimatesForListView(
  estimates: Estimate[],
  statusFilter: EstimateStatus | "all",
): {
  sections: BillingWorkflowListSection<Estimate>[];
  showSectionHeaders: boolean;
} {
  if (shouldGroupEstimatesForWorkflow(statusFilter)) {
    return {
      sections: groupEstimatesForWorkflow(estimates),
      showSectionHeaders: true,
    };
  }

  return {
    sections: [
      {
        id: "filtered",
        label: "",
        items: sortEstimatesForWorkflow(estimates),
      },
    ],
    showSectionHeaders: false,
  };
}

export type EstimateTodayContext = BillingOperationalDayOptions & {
  jobsById?: ReadonlyMap<string, Job>;
};

function isDraftEstimateNeedingActionToday(
  estimate: Estimate,
  options?: EstimateTodayContext,
): boolean {
  if (estimate.status !== "draft") {
    return false;
  }

  if (isDateOnlyOnOperationalDay(estimate.createdAt, options)) {
    return true;
  }

  if (isTimestampOnOperationalDay(estimate.updatedAt, options)) {
    return true;
  }

  if (estimate.jobId && options?.jobsById) {
    const job = options.jobsById.get(estimate.jobId);

    if (job && isJobOnOperationalDay(job, options)) {
      return true;
    }
  }

  return false;
}

export function isEstimateRelevantToday(
  estimate: Estimate,
  context?: EstimateTodayContext,
): boolean {
  if (isDateOnlyOnOperationalDay(estimate.createdAt, context)) {
    return true;
  }

  if (isTimestampOnOperationalDay(estimate.updatedAt, context)) {
    return true;
  }

  if (estimate.sentAt && isTimestampOnOperationalDay(estimate.sentAt, context)) {
    return true;
  }

  if (
    estimate.approvedAt &&
    isTimestampOnOperationalDay(estimate.approvedAt, context)
  ) {
    return true;
  }

  if (isDraftEstimateNeedingActionToday(estimate, context)) {
    return true;
  }

  if (estimate.jobId && context?.jobsById) {
    const job = context.jobsById.get(estimate.jobId);

    if (job && isJobOnOperationalDay(job, context)) {
      return true;
    }
  }

  return false;
}

export function filterEstimatesForTodayView(
  estimates: Estimate[],
  context?: EstimateTodayContext,
): Estimate[] {
  return estimates.filter(
    (estimate) =>
      !estimate.archivedAt &&
      !estimate.deletedAt &&
      isEstimateRelevantToday(estimate, context),
  );
}

export function prepareEstimatesForTodayView(
  estimates: Estimate[],
): {
  sections: BillingWorkflowListSection<Estimate>[];
  showSectionHeaders: boolean;
} {
  return {
    sections: [
      {
        id: "today",
        label: "",
        items: sortEstimatesForWorkflow(estimates),
      },
    ],
    showSectionHeaders: false,
  };
}
