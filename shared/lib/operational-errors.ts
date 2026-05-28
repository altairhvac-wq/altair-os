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
