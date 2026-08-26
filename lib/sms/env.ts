import "server-only";

import type { SmsProvider } from "@/lib/sms/types";

const SMS_PROVIDER_ENV = "SMS_PROVIDER";
const SMS_FROM_NUMBER_ENV = "SMS_FROM_NUMBER";
const TWILIO_ACCOUNT_SID_ENV = "TWILIO_ACCOUNT_SID";
const TWILIO_AUTH_TOKEN_ENV = "TWILIO_AUTH_TOKEN";

/**
 * Explicit assertion that inbound STOP handling is deployed and processing
 * replies. Must be the literal string "live".
 */
export const SMS_INBOUND_STOP_HANDLING_ENV = "SMS_INBOUND_STOP_HANDLING";
const SMS_INBOUND_STOP_HANDLING_LIVE_VALUE = "live";

const KNOWN_SMS_PROVIDERS = new Set<SmsProvider>([
  "disabled",
  "twilio",
  "telnyx",
]);

function readSmsProviderEnv(): SmsProvider {
  const raw = process.env[SMS_PROVIDER_ENV]?.trim().toLowerCase();

  if (!raw || raw === "disabled") {
    return "disabled";
  }

  if (KNOWN_SMS_PROVIDERS.has(raw as SmsProvider)) {
    return raw as SmsProvider;
  }

  return "disabled";
}

export function getSmsProvider(): SmsProvider {
  return readSmsProviderEnv();
}

function isTwilioSmsConfigured(): boolean {
  return Boolean(
    process.env[TWILIO_ACCOUNT_SID_ENV]?.trim() &&
      process.env[TWILIO_AUTH_TOKEN_ENV]?.trim() &&
      process.env[SMS_FROM_NUMBER_ENV]?.trim(),
  );
}

/**
 * ==================== THE COMPLIANCE GATE ====================
 *
 * Outbound payment-link texts carry STOP language, and nothing processes an
 * inbound STOP reply: there is no inbound webhook, so a recipient who replies
 * STOP is never recorded in `sms_opt_outs` and the next payment link goes out
 * anyway. Under US TCPA rules, soliciting an opt-out keyword and then ignoring
 * it carries per-message statutory exposure.
 *
 * Configuring Twilio credentials is therefore NOT sufficient to enable
 * sending. An operator must additionally assert, explicitly, that inbound STOP
 * handling is live. That assertion is a separate variable rather than an
 * inference from the credentials, because "we have a Twilio account" and "we
 * honour opt-outs" are different facts and only the second one is the legal
 * question.
 *
 * The failure mode this prevents is the realistic one: someone adds Twilio
 * credentials to Vercel to test a payment link, and outbound SMS silently
 * switches on for every customer with no way to opt out.
 *
 * WHEN INBOUND STOP HANDLING SHIPS: implement the webhook, write opt-outs into
 * `sms_opt_outs`, check that table before every send, then set
 * SMS_INBOUND_STOP_HANDLING=live. Do not set it before that is true.
 */
export function isSmsInboundStopHandlingLive(): boolean {
  return (
    process.env[SMS_INBOUND_STOP_HANDLING_ENV]?.trim().toLowerCase() ===
    SMS_INBOUND_STOP_HANDLING_LIVE_VALUE
  );
}

export type SmsComplianceStatus =
  | { ok: true }
  | { ok: false; reason: "provider_disabled" }
  | { ok: false; reason: "credentials_missing" }
  | { ok: false; reason: "inbound_stop_handling_not_live" };

/**
 * Why outbound SMS is or is not permitted, as a single answer.
 *
 * Ordered so the most actionable reason wins: a misconfigured deployment that
 * has credentials but no opt-out handling is reported as the compliance
 * problem it is, not as "not configured".
 */
export function getSmsComplianceStatus(): SmsComplianceStatus {
  const provider = getSmsProvider();

  if (provider === "disabled") {
    return { ok: false, reason: "provider_disabled" };
  }

  if (provider === "twilio" && !isTwilioSmsConfigured()) {
    return { ok: false, reason: "credentials_missing" };
  }

  if (!isSmsInboundStopHandlingLive()) {
    return { ok: false, reason: "inbound_stop_handling_not_live" };
  }

  return { ok: true };
}

/**
 * True only when a supported provider is selected, its credentials are
 * present, AND inbound STOP handling has been asserted live.
 */
export function isSmsSendingConfigured(): boolean {
  return getSmsComplianceStatus().ok;
}

/**
 * True when credentials are present but the compliance gate is what is holding
 * sending back. This is the dangerous production misconfiguration, and it is
 * reported separately so the system check can say so plainly rather than
 * showing "SMS not configured".
 */
export function isSmsBlockedOnComplianceOnly(): boolean {
  const status = getSmsComplianceStatus();
  return !status.ok && status.reason === "inbound_stop_handling_not_live";
}

export function getMissingSmsEnvVars(): string[] {
  const provider = getSmsProvider();
  const missing: string[] = [];

  if (provider === "disabled") {
    missing.push(SMS_PROVIDER_ENV);
    return missing;
  }

  if (provider === "twilio") {
    if (!process.env[SMS_FROM_NUMBER_ENV]?.trim()) {
      missing.push(SMS_FROM_NUMBER_ENV);
    }

    if (!process.env[TWILIO_ACCOUNT_SID_ENV]?.trim()) {
      missing.push(TWILIO_ACCOUNT_SID_ENV);
    }

    if (!process.env[TWILIO_AUTH_TOKEN_ENV]?.trim()) {
      missing.push(TWILIO_AUTH_TOKEN_ENV);
    }

    if (!isSmsInboundStopHandlingLive()) {
      missing.push(SMS_INBOUND_STOP_HANDLING_ENV);
    }

    return missing;
  }

  missing.push(SMS_PROVIDER_ENV);
  return missing;
}
