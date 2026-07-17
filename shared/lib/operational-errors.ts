import { getBillingEmailFailureMessageForCode } from "@/lib/email/billing-failure";
import type { BillingEmailDelivery } from "@/lib/email/billing-send";
import { isValidEmail } from "@/shared/lib/email-validation";

export const NO_ACTIVE_COMPANY_MESSAGE =
  "Your session expired or no company is selected. Sign in again.";

const RELATED_RECORD_ERROR_MAP: Record<string, string> = {
  "Selected customer was not found.":
    "That customer is no longer available. Refresh the page and choose again.",
  "Selected job was not found.":
    "That job is no longer available. Refresh the page and choose again.",
  "Linked estimate not found.":
    "The linked estimate is no longer available. Refresh the page and try again.",
  "Estimate not found.":
    "This estimate is no longer available. Refresh the page and try again.",
  "Invoice not found.":
    "This invoice is no longer available. Refresh the page and try again.",
  "Customer not found.":
    "That customer is no longer available. Refresh the page and try again.",
  "Job not found.":
    "That job is no longer available. Refresh the page and try again.",
};

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

  const mapped = RELATED_RECORD_ERROR_MAP[error.trim()];
  if (mapped) {
    return mapped;
  }

  return error;
}

export const AUTH_CALLBACK_ERROR_MESSAGE =
  "Sign-in could not be completed. Try signing in again with your email and password.";

export function formatBillingEmailRecipientRedirectWarning(
  delivery: BillingEmailDelivery,
): string | null {
  if (delivery.status !== "sent" || !delivery.recipientRedirect?.redirected) {
    return null;
  }

  return (
    delivery.recipientRedirect.warning ??
    delivery.message ??
    "Email was sent to a test override address instead of the customer."
  );
}

export function formatBillingEmailDeliveryError(
  delivery: BillingEmailDelivery,
  documentLabel: "estimate" | "invoice",
  mode: "send" | "resend",
): string {
  if (delivery.failureCode === "recipient_override_invalid" && delivery.message?.trim()) {
    return delivery.message.trim();
  }

  if (delivery.failureCode) {
    const classified = getBillingEmailFailureMessageForCode(delivery.failureCode, {
      document: documentLabel,
      mode,
    });

    if (classified) {
      return classified;
    }
  }

  if (delivery.status === "not_configured") {
    return "Email sending is not configured yet.";
  }

  if (mode === "resend") {
    return `${documentLabel === "estimate" ? "Estimate" : "Invoice"} email could not be resent. The ${documentLabel} status is unchanged — check the customer's email on their profile and try again.`;
  }

  return `${documentLabel === "estimate" ? "Estimate" : "Invoice"} could not be sent by email. It remains a draft — try again in a moment or contact your office admin.`;
}

export function isBillingEmailRevertFailureMessage(message: string): boolean {
  return message.includes("could not be reverted safely");
}

export function getBillingActionFeedbackTone(
  message: string,
  delivery?: BillingEmailDelivery,
): "error" | "warning" {
  if (
    delivery?.status === "sent" &&
    delivery.recipientRedirect?.redirected
  ) {
    return "warning";
  }

  if (delivery?.status === "not_configured") {
    return "warning";
  }

  if (isBillingEmailRevertFailureMessage(message)) {
    return "warning";
  }

  return "error";
}

export function formatUploadError(): string {
  return "Upload failed. Check your connection and try again.";
}

export function formatRetryGuidance(message: string): string {
  return `${message} Review and retry, or contact your office if this keeps happening.`;
}

/** Thrown / network-failure copy when a mutation never returned a typed result. */
export const CONNECTION_ACTION_ERROR =
  "Connection problem. Check your signal and try again.";

export const OFFLINE_ACTION_ERROR =
  "You're offline. Your entries are still here — reconnect and try again.";

export const CONNECTION_UPLOAD_ERROR =
  "Upload interrupted. Check your connection — your photo is still ready to retry.";

/**
 * Map unexpected throws (timeouts, fetch failures) to safe technician messaging.
 * Prefer typed `{ error }` results from server actions when available.
 */
export function formatConnectionCatchError(
  fallback: string = CONNECTION_ACTION_ERROR,
): string {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return OFFLINE_ACTION_ERROR;
  }

  return fallback;
}

export function formatPreservedFormError(message: string): string {
  if (
    message.includes("still here") ||
    message.includes("entries are saved") ||
    message.includes("Review and retry")
  ) {
    return message;
  }

  return `${message} Your entries are still here — review and try again.`;
}

export const MISSING_CUSTOMER_EMAIL_SEND_REASON =
  "Add a customer email on their profile before sending.";

export const INVALID_CUSTOMER_EMAIL_SEND_REASON =
  "The customer email on file isn't valid. Update it on their profile before sending.";

export function getCustomerEmailSendBlockReason(
  email: string | undefined | null,
): string | null {
  const trimmed = email?.trim();

  if (!trimmed) {
    return MISSING_CUSTOMER_EMAIL_SEND_REASON;
  }

  if (!isValidEmail(trimmed)) {
    return INVALID_CUSTOMER_EMAIL_SEND_REASON;
  }

  return null;
}

export function hasValidCustomerEmailForSend(
  email: string | undefined | null,
): boolean {
  return getCustomerEmailSendBlockReason(email) === null;
}

export function formatInviteAcceptError(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("not found") ||
    lower.includes("no longer available")
  ) {
    return "This invitation is invalid or has expired. Ask your office admin to resend the invite from Settings → Team.";
  }

  if (
    lower.includes("already been accepted") ||
    lower.includes("already a member") ||
    lower.includes("already been claimed")
  ) {
    return "This invitation was already used. Refresh to confirm your access, or ask an admin to resend a new invite.";
  }

  if (lower.includes("suspended")) {
    return "This invitation is suspended and cannot be accepted. Contact your office admin for help.";
  }

  if (lower.includes("does not match") || lower.includes("email address")) {
    return "This invitation does not match your sign-in email. Sign in with the email address that received the invitation.";
  }

  if (lower.includes("failed to load")) {
    return `${message} Try again in a moment.`;
  }

  return formatActionError(message, "Could not accept this invitation. Try again.");
}
