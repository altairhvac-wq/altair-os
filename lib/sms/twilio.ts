import "server-only";

import twilio from "twilio";
import { maskPhoneNumber } from "@/lib/sms/compliance";

const TWILIO_ACCOUNT_SID_ENV = "TWILIO_ACCOUNT_SID";
const TWILIO_AUTH_TOKEN_ENV = "TWILIO_AUTH_TOKEN";
const SMS_FROM_NUMBER_ENV = "SMS_FROM_NUMBER";

export type TwilioSendInput = {
  to: string;
  body: string;
  companyId: string;
  invoiceId?: string;
};

export type TwilioSendResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; message: string };

export async function sendViaTwilio(
  input: TwilioSendInput,
): Promise<TwilioSendResult> {
  const accountSid = process.env[TWILIO_ACCOUNT_SID_ENV]?.trim();
  const authToken = process.env[TWILIO_AUTH_TOKEN_ENV]?.trim();
  const fromNumber = process.env[SMS_FROM_NUMBER_ENV]?.trim();

  if (!accountSid || !authToken || !fromNumber) {
    return {
      ok: false,
      message: "Text message sending is not configured yet.",
    };
  }

  try {
    const client = twilio(accountSid, authToken);
    const message = await client.messages.create({
      body: input.body,
      from: fromNumber,
      to: input.to,
    });

    if (!message.sid) {
      return {
        ok: false,
        message: "Text message could not be sent. Try again or copy the payment link.",
      };
    }

    return { ok: true, providerMessageId: message.sid };
  } catch (error) {
    console.error("[sendViaTwilio] send failed:", {
      companyId: input.companyId,
      invoiceId: input.invoiceId,
      toMasked: maskPhoneNumber(input.to),
      errorName: error instanceof Error ? error.name : "unknown",
    });

    return {
      ok: false,
      message: "Text message could not be sent. Try again or copy the payment link.",
    };
  }
}
