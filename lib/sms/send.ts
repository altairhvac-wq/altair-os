import "server-only";

import { maskPhoneNumber } from "@/lib/sms/compliance";
import { getSmsProvider, isSmsSendingConfigured } from "@/lib/sms/env";
import { sendViaTwilio } from "@/lib/sms/twilio";
import type { SendSmsMessageInput, SmsSendResult } from "@/lib/sms/types";

/**
 * Send an SMS message through the configured provider.
 */
export async function sendSmsMessage(
  input: SendSmsMessageInput,
): Promise<SmsSendResult> {
  const provider = getSmsProvider();

  if (provider === "disabled" || !isSmsSendingConfigured()) {
    return {
      ok: false,
      status: "not_configured",
      provider,
      message: "Text message sending is not configured yet.",
    };
  }

  if (provider === "twilio") {
    const result = await sendViaTwilio({
      to: input.to,
      body: input.body,
      companyId: input.companyId,
      invoiceId: input.invoiceId,
    });

    if (!result.ok) {
      return {
        ok: false,
        status: "failed",
        provider,
        message: result.message,
      };
    }

    return {
      ok: true,
      status: "sent",
      provider,
      providerMessageId: result.providerMessageId,
    };
  }

  console.error("[sendSmsMessage] unsupported provider:", {
    provider,
    companyId: input.companyId,
    invoiceId: input.invoiceId,
    toMasked: maskPhoneNumber(input.to),
  });

  return {
    ok: false,
    status: "not_configured",
    provider,
    message: "Text message sending is not configured yet.",
  };
}
