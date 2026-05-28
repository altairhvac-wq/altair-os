import type { BillingEmailDelivery } from "@/lib/email/billing-send";

export const NO_ACTIVE_COMPANY_MESSAGE =
  "Your session expired or no company is selected. Sign in again.";

export function formatActionError(
  error: string | undefined | null,
  fallback: string,
): string {
  if (!error?.trim()) {
    return fallback;
  }

  if (error === "No active company workspace.") {
    return NO_ACTIVE_COMPANY_MESSAGE;
  }

  return error;
}

export function formatBillingEmailDeliveryError(
  delivery: BillingEmailDelivery,
  documentLabel: "estimate" | "invoice",
  mode: "send" | "resend",
): string {
  if (delivery.status === "not_configured") {
    return `Email isn't set up yet. Ask your office admin to configure outbound email in Settings, or share the ${documentLabel} manually.`;
  }

  if (mode === "resend") {
    return `${documentLabel === "estimate" ? "Estimate" : "Invoice"} email could not be resent. Check the customer's email on their profile and try again.`;
  }

  return `${documentLabel === "estimate" ? "Estimate" : "Invoice"} could not be sent by email. It remains a draft — review the customer's email and try again.`;
}

export function formatUploadError(): string {
  return "Upload failed. Check your connection and try again.";
}

export function formatRetryGuidance(message: string): string {
  return `${message} Review and retry, or contact your office if this keeps happening.`;
}

export const MISSING_CUSTOMER_EMAIL_SEND_REASON =
  "Add a customer email on their profile before sending.";
