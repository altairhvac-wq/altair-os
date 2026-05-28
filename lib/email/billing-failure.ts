import type { ResendSendResult } from "@/lib/email/resend";

export type BillingEmailFailureCode =
  | "invalid_customer_email"
  | "recipient_override_invalid"
  | "approval_link_generation_failed"
  | "email_configuration_missing"
  | "email_sender_not_verified"
  | "email_invalid_from_address"
  | "email_recipient_sandbox_restricted"
  | "email_recipient_rejected"
  | "email_provider_failed";

type ResendProviderErrorPayload = {
  message?: string;
  name?: string;
  statusCode?: number;
};

export function classifyResendProviderError(
  status: number,
  payload: ResendProviderErrorPayload | null,
): {
  failureCode: BillingEmailFailureCode;
  userMessage: string;
  providerMessage: string;
} {
  const providerMessage = (
    payload?.message?.trim() ||
    payload?.name?.trim() ||
    `HTTP ${status}`
  ).slice(0, 500);
  const normalized = providerMessage.toLowerCase();

  if (status === 401 || status === 403) {
    return {
      failureCode: "email_configuration_missing",
      userMessage: "Email sending is not configured yet.",
      providerMessage,
    };
  }

  if (
    /domain.*not verified|verify your domain|sender.*not verified|from.*not verified|not authorized to send/i.test(
      normalized,
    )
  ) {
    return {
      failureCode: "email_sender_not_verified",
      userMessage:
        "Email provider rejected the sender address. Check RESEND_FROM_EMAIL and domain verification.",
      providerMessage,
    };
  }

  if (
    /only send testing emails|test mode|verified email address.*send|sandbox/i.test(
      normalized,
    )
  ) {
    return {
      failureCode: "email_recipient_sandbox_restricted",
      userMessage: "Resend test mode only allows verified recipient emails.",
      providerMessage,
    };
  }

  if (/invalid [`']from|from field|sender address/i.test(normalized)) {
    return {
      failureCode: "email_invalid_from_address",
      userMessage:
        "Email provider rejected the sender address. Check RESEND_FROM_EMAIL and domain verification.",
      providerMessage,
    };
  }

  if (/invalid [`']to|recipient|to field|email address.*invalid/i.test(normalized)) {
    return {
      failureCode: "email_recipient_rejected",
      userMessage: "Email provider rejected this recipient address.",
      providerMessage,
    };
  }

  return {
    failureCode: "email_provider_failed",
    userMessage:
      "The email provider could not deliver this message. Try again in a moment or contact your office admin.",
    providerMessage,
  };
}

export function getBillingEmailFailureCode(
  result: Extract<ResendSendResult, { ok: false }>,
): BillingEmailFailureCode {
  if (result.failureCode) {
    return result.failureCode;
  }

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

export function getBillingEmailFailureMessageForCode(
  code: BillingEmailFailureCode,
  input: {
    document: "estimate" | "invoice";
    mode: "send" | "resend";
  },
): string | null {
  const documentLabel = input.document === "estimate" ? "Estimate" : "Invoice";

  switch (code) {
    case "email_configuration_missing":
      return "Email sending is not configured yet.";
    case "email_sender_not_verified":
    case "email_invalid_from_address":
      return "Email provider rejected the sender address. Check RESEND_FROM_EMAIL and domain verification.";
    case "email_recipient_sandbox_restricted":
      return "Resend test mode only allows verified recipient emails.";
    case "email_recipient_rejected":
      return "Email provider rejected this recipient address.";
    case "recipient_override_invalid":
      return "Billing email recipient override is misconfigured. Fix or remove EMAIL_RECIPIENT_OVERRIDE (or legacy TEST_EMAIL vars) in Vercel and try again.";
    case "invalid_customer_email":
      return `A valid customer email is required to ${input.mode} this ${input.document}. Update the email on the customer record and try again.`;
    case "approval_link_generation_failed":
      return "Estimate approval link could not be created. Refresh and try again, or contact your office admin if this keeps happening.";
    case "email_provider_failed":
      if (input.mode === "resend") {
        return `${documentLabel} email could not be resent. Try again in a moment or contact your office admin.`;
      }
      return `${documentLabel} could not be sent by email. It remains a draft — try again in a moment or contact your office admin.`;
    default:
      return null;
  }
}

export function getBillingEmailFailureUserMessage(
  result: Extract<ResendSendResult, { ok: false }>,
  input: {
    document: "estimate" | "invoice";
    mode: "send" | "resend";
  },
): string {
  const code = getBillingEmailFailureCode(result);

  if (code === "recipient_override_invalid" && result.message?.trim()) {
    return result.message.trim();
  }

  const classified = getBillingEmailFailureMessageForCode(code, input);
  if (classified) {
    return classified;
  }

  if (input.mode === "resend") {
    const documentLabel = input.document === "estimate" ? "Estimate" : "Invoice";
    return `${documentLabel} email could not be resent. The ${input.document} status is unchanged — check the customer's email on their profile and try again.`;
  }

  const documentLabel = input.document === "estimate" ? "Estimate" : "Invoice";
  return `${documentLabel} could not be sent by email. It remains a draft — try again in a moment or contact your office admin.`;
}

export function logBillingEmailFailure(
  logContext: string,
  result: Extract<ResendSendResult, { ok: false }>,
  meta?: Record<string, unknown>,
): void {
  const failureCode = getBillingEmailFailureCode(result);

  console.error(`[${logContext}] billing email delivery failed:`, {
    ...meta,
    reason: result.reason,
    failureCode,
    reachedProvider: result.reachedProvider,
    message: result.message,
    providerMessage: result.providerMessage ?? null,
    intendedRecipient: result.intendedRecipient ?? null,
    actualRecipient: result.actualRecipient ?? null,
    fromEmail: result.fromEmail ?? null,
    missingEnv: result.reason === "not_configured" ? result.missingEnv : null,
    overrideEnv:
      result.reason === "recipient_override_invalid" ? result.overrideEnv ?? null : null,
  });
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
