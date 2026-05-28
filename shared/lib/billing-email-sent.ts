import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";
import type { EstimateActivity } from "@/shared/types/estimate-activity";
import type { InvoiceActivity } from "@/shared/types/invoice-activity";

export type BillingEmailSentInfo = {
  recipientEmail: string;
  sentAt: string;
};

const INVOICE_EMAIL_ACTIVITY_TYPES = new Set([
  "invoice_sent",
  "invoice_email_resent",
]);

const ESTIMATE_EMAIL_ACTIVITY_TYPES = new Set([
  "estimate_sent",
  "estimate_email_resent",
]);

export function getLastInvoiceEmailSentInfo(
  activities: InvoiceActivity[],
  recipientEmail: string | undefined | null,
  timeZone?: string,
): BillingEmailSentInfo | null {
  const email = recipientEmail?.trim();

  if (!email) {
    return null;
  }

  const lastActivity = activities.find((activity) =>
    INVOICE_EMAIL_ACTIVITY_TYPES.has(activity.eventType),
  );

  if (!lastActivity) {
    return null;
  }

  return {
    recipientEmail: email,
    sentAt: lastActivity.createdAt,
  };
}

export function getLastEstimateEmailSentInfo(
  activities: EstimateActivity[],
  recipientEmail: string | undefined | null,
): BillingEmailSentInfo | null {
  const email = recipientEmail?.trim();

  if (!email) {
    return null;
  }

  const lastActivity = activities.find((activity) =>
    ESTIMATE_EMAIL_ACTIVITY_TYPES.has(activity.eventType),
  );

  if (!lastActivity) {
    return null;
  }

  return {
    recipientEmail: email,
    sentAt: lastActivity.createdAt,
  };
}

export function formatBillingEmailSentMessage(
  info: BillingEmailSentInfo,
  timeZone?: string,
): string {
  const timestamp = formatDateTimeInTimeZone(info.sentAt, timeZone, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `Last emailed to ${info.recipientEmail} on ${timestamp}`;
}

export function formatBillingEmailSuccessMessage(
  recipientEmail: string,
  mode: "send" | "resend",
  documentLabel: "invoice" | "estimate",
): string {
  const action =
    mode === "resend"
      ? `${documentLabel === "estimate" ? "Estimate" : "Invoice"} resent to`
      : `${documentLabel === "estimate" ? "Estimate" : "Invoice"} sent to`;

  return `${action} ${recipientEmail}.`;
}
