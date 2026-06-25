import type { WorkflowReminderSourceEntityType } from "@/lib/database/types/enums";

export function buildWorkflowReminderSourceHref(input: {
  sourceEntityType: WorkflowReminderSourceEntityType;
  sourceEntityId: string;
}): string {
  switch (input.sourceEntityType) {
    case "invoice":
      return `/invoices/${input.sourceEntityId}`;
    case "estimate":
      return `/estimates/${input.sourceEntityId}`;
    case "lead":
      return `/leads?selected=${input.sourceEntityId}`;
    case "job":
      return `/jobs/${input.sourceEntityId}`;
  }
}

export function getWorkflowReminderOpenLabel(
  sourceEntityType: WorkflowReminderSourceEntityType,
): string {
  switch (sourceEntityType) {
    case "invoice":
      return "Open invoice";
    case "estimate":
      return "Open estimate";
    case "lead":
      return "Open lead";
    case "job":
      return "Open job";
  }
}
