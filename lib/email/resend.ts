import {
  formatMissingEmailEnvMessage,
  getMissingResendEnvVars,
  getResendEmailEnv,
} from "@/lib/email/env";

export type ResendSendResult =
  | { ok: true; providerMessageId: string }
  | {
      ok: false;
      reason: "not_configured";
      missingEnv: string[];
      message: string;
    }
  | { ok: false; reason: "provider_error"; message: string };

type SendViaResendInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  logContext: string;
  fromDisplayName?: string;
  replyTo?: string;
};

function buildFromAddress(from: string, displayName?: string): string {
  const trimmedName = displayName?.trim();

  if (!trimmedName) {
    return from;
  }

  const emailMatch = from.match(/<([^>]+)>/);
  const email = emailMatch?.[1]?.trim() || from.trim();

  return `${trimmedName} <${email}>`;
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
      message: formatMissingEmailEnvMessage(missingEnv),
    };
  }

  const env = getResendEmailEnv();

  if (!env.configured) {
    const missing = getMissingResendEnvVars();
    return {
      ok: false,
      reason: "not_configured",
      missingEnv: missing,
      message: formatMissingEmailEnvMessage(missing),
    };
  }

  const toDomain = input.to.split("@")[1] ?? "unknown";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resend.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: buildFromAddress(env.resend.from, input.fromDisplayName),
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string }
      | null;

    if (!response.ok) {
      console.error(`[${input.logContext}] provider rejected request:`, {
        status: response.status,
        providerMessage: payload?.message ?? payload?.name ?? "unknown",
        toDomain,
      });

      return {
        ok: false,
        reason: "provider_error",
        message:
          "The email could not be delivered. Check the recipient address and try again.",
      };
    }

    const providerMessageId = payload?.id?.trim();

    if (!providerMessageId) {
      console.error(`[${input.logContext}] provider response missing id:`, {
        status: response.status,
        toDomain,
      });

      return {
        ok: false,
        reason: "provider_error",
        message:
          "We couldn't confirm the email was sent. Review the customer's email and try again.",
      };
    }

    console.info(`[${input.logContext}] provider accepted email:`, {
      providerMessageId,
      status: response.status,
      toDomain,
    });

    return { ok: true, providerMessageId };
  } catch (error) {
    console.error(`[${input.logContext}] provider request failed:`, {
      toDomain,
      error: error instanceof Error ? error.message : "unknown",
    });

    return {
      ok: false,
      reason: "provider_error",
      message:
        "We couldn't reach the email service. Try again in a moment.",
    };
  }
}
