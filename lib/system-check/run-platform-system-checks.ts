import "server-only";

import { isCronSecretConfigured } from "@/lib/automation/env";
import { resolveAppBaseUrl } from "@/lib/email/env";
import { getStripeSecretKey, getStripeWebhookSecret } from "@/lib/payments/env";
import { isSmsSendingConfigured, getSmsProvider } from "@/lib/sms/env";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type {
  PlatformSystemCheckItem,
  PlatformSystemCheckSummary,
} from "@/shared/types/platform-reliability";

function buildCheck(
  id: string,
  label: string,
  status: PlatformSystemCheckItem["status"],
  message: string,
): PlatformSystemCheckItem {
  return { id, label, status, message };
}

/**
 * Platform-level environment checks for founder visibility.
 * Never reads or exposes secret values — presence/absence only.
 */
export function runPlatformSystemChecks(): PlatformSystemCheckSummary {
  const checks: PlatformSystemCheckItem[] = [];

  const requiredEnv = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ] as const;
  const missingRequired = requiredEnv.filter((name) => !process.env[name]?.trim());

  checks.push(
    missingRequired.length === 0
      ? buildCheck(
          "env-required",
          "Required Supabase env",
          "pass",
          "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured.",
        )
      : buildCheck(
          "env-required",
          "Required Supabase env",
          "fail",
          `Missing: ${missingRequired.join(", ")}`,
        ),
  );

  checks.push(
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
      ? buildCheck(
          "env-service-role",
          "Supabase service role",
          "pass",
          "SUPABASE_SERVICE_ROLE_KEY is configured.",
        )
      : buildCheck(
          "env-service-role",
          "Supabase service role",
          "fail",
          "SUPABASE_SERVICE_ROLE_KEY is not set.",
        ),
  );

  checks.push(
    isCronSecretConfigured()
      ? buildCheck(
          "env-cron-secret",
          "Cron secret",
          "pass",
          "CRON_SECRET is configured.",
        )
      : buildCheck(
          "env-cron-secret",
          "Cron secret",
          "fail",
          "CRON_SECRET is not set — scheduled automations cannot run.",
        ),
  );

  const hasStripeSecret = Boolean(getStripeSecretKey());
  const hasStripeWebhook = Boolean(getStripeWebhookSecret());

  if (hasStripeSecret && hasStripeWebhook) {
    checks.push(
      buildCheck(
        "env-stripe",
        "Stripe checkout",
        "pass",
        "Stripe secret key and webhook secret are configured.",
      ),
    );
  } else {
    const missing: string[] = [];
    if (!hasStripeSecret) {
      missing.push("STRIPE_SECRET_KEY");
    }
    if (!hasStripeWebhook) {
      missing.push("STRIPE_WEBHOOK_SECRET");
    }

    checks.push(
      buildCheck(
        "env-stripe",
        "Stripe checkout",
        "warn",
        `Stripe not fully configured (${missing.join(", ")} missing).`,
      ),
    );
  }

  const hasResendKey = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasResendFrom = Boolean(process.env.RESEND_FROM_EMAIL?.trim());

  if (hasResendKey && hasResendFrom) {
    checks.push(
      buildCheck(
        "env-resend",
        "Email (Resend)",
        "pass",
        "Resend API key and from address are configured.",
      ),
    );
  } else {
    const missing: string[] = [];
    if (!hasResendKey) {
      missing.push("RESEND_API_KEY");
    }
    if (!hasResendFrom) {
      missing.push("RESEND_FROM_EMAIL");
    }

    checks.push(
      buildCheck(
        "env-resend",
        "Email (Resend)",
        "warn",
        `Email sending not fully configured (${missing.join(", ")} missing).`,
      ),
    );
  }

  const smsProvider = getSmsProvider();
  if (smsProvider === "disabled") {
    checks.push(
      buildCheck(
        "env-sms",
        "SMS (Twilio)",
        "warn",
        "SMS provider is disabled (SMS_PROVIDER not set or disabled).",
      ),
    );
  } else if (isSmsSendingConfigured()) {
    checks.push(
      buildCheck(
        "env-sms",
        "SMS (Twilio)",
        "pass",
        "Twilio SMS env is configured.",
      ),
    );
  } else {
    checks.push(
      buildCheck(
        "env-sms",
        "SMS (Twilio)",
        "warn",
        "Twilio SMS env is incomplete.",
      ),
    );
  }

  const appUrl = resolveAppBaseUrl();
  if (appUrl.ok) {
    checks.push(
      buildCheck(
        "env-app-url",
        "Public app URL",
        "pass",
        "Public app URL is configured.",
      ),
    );
  } else if (appUrl.reason === "invalid") {
    checks.push(
      buildCheck(
        "env-app-url",
        "Public app URL",
        "fail",
        "NEXT_PUBLIC_APP_URL is set but is not a valid URL.",
      ),
    );
  } else {
    checks.push(
      buildCheck(
        "env-app-url",
        "Public app URL",
        "warn",
        "NEXT_PUBLIC_APP_URL is not set.",
      ),
    );
  }

  if (!hasSupabaseEnv()) {
    checks.push(
      buildCheck(
        "env-runtime",
        "Supabase runtime",
        "fail",
        "Supabase client env is incomplete.",
      ),
    );
  }

  const criticalFailureCount = checks.filter((check) => check.status === "fail").length;
  const warningCount = checks.filter((check) => check.status === "warn").length;

  return {
    checkedAt: new Date().toISOString(),
    checks,
    criticalFailureCount,
    warningCount,
    isHealthy: criticalFailureCount === 0,
  };
}
