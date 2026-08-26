import "server-only";

import { isCronSecretConfigured } from "@/lib/automation/env";
import { resolveAppBaseUrl } from "@/lib/email/env";
import { getStripeSecretKey, getStripeWebhookSecret } from "@/lib/payments/env";
import {
  getSmsComplianceStatus,
  getSmsProvider,
} from "@/lib/sms/env";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  buildProductionConfigReport,
  isProductionRuntime,
} from "@/lib/system-check/production-config";
import { isPlatformAdminConfigured } from "@/lib/database/platform-admin";
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

  // SMS reports the COMPLIANCE answer, not just the credential answer.
  // "Disabled" is the correct launch state and reads as informational; having
  // credentials without inbound STOP handling is a hard failure, because that
  // is the configuration that would text customers who cannot opt out.
  const smsProvider = getSmsProvider();
  const smsCompliance = getSmsComplianceStatus();

  if (smsCompliance.ok) {
    checks.push(
      buildCheck(
        "env-sms",
        "SMS (Twilio)",
        "pass",
        "Twilio SMS is configured and inbound STOP handling is asserted live.",
      ),
    );
  } else if (smsCompliance.reason === "provider_disabled") {
    checks.push(
      buildCheck(
        "env-sms",
        "SMS (Twilio)",
        "warn",
        "SMS is disabled (SMS_PROVIDER not set). This is the intended launch state until inbound STOP handling ships.",
      ),
    );
  } else if (smsCompliance.reason === "inbound_stop_handling_not_live") {
    checks.push(
      buildCheck(
        "env-sms",
        "SMS (Twilio)",
        "fail",
        `SMS credentials are present for "${smsProvider}" but SMS_INBOUND_STOP_HANDLING is not "live". Sending is blocked: outbound texts invite a STOP reply that nothing processes. Ship inbound STOP handling, or unset SMS_PROVIDER.`,
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

  // ==================== THE PRODUCTION CONFIGURATION CONTRACT ====================
  // Reads lib/system-check/production-config.ts — the same declaration CI uses
  // to prove .env.example documents every variable the code depends on. This
  // reports PRESENCE ONLY and never echoes a value.
  const configReport = buildProductionConfigReport();

  checks.push(
    configReport.missingRequired.length === 0
      ? buildCheck(
          "config-required",
          "Required production configuration",
          "pass",
          "Every variable classified REQUIRED is present.",
        )
      : buildCheck(
          "config-required",
          "Required production configuration",
          "fail",
          `Missing ${configReport.missingRequired.length}: ${configReport.missingRequired
            .map((entry) => entry.name)
            .join(", ")}`,
        ),
  );

  if (configReport.deprecatedPresent.length > 0) {
    checks.push(
      buildCheck(
        "config-deprecated",
        "Deprecated configuration aliases",
        "warn",
        `Set but superseded: ${configReport.deprecatedPresent.join(", ")}. Rename to EMAIL_RECIPIENT_OVERRIDE (local only).`,
      ),
    );
  }

  if (configReport.devOnlyInProduction.length > 0) {
    checks.push(
      buildCheck(
        "config-dev-only-in-production",
        "Development-only configuration in production",
        "fail",
        `These must not exist in production: ${configReport.devOnlyInProduction.join(", ")}`,
      ),
    );
  }

  // The email override is the specific dangerous case worth naming, because a
  // stale value here used to intercept every customer email silently.
  const emailOverridePresent = configReport.dangerousPresent.some(
    (entry) => entry.name === "EMAIL_RECIPIENT_OVERRIDE",
  );
  if (emailOverridePresent) {
    checks.push(
      buildCheck(
        "config-email-override",
        "Email recipient override",
        isProductionRuntime() ? "fail" : "warn",
        isProductionRuntime()
          ? "EMAIL_RECIPIENT_OVERRIDE is set in production. It is IGNORED, so customer email is delivering correctly — but remove it in Vercel."
          : "EMAIL_RECIPIENT_OVERRIDE is set. Outbound email is redirected away from real recipients (correct for local development).",
      ),
    );
  }

  checks.push(
    isPlatformAdminConfigured()
      ? buildCheck(
          "env-platform-admin",
          "Platform admin allowlist",
          "pass",
          "PLATFORM_ADMIN_EMAILS is configured.",
        )
      : buildCheck(
          "env-platform-admin",
          "Platform admin allowlist",
          "fail",
          "PLATFORM_ADMIN_EMAILS is empty or unset. Nobody can reach the platform surfaces, including the payment reconciliation queue.",
        ),
  );

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
