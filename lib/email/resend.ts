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
};

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
        from: env.resend.from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
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
          payload?.message ??
          "The email provider rejected the message. Check Resend configuration and sender domain.",
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
          "The email provider did not confirm delivery. The document was not marked as sent.",
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
        "Could not reach the email provider. The document was not marked as sent.",
    };
  }
}
