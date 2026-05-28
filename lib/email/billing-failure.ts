import type { ResendSendResult } from "@/lib/email/resend";

export type BillingEmailFailureCode =
  | "invalid_customer_email"
  | "recipient_override_invalid"
  | "approval_link_generation_failed"
  | "email_provider_failed"
  | "email_configuration_missing";

export function getBillingEmailFailureCode(
  result: Extract<ResendSendResult, { ok: false }>,
): BillingEmailFailureCode {
  switch (result.reason) {
    case "not_configured":
      return "email_configuration_missing";
    case "invalid_recipient":
      return "invalid_customer_email";
    case "recipient_override_invalid":
      return "recipient_override_invalid";
    case "provider_error":
    default:
      return "email_provider_failed";
  }
}

export function getBillingEmailFailureUserMessage(
  result: Extract<ResendSendResult, { ok: false }>,
  input: {
    document: "estimate" | "invoice";
    mode: "send" | "resend";
  },
): string {
  const documentLabel = input.document === "estimate" ? "Estimate" : "Invoice";
  const code = getBillingEmailFailureCode(result);

  if (code === "email_configuration_missing") {
    return `Email isn't set up yet. Ask your office admin to configure RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel, or share the ${input.document} manually.`;
  }

  if (code === "recipient_override_invalid") {
    return (
      result.message ||
      "Billing email recipient override is misconfigured. Fix or remove EMAIL_RECIPIENT_OVERRIDE in Vercel and try again."
    );
  }

  if (code === "invalid_customer_email") {
    return `A valid customer email is required to ${input.mode} this ${input.document}. Update the email on the customer record and try again.`;
  }

  if (input.mode === "resend") {
    return `${documentLabel} email could not be resent. The ${input.document} status is unchanged — check the customer's email on their profile and try again.`;
  }

  if (result.message && result.reason === "provider_error") {
    return result.message;
  }

  return `${documentLabel} could not be sent by email. It remains a draft — try again in a moment or contact your office admin.`;
}

export const MISSING_APP_URL_USER_MESSAGE =
  "App URL is not configured. Set NEXT_PUBLIC_APP_URL to your production site URL (including https://) in Vercel before sending estimate approval links.";

export const INVALID_APP_URL_USER_MESSAGE =
  "NEXT_PUBLIC_APP_URL is set but is not a valid URL. Use a full URL with https:// (for example, https://your-app.vercel.app) in Vercel.";

export function getApprovalLinkFailureUserMessage(error: string): string {
  if (error === MISSING_APP_URL_USER_MESSAGE || error.includes("App URL is not configured")) {
    return MISSING_APP_URL_USER_MESSAGE;
  }

  if (error.includes("NEXT_PUBLIC_APP_URL") && error.includes("valid URL")) {
    return INVALID_APP_URL_USER_MESSAGE;
  }

  return error;
}
