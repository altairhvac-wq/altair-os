import {
  assertNever,
  isRunnableAutomationEvent,
  type OperationalAutomationEvent,
  type OperationalEventName,
} from "@/lib/database/services/operational-guards";
import {
  notifyEstimateApproved,
  notifyExpenseRejected,
  notifyExpenseSubmitted,
  notifyInvoicePaid,
  notifyJobAssigned,
  notifyWorkCompleted,
} from "@/lib/database/services/operational-notifications";

export type { OperationalAutomationEvent, OperationalEventName };

/**
 * Internal automation hook for operational events.
 *
 * V1 evaluates fixed, safe notification-style rules only. Failures are logged
 * and never propagate to callers.
 *
 * TODO(automation): overdue invoice reminders (requires scheduled/cron evaluation).
 * TODO(automation): stalled job alerts (requires time-based follow-up).
 * TODO(automation): unreviewed completed work (requires delayed re-check).
 * TODO(automation): pending expense aging (requires delayed re-check).
 * TODO(ai): AI summaries from enriched event context.
 */

function fireAndForgetAutomation(handler: () => void): void {
  try {
    handler();
  } catch (error) {
    console.error("[operational-automation] side-effect failed:", error);
  }
}

function runOperationalAutomation(event: OperationalAutomationEvent): void {
  switch (event.type) {
    case "job_assigned":
      notifyJobAssigned({
        companyId: event.companyId,
        technicianId: event.technicianId,
        actorId: event.actorId,
        jobId: event.jobId,
        jobNumber: event.jobNumber,
        customerId: event.customerId,
        technicianName: event.technicianName,
      });
      return;

    case "work_completed":
      notifyWorkCompleted({
        companyId: event.companyId,
        actorId: event.actorId,
        jobId: event.jobId,
        jobNumber: event.jobNumber,
        customerId: event.customerId,
      });
      return;

    case "expense_submitted":
      notifyExpenseSubmitted({
        companyId: event.companyId,
        actorId: event.actorId,
        expenseId: event.expenseId,
        expenseNumber: event.expenseNumber,
        merchant: event.merchant,
        amount: event.amount,
        technicianName: event.technicianName,
        jobId: event.jobId,
      });
      return;

    case "expense_rejected":
      notifyExpenseRejected({
        companyId: event.companyId,
        technicianId: event.technicianId,
        actorId: event.actorId,
        expenseId: event.expenseId,
        expenseNumber: event.expenseNumber,
        merchant: event.merchant,
        amount: event.amount,
        rejectionReason: event.rejectionReason,
      });
      return;

    case "invoice_paid":
      notifyInvoicePaid({
        companyId: event.companyId,
        actorId: event.actorId,
        invoiceId: event.invoiceId,
        invoiceNumber: event.invoiceNumber,
        amount: event.amount,
        customerId: event.customerId,
        jobId: event.jobId,
      });
      return;

    case "estimate_approved":
      notifyEstimateApproved({
        companyId: event.companyId,
        actorId: event.actorId,
        estimateId: event.estimateId,
        estimateNumber: event.estimateNumber,
        customerId: event.customerId,
        jobId: event.jobId,
      });
      return;

    case "job_material_added":
      // TODO(automation): evaluate inventory/low-stock or billing follow-ups.
      return;

    default:
      return assertNever(event);
  }
}

export function maybeRunOperationalAutomation(
  event: OperationalAutomationEvent,
): void {
  if (!isRunnableAutomationEvent(event)) {
    console.warn("[operational-automation] skipped invalid event:", {
      type: event.type,
      companyId: event.companyId,
    });
    return;
  }

  fireAndForgetAutomation(() => runOperationalAutomation(event));
}
