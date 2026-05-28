import type {
  OperationalActivity,
  OperationalActivityEventType,
  OperationalActivitySource,
} from "@/shared/types/operational-activity";
import type { NotificationType } from "@/lib/database/types/enums";

/** Estimate, invoice, and payment workflow events (incl. email resend types). */
export const BILLING_SENSITIVE_OPERATIONAL_EVENT_TYPES = new Set<
  OperationalActivityEventType
>([
  "estimate_created",
  "estimate_sent",
  "estimate_email_resent",
  "estimate_approved",
  "estimate_declined",
  "estimate_cancelled",
  "estimate_converted_to_invoice",
  "invoice_created",
  "invoice_sent",
  "invoice_email_resent",
  "invoice_voided",
  "invoice_updated",
  "invoice_cancelled",
  "payment_recorded",
  "invoice_paid",
  "invoice_created_for_completed_job",
]);

const BILLING_SENSITIVE_OPERATIONAL_SOURCES = new Set<OperationalActivitySource>([
  "estimate",
  "invoice",
]);

const BILLING_SENSITIVE_NOTIFICATION_TYPES = new Set<NotificationType>([
  "estimate_approved",
  "invoice_paid",
  "expense_submitted",
]);

export function isBillingSensitiveOperationalActivity(
  activity: OperationalActivity,
): boolean {
  if (BILLING_SENSITIVE_OPERATIONAL_SOURCES.has(activity.source)) {
    return true;
  }

  return BILLING_SENSITIVE_OPERATIONAL_EVENT_TYPES.has(activity.eventType);
}

export function filterOperationalActivitiesForBillingAccess(
  activities: OperationalActivity[],
  canViewBilling: boolean,
): OperationalActivity[] {
  if (canViewBilling) {
    return activities;
  }

  return activities.filter(
    (activity) => !isBillingSensitiveOperationalActivity(activity),
  );
}

export function isBillingSensitiveNotificationType(
  type: NotificationType,
): boolean {
  return BILLING_SENSITIVE_NOTIFICATION_TYPES.has(type);
}
