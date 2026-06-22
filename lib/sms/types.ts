/**
 * SMS provider types for transactional payment-link texts.
 *
 * Live send requires Altair-managed provider env, opt-out persistence, and
 * compliant message content. Inbound STOP automation is not implemented yet.
 */

export type SmsProvider = "disabled" | "twilio" | "telnyx";

export type SmsMessagePurpose = "invoice_payment_link";

export type SmsSendStatus = "sent" | "not_configured" | "disabled" | "failed";

export type SmsSendResult =
  | {
      ok: true;
      status: "sent";
      provider: SmsProvider;
      providerMessageId?: string;
    }
  | {
      ok: false;
      status: Exclude<SmsSendStatus, "sent">;
      provider: SmsProvider;
      message: string;
    };

export type SendSmsMessageInput = {
  to: string;
  body: string;
  purpose: SmsMessagePurpose;
  companyId: string;
  invoiceId?: string;
  createdBy?: string;
};
