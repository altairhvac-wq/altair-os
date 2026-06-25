import type {
  WorkflowReminderKind,
  WorkflowReminderSourceEntityType,
} from "@/lib/database/types/enums";
import type { DashboardWorkflowReminderPreview } from "@/shared/types/dashboard";
import {
  buildWorkflowReminderSourceHref,
  getWorkflowReminderOpenLabel,
} from "@/shared/lib/workflow-reminder-routing";

export const WORKFLOW_REMINDER_KIND_LABELS: Record<WorkflowReminderKind, string> =
  {
    unpaid_invoice_7d: "Unpaid invoice",
    stale_estimate_7d: "Stale estimate",
    lead_follow_up_due: "Lead follow-up",
    ready_to_invoice: "Ready to invoice",
  };

export const WORKFLOW_REMINDER_SOURCE_LABELS: Record<
  WorkflowReminderSourceEntityType,
  string
> = {
  invoice: "Invoice",
  estimate: "Estimate",
  lead: "Lead",
  job: "Job",
};

export function formatWorkflowReminderAge(
  triggeredAt: string,
  reference = new Date(),
): string {
  const triggeredMs = Date.parse(triggeredAt);
  if (!Number.isFinite(triggeredMs)) {
    return "Recently";
  }

  const diffMs = reference.getTime() - triggeredMs;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours <= 0) {
      return "Just now";
    }
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }

  if (diffDays === 1) {
    return "1 day ago";
  }

  return `${diffDays} days ago`;
}

export function buildDashboardWorkflowReminderPreview(input: {
  id: string;
  title: string;
  message: string | null;
  triggeredAt: string;
  reminderKind: WorkflowReminderKind;
  sourceEntityType: WorkflowReminderSourceEntityType;
  sourceEntityId: string;
}): DashboardWorkflowReminderPreview {
  return {
    id: input.id,
    title: input.title,
    message: input.message,
    triggeredAt: input.triggeredAt,
    reminderKind: input.reminderKind,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
    kindLabel: WORKFLOW_REMINDER_KIND_LABELS[input.reminderKind],
    sourceLabel: WORKFLOW_REMINDER_SOURCE_LABELS[input.sourceEntityType],
    ageLabel: formatWorkflowReminderAge(input.triggeredAt),
    openHref: buildWorkflowReminderSourceHref({
      sourceEntityType: input.sourceEntityType,
      sourceEntityId: input.sourceEntityId,
    }),
    openLabel: getWorkflowReminderOpenLabel(input.sourceEntityType),
  };
}
