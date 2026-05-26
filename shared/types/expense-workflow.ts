import type { ExpenseStatus } from "@/shared/types/expense";

export type ExpenseWorkflowAction =
  | "submit"
  | "approve"
  | "reject"
  | "reimburse"
  | "return_to_draft";

const EXPENSE_TRANSITIONS: Record<
  ExpenseStatus,
  Partial<Record<ExpenseWorkflowAction, ExpenseStatus>>
> = {
  draft: { submit: "submitted" },
  submitted: { approve: "approved", reject: "rejected" },
  approved: { reimburse: "reimbursed" },
  rejected: { return_to_draft: "draft" },
  reimbursed: {},
};

export function getExpenseStatusForWorkflowAction(
  fromStatus: ExpenseStatus,
  action: ExpenseWorkflowAction,
): ExpenseStatus | null {
  return EXPENSE_TRANSITIONS[fromStatus][action] ?? null;
}

export function getExpenseWorkflowActions(input: {
  status: ExpenseStatus;
  isReimbursable: boolean;
  technicianId: string;
  currentUserId: string;
  canManageBilling: boolean;
  canDispatchJobs: boolean;
}): ExpenseWorkflowAction[] {
  const actions: ExpenseWorkflowAction[] = [];
  const transitions = EXPENSE_TRANSITIONS[input.status];

  if (transitions.submit) {
    const isOwner = input.technicianId === input.currentUserId;
    if (isOwner || input.canManageBilling || input.canDispatchJobs) {
      actions.push("submit");
    }
  }

  if (transitions.approve && input.canManageBilling) {
    actions.push("approve");
  }

  if (transitions.reject && input.canManageBilling) {
    actions.push("reject");
  }

  if (transitions.reimburse && input.canManageBilling && input.isReimbursable) {
    actions.push("reimburse");
  }

  if (transitions.return_to_draft) {
    const isOwner = input.technicianId === input.currentUserId;
    if (isOwner || input.canManageBilling) {
      actions.push("return_to_draft");
    }
  }

  return actions;
}

export const EXPENSE_WORKFLOW_ACTION_LABELS: Record<
  ExpenseWorkflowAction,
  string
> = {
  submit: "Submit for review",
  approve: "Approve",
  reject: "Reject",
  reimburse: "Mark reimbursed",
  return_to_draft: "Return to draft",
};
