import type { WorkflowReminderSourceEntityType } from "@/lib/database/types/enums";
import { buildLeadPipelineHref } from "@/shared/lib/customers/customers-hub";

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
      return buildLeadPipelineHref({ selected: input.sourceEntityId });
    case "job":
      return `/work/${input.sourceEntityId}`;
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
