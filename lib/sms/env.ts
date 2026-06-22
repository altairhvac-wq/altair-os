import "server-only";

import type { SmsProvider } from "@/lib/sms/types";

const SMS_PROVIDER_ENV = "SMS_PROVIDER";
const SMS_FROM_NUMBER_ENV = "SMS_FROM_NUMBER";

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

/**
 * Returns true only when a future provider is selected and required env is present.
 * Always false in this phase — no provider SDK or API calls are wired yet.
 */
export function isSmsSendingConfigured(): boolean {
  const provider = getSmsProvider();

  if (provider === "disabled") {
    return false;
  }

  const fromNumber = process.env[SMS_FROM_NUMBER_ENV]?.trim();

  if (!fromNumber) {
    return false;
  }

  // Provider-specific secrets (TWILIO_*, TELNYX_*, etc.) are checked when live
  // sending is implemented. Until then, treat all providers as not configured.
  return false;
}

export function getMissingSmsEnvVars(): string[] {
  const provider = getSmsProvider();
  const missing: string[] = [];

  if (provider === "disabled") {
    missing.push(SMS_PROVIDER_ENV);
  }

  if (!process.env[SMS_FROM_NUMBER_ENV]?.trim()) {
    missing.push(SMS_FROM_NUMBER_ENV);
  }

  return missing;
}
