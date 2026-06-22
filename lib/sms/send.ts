import "server-only";

import { getSmsProvider, isSmsSendingConfigured } from "@/lib/sms/env";
import type { SendSmsMessageInput, SmsSendResult } from "@/lib/sms/types";

/**
 * Send an SMS message through the configured provider.
 *
 * Foundation phase: no external API calls. Returns not_configured/disabled results
 * until a provider implementation, consent handling, and opt-out checks exist.
 */
export async function sendSmsMessage(
  _input: SendSmsMessageInput,
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

  return {
    ok: false,
    status: "disabled",
    provider,
    message: "Text message sending is not configured yet.",
  };
}
