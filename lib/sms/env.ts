import "server-only";

import type { SmsProvider } from "@/lib/sms/types";

const SMS_PROVIDER_ENV = "SMS_PROVIDER";
const SMS_FROM_NUMBER_ENV = "SMS_FROM_NUMBER";
const TWILIO_ACCOUNT_SID_ENV = "TWILIO_ACCOUNT_SID";
const TWILIO_AUTH_TOKEN_ENV = "TWILIO_AUTH_TOKEN";

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
 * Returns true only when a supported provider is selected and required env is present.
 */
export function isSmsSendingConfigured(): boolean {
  const provider = getSmsProvider();

  if (provider === "twilio") {
    return isTwilioSmsConfigured();
  }

  return false;
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

    return missing;
  }

  missing.push(SMS_PROVIDER_ENV);
  return missing;
}
