/**
 * SMS provider types — foundation only; no live sending in this phase.
 *
 * Before enabling live SMS, implement:
 * - Customer consent capture and audit trail
 * - STOP/opt-out handling and suppression lists
 * - Sender registration (e.g. 10DLC / toll-free verification)
 * - Delivery logs and provider webhooks
 * - Rate limits and abuse prevention
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
