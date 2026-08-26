import "server-only";

import { captureMonitoredEvent } from "@/lib/operations/monitoring";
import { maskPhoneNumber } from "@/lib/sms/compliance";
import {
  getSmsComplianceStatus,
  getSmsProvider,
} from "@/lib/sms/env";
import { sendViaTwilio } from "@/lib/sms/twilio";
import type { SendSmsMessageInput, SmsSendResult } from "@/lib/sms/types";

/**
 * Send an SMS message through the configured provider.
 *
 * ==================== THE COMPLIANCE GATE ====================
 * Sending is refused unless inbound STOP handling has been asserted live (see
 * lib/sms/env.ts). Outbound texts invite a STOP reply that nothing currently
 * processes, so a deployment that has Twilio credentials but no opt-out
 * handling must not send — and must say why, loudly, rather than reporting the
 * generic "not configured" that an operator would read as "someone forgot a
 * variable".
 */
export async function sendSmsMessage(
  input: SendSmsMessageInput,
): Promise<SmsSendResult> {
  const provider = getSmsProvider();
  const compliance = getSmsComplianceStatus();

  if (!compliance.ok) {
    if (compliance.reason === "inbound_stop_handling_not_live") {
      // Credentials are present and someone expected this to send. That is the
      // dangerous misconfiguration, so it is an alert, not a log line.
      console.error("[sendSmsMessage] blocked: inbound STOP handling is not live", {
        provider,
        companyId: input.companyId,
        invoiceId: input.invoiceId,
        toMasked: maskPhoneNumber(input.to),
      });

      captureMonitoredEvent({
        event: "sms.blocked_missing_stop_handling",
        level: "error",
        companyId: input.companyId,
        meta: {
          provider,
          invoiceId: input.invoiceId,
          reason: compliance.reason,
        },
      });

      return {
        ok: false,
        status: "not_configured",
        provider,
        message:
          "Text messaging is turned off until STOP replies can be honoured. Send this payment link by email instead.",
      };
    }

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
