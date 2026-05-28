import {
  classifyResendProviderError,
  type BillingEmailFailureCode,
} from "@/lib/email/billing-failure";
import {
  getMissingResendEnvVars,
  getResendEmailEnv,
} from "@/lib/email/env";
import {
  resolveEmailRecipient,
  type ResolvedEmailRecipient,
} from "@/lib/email/recipient";

export type EmailRecipientRedirect = Pick<
  ResolvedEmailRecipient,
  "intendedRecipient" | "redirected" | "warning" | "overrideEnv"
>;

type ResendSendFailure = {
  ok: false;
  message: string;
  failureCode: BillingEmailFailureCode;
  reachedProvider: boolean;
  intendedRecipient?: string;
  actualRecipient?: string;
  fromEmail?: string;
  providerMessage?: string;
};

export type ResendSendResult =
  | {
      ok: true;
      providerMessageId: string;
      recipientRedirect?: EmailRecipientRedirect;
    }
  | (ResendSendFailure & {
      reason: "not_configured";
      missingEnv: string[];
    })
  | (ResendSendFailure & {
      reason: "invalid_recipient";
    })
  | (ResendSendFailure & {
      reason: "recipient_override_invalid";
      overrideEnv?: string;
    })
  | (ResendSendFailure & {
      reason: "provider_error";
    });

type SendViaResendInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  logContext: string;
  fromDisplayName?: string;
  replyTo?: string;
};

function escapeDisplayName(displayName: string): string {
  return displayName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function formatDisplayName(displayName: string): string {
  const trimmedName = displayName.trim();
  const needsQuoting = /[,;"<>()[\]]/.test(trimmedName) || trimmedName.includes("@");

  if (!needsQuoting) {
    return trimmedName;
  }

  return `"${escapeDisplayName(trimmedName)}"`;
}

function buildFromAddress(from: string, displayName?: string): string {
  const trimmedName = displayName?.trim();

  if (!trimmedName) {
    return from;
  }

  const emailMatch = from.match(/<([^>]+)>/);
  const email = emailMatch?.[1]?.trim() || from.trim();

  return `${formatDisplayName(trimmedName)} <${email}>`;
}

export async function sendViaResend(
  input: SendViaResendInput,
): Promise<ResendSendResult> {
  const missingEnv = getMissingResendEnvVars();

  if (missingEnv.length > 0) {
    return {
      ok: false,
      reason: "not_configured",
      missingEnv,
      failureCode: "email_configuration_missing",
      reachedProvider: false,
      message: "Email sending is not configured yet.",
    };
  }

  const env = getResendEmailEnv();

  if (!env.configured) {
    const missing = getMissingResendEnvVars();
    return {
      ok: false,
      reason: "not_configured",
      missingEnv: missing,
      failureCode: "email_configuration_missing",
      reachedProvider: false,
      message: "Email sending is not configured yet.",
    };
  }

  const resolved = resolveEmailRecipient(input.to);
  const fromEmail = buildFromAddress(env.resend.from, input.fromDisplayName);

  if (!resolved.ok) {
    console.error(`[${input.logContext}] recipient resolution failed before provider send:`, {
      reason: resolved.reason,
      error: resolved.error,
      overrideEnv: resolved.overrideEnv ?? null,
      intendedRecipient: input.to.trim() || null,
      fromEmail,
      reachedProvider: false,
    });

    if (resolved.reason === "recipient_override_invalid") {
      return {
        ok: false,
        reason: "recipient_override_invalid",
        message: resolved.error,
        failureCode: "recipient_override_invalid",
        reachedProvider: false,
        intendedRecipient: input.to.trim() || undefined,
        fromEmail,
        overrideEnv: resolved.overrideEnv,
      };
    }

    return {
      ok: false,
      reason: "invalid_recipient",
      message: resolved.error,
      failureCode: "invalid_customer_email",
      reachedProvider: false,
      intendedRecipient: input.to.trim() || undefined,
      fromEmail,
    };
  }

  const { recipient } = resolved;
  const toDomain = recipient.to.split("@")[1] ?? "unknown";
  const intendedDomain = recipient.intendedRecipient.split("@")[1] ?? "unknown";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resend.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipient.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string; statusCode?: number }
      | null;

    if (!response.ok) {
      const classified = classifyResendProviderError(response.status, payload);

      console.error(`[${input.logContext}] provider rejected request:`, {
        status: response.status,
        failureCode: classified.failureCode,
        reachedProvider: true,
        providerMessage: classified.providerMessage,
        intendedRecipient: recipient.intendedRecipient,
        actualRecipient: recipient.to,
        fromEmail,
        toDomain,
        intendedDomain,
        redirected: recipient.redirected,
        overrideEnv: recipient.overrideEnv ?? null,
      });

      return {
        ok: false,
        reason: "provider_error",
        failureCode: classified.failureCode,
        reachedProvider: true,
        message: classified.userMessage,
        providerMessage: classified.providerMessage,
        intendedRecipient: recipient.intendedRecipient,
        actualRecipient: recipient.to,
        fromEmail,
      };
    }

    const providerMessageId = payload?.id?.trim();

    if (!providerMessageId) {
      console.error(`[${input.logContext}] provider response missing id:`, {
        status: response.status,
        failureCode: "email_provider_failed",
        reachedProvider: true,
        providerMessage: payload?.message ?? payload?.name ?? "missing id",
        intendedRecipient: recipient.intendedRecipient,
        actualRecipient: recipient.to,
        fromEmail,
        toDomain,
      });

      return {
        ok: false,
        reason: "provider_error",
        failureCode: "email_provider_failed",
        reachedProvider: true,
        message:
          "We couldn't confirm the email was sent. Review the customer's email and try again.",
        providerMessage: payload?.message ?? payload?.name ?? "missing id",
        intendedRecipient: recipient.intendedRecipient,
        actualRecipient: recipient.to,
        fromEmail,
      };
    }

    console.info(`[${input.logContext}] provider accepted email:`, {
      providerMessageId,
      status: response.status,
      toDomain,
      intendedDomain,
      redirected: recipient.redirected,
      overrideEnv: recipient.overrideEnv ?? null,
      intendedRecipient: recipient.intendedRecipient,
      actualRecipient: recipient.to,
      fromEmail,
    });

    return {
      ok: true,
      providerMessageId,
      recipientRedirect: recipient.redirected
        ? {
            intendedRecipient: recipient.intendedRecipient,
            redirected: recipient.redirected,
            warning: recipient.warning,
            overrideEnv: recipient.overrideEnv,
          }
        : undefined,
    };
  } catch (error) {
    const providerMessage =
      error instanceof Error ? error.message : "network request failed";

    console.error(`[${input.logContext}] provider request failed:`, {
      failureCode: "email_provider_failed",
      reachedProvider: true,
      providerMessage,
      intendedRecipient: recipient.intendedRecipient,
      actualRecipient: recipient.to,
      fromEmail,
      toDomain,
    });

    return {
      ok: false,
      reason: "provider_error",
      failureCode: "email_provider_failed",
      reachedProvider: true,
      message: "We couldn't reach the email service. Try again in a moment.",
      providerMessage,
      intendedRecipient: recipient.intendedRecipient,
      actualRecipient: recipient.to,
      fromEmail,
    };
  }
}
