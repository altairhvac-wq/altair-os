/**
 * The production configuration contract.
 *
 * ==================== WHY A DECLARATION, NOT A CHECKLIST ====================
 * Configuration was previously described in three places that could disagree:
 * prose in `.env.example`, ad-hoc `process.env.X?.trim()` reads scattered
 * through feature modules, and a partial list inside the system check. Nothing
 * reconciled them, so a variable could be required by code, undocumented, and
 * unchecked all at once — which is exactly how a deployment degrades silently.
 *
 * This module is the single declaration. Three things read it:
 *
 *   1. the in-app system check, so an operator sees what is missing;
 *   2. `scripts/verify-production-config.mjs`, which fails CI if a declared
 *      variable is absent from `.env.example`;
 *   3. `assertProductionConfiguration()`, for a hard answer at runtime.
 *
 * Deliberately free of `server-only` and of any feature import, so the
 * verifier can read it and so it stays a description rather than a behaviour.
 *
 * ==================== NEVER READS A VALUE ====================
 * Every function here answers presence, never content. A configuration report
 * that echoed a secret would be a worse problem than the one it diagnoses.
 */

export type ConfigClassification =
  | "required"
  | "optional"
  | "dev-only"
  | "dangerous";

export type ConfigVariable = {
  name: string;
  classification: ConfigClassification;
  /** What breaks, or what risk is taken, when this is wrong. */
  consequence: string;
  /** Grouping label for the system check UI. */
  group: string;
};

/**
 * REQUIRED means: production does not work correctly without it, and the
 * failure is not obvious from the outside.
 *
 * Stripe Price IDs are required because subscription Checkout cannot start
 * without them and a new company would be stuck on /activate-subscription with
 * no way forward.
 */
export const PRODUCTION_CONFIG: readonly ConfigVariable[] = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    classification: "required",
    group: "Supabase",
    consequence: "The application cannot reach the database or authenticate anyone.",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    classification: "required",
    group: "Supabase",
    consequence: "The application cannot reach the database or authenticate anyone.",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    classification: "required",
    group: "Supabase",
    consequence:
      "Webhook processing, payment recording and billing reconciliation all fail. Bypasses RLS — server-only.",
  },
  {
    name: "CRON_SECRET",
    classification: "required",
    group: "Automation",
    consequence:
      "Every /api/cron/* route answers 503 and no scheduled work runs — no workflow reminders, no insight collection.",
  },
  {
    name: "STRIPE_SECRET_KEY",
    classification: "required",
    group: "Payments",
    consequence: "No Checkout session can be created — customers cannot pay and companies cannot subscribe.",
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    classification: "required",
    group: "Payments",
    consequence:
      "Connect payment webhooks fail signature verification, so captured customer payments are never recorded against invoices.",
  },
  {
    name: "STRIPE_BILLING_WEBHOOK_SECRET",
    classification: "required",
    group: "Payments",
    consequence:
      "Subscription webhooks fail verification, so trials and cancellations never reach the local mirror and entitlement drifts.",
  },
  {
    name: "STRIPE_PRICE_STARTER_MONTHLY",
    classification: "required",
    group: "Payments",
    consequence: "Starter monthly Checkout cannot start; a new company cannot activate.",
  },
  {
    name: "STRIPE_PRICE_STARTER_ANNUAL",
    classification: "required",
    group: "Payments",
    consequence: "Starter annual Checkout cannot start.",
  },
  {
    name: "STRIPE_PRICE_GROWTH_MONTHLY",
    classification: "required",
    group: "Payments",
    consequence: "Growth monthly Checkout cannot start.",
  },
  {
    name: "STRIPE_PRICE_GROWTH_ANNUAL",
    classification: "required",
    group: "Payments",
    consequence: "Growth annual Checkout cannot start.",
  },
  {
    name: "STRIPE_PRICE_PRO_MONTHLY",
    classification: "required",
    group: "Payments",
    consequence: "Pro monthly Checkout cannot start.",
  },
  {
    name: "STRIPE_PRICE_PRO_ANNUAL",
    classification: "required",
    group: "Payments",
    consequence: "Pro annual Checkout cannot start.",
  },
  {
    name: "RESEND_API_KEY",
    classification: "required",
    group: "Email",
    consequence:
      "No estimate, invoice, payment link or team invite reaches a customer. Records still save, so the failure is invisible in the product.",
  },
  {
    name: "RESEND_FROM_EMAIL",
    classification: "required",
    group: "Email",
    consequence: "Outbound email has no sender address and is refused by the provider.",
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    classification: "required",
    group: "Email",
    consequence:
      "Estimate-approval and invoice-payment links in emails point at the wrong host. Falls back to VERCEL_URL, which is not the customer-facing domain.",
  },
  {
    name: "SENTRY_DSN",
    classification: "required",
    group: "Observability",
    consequence:
      "Every failure — including a Stripe webhook that has started returning 500 — is invisible outside the platform log stream.",
  },
  {
    name: "PLATFORM_ADMIN_EMAILS",
    classification: "required",
    group: "Administration",
    consequence:
      "Nobody can reach the platform admin surfaces, including the payment reconciliation queue. Fails closed: an empty allowlist admits no one.",
  },

  // ----------------------------------------------------------------- optional
  {
    name: "SENTRY_ENVIRONMENT",
    classification: "optional",
    group: "Observability",
    consequence: "Falls back to VERCEL_ENV, then NODE_ENV, for issue grouping.",
  },
  {
    name: "SENTRY_TRACES_SAMPLE_RATE",
    classification: "optional",
    group: "Observability",
    consequence: "Defaults to 0 — errors only, no performance tracing spend.",
  },
  {
    name: "INTEGRATIONS_ENCRYPTION_KEY",
    classification: "optional",
    group: "Integrations",
    consequence:
      "Required before any Facebook/Meta connection. Without it Connect fails. Replacing it is now a supported rotation rather than a data loss — see INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS.",
  },
  {
    name: "INTEGRATIONS_ENCRYPTION_KEY_VERSION",
    classification: "optional",
    group: "Integrations",
    consequence:
      "Names the current key. Defaults to 1. Every ciphertext records the version it was written with, so this is what tells a stored secret which key opens it.",
  },
  {
    name: "INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS",
    classification: "optional",
    group: "Integrations",
    consequence:
      "The outgoing key during a rotation. Set only while one is in progress, and removed only after scripts/rotate-integration-secrets.mjs reports nothing outstanding — removing it early makes every not-yet-migrated secret permanently unreadable.",
  },
  {
    name: "INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS_VERSION",
    classification: "optional",
    group: "Integrations",
    consequence:
      "Names the outgoing key. Defaults to one below the current version; it must differ from it, or a ciphertext would name both.",
  },
  {
    name: "PUBLIC_RATE_LIMIT_HASH_SECRET",
    classification: "optional",
    group: "Security",
    consequence:
      "Upgrades the rate limiter's and audit trail's subject hashes from SHA-256 to HMAC. Without it no raw address, email or token is stored either way, but an attacker holding the database could confirm a GUESSED address by hashing it.",
  },
  {
    name: "FACEBOOK_APP_ID",
    classification: "optional",
    group: "Integrations",
    consequence: "Marketing Hub cannot start a Facebook connection.",
  },
  {
    name: "FACEBOOK_APP_SECRET",
    classification: "optional",
    group: "Integrations",
    consequence: "Marketing Hub cannot complete a Facebook connection.",
  },
  {
    name: "OPENAI_API_KEY",
    classification: "optional",
    group: "AI",
    consequence: "AI drafting stays off. The rate guardrail is process-local, so set a spend cap on the key itself.",
  },
  {
    name: "NEXT_PUBLIC_MAPBOX_TOKEN",
    classification: "optional",
    group: "Maps",
    consequence: "The Dispatch job-location map does not render.",
  },
  {
    name: "ALTAIR_MEDIA_INGEST_SECRET",
    classification: "optional",
    group: "Marketing media",
    consequence: "Machine-to-machine media ingest is refused (401).",
  },
  {
    name: "ALTAIR_MEDIA_INGEST_COMPANY_ID",
    classification: "optional",
    group: "Marketing media",
    consequence: "Media ingest is refused (403). Binds the target company server-side.",
  },
  {
    name: "AGENT_INGEST_SECRET",
    classification: "optional",
    group: "Agent bridge",
    consequence: "The Agent Platform bridge answers 503 and stores nothing.",
  },

  // ---------------------------------------------------------------- dangerous
  {
    name: "EMAIL_RECIPIENT_OVERRIDE",
    classification: "dangerous",
    group: "Email",
    consequence:
      "Intended for local development only. Ignored in production since the launch hardening pass, but its presence in a production environment is a misconfiguration and is reported as one.",
  },
  {
    name: "SMS_PROVIDER",
    classification: "dangerous",
    group: "SMS",
    consequence:
      "Enabling outbound SMS without SMS_INBOUND_STOP_HANDLING=live sends texts that invite a STOP reply nothing processes. Sending fails closed; the configuration is reported as a compliance error.",
  },
] as const;

/** Deprecated aliases that must not be present in a production environment. */
export const DEPRECATED_CONFIG_ALIASES: readonly {
  name: string;
  replacement: string;
  consequence: string;
}[] = [
  {
    name: "TEST_EMAIL",
    replacement: "EMAIL_RECIPIENT_OVERRIDE",
    consequence: "Legacy email override alias. Still read so a misconfigured project is visible.",
  },
  {
    name: "RESEND_TEST_EMAIL",
    replacement: "EMAIL_RECIPIENT_OVERRIDE",
    consequence: "Legacy email override alias.",
  },
  {
    name: "EMAIL_OVERRIDE_TO",
    replacement: "EMAIL_RECIPIENT_OVERRIDE",
    consequence: "Legacy email override alias.",
  },
] as const;

/** Set only in local development; their presence in production is a mistake. */
export const DEV_ONLY_CONFIG: readonly string[] = [
  "DEMO_TOOL_FINGERPRINT",
  "DEMO_CAPTURE_EMAIL",
  "DEMO_CAPTURE_PASSWORD",
  "FOUNDER_CAPTURE_EMAIL",
  "FOUNDER_CAPTURE_PASSWORD",
  "DEV_ALLOWED_ORIGINS",
] as const;

export function getRequiredConfigVariables(): readonly ConfigVariable[] {
  return PRODUCTION_CONFIG.filter((entry) => entry.classification === "required");
}

function isPresent(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

export type ProductionConfigReport = {
  /** Required variables with no value. */
  missingRequired: ConfigVariable[];
  /** Dangerous variables that are set and should be reviewed. */
  dangerousPresent: ConfigVariable[];
  /** Deprecated aliases that are set. */
  deprecatedPresent: string[];
  /** Development-only variables set in a production runtime. */
  devOnlyInProduction: string[];
};

export function isProductionRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV?.trim() === "production"
  );
}

/**
 * Presence-only audit of the current environment.
 * Never returns a value, only a name.
 */
export function buildProductionConfigReport(): ProductionConfigReport {
  const production = isProductionRuntime();

  return {
    missingRequired: getRequiredConfigVariables().filter(
      (entry) => !isPresent(entry.name),
    ),
    dangerousPresent: PRODUCTION_CONFIG.filter(
      (entry) => entry.classification === "dangerous" && isPresent(entry.name),
    ),
    deprecatedPresent: DEPRECATED_CONFIG_ALIASES.filter((entry) =>
      isPresent(entry.name),
    ).map((entry) => entry.name),
    devOnlyInProduction: production
      ? DEV_ONLY_CONFIG.filter((name) => isPresent(name))
      : [],
  };
}

/**
 * Hard answer for a caller that wants to refuse to proceed.
 *
 * Not wired into server startup on purpose: a boot-time throw on a Vercel
 * deployment takes the whole application down for every tenant, including the
 * ones whose data is fine, and turns a missing optional-in-practice variable
 * into a total outage. The system check surfaces the same report, and CI
 * enforces documentation. Use this where refusing is genuinely better than
 * degrading.
 */
export function assertProductionConfiguration(): void {
  const report = buildProductionConfigReport();

  if (report.missingRequired.length > 0) {
    throw new Error(
      `Missing required production configuration: ${report.missingRequired
        .map((entry) => entry.name)
        .join(", ")}`,
    );
  }
}

/**
 * Stripe mode coherence.
 *
 * ============================== THE FOOT-GUN ==============================
 * A live Stripe key in a development or scratch environment is a real charge
 * against a real card away from a test click, and a test key in production is
 * an entire billing system that silently takes no money. Both are one copied
 * .env line away, and neither announces itself: the application behaves
 * normally in both cases.
 *
 * Stripe encodes the mode in the key itself, so this is answerable without
 * calling Stripe and without reading the secret: only the prefix is inspected,
 * and only the classification is returned.
 */
export type StripeModeFinding = {
  ok: boolean;
  mode: "test" | "live" | "unknown" | "absent";
  message: string;
};

export function classifyStripeMode(
  secretKey: string | undefined,
  isProduction: boolean,
): StripeModeFinding {
  const key = secretKey?.trim();

  if (!key) {
    return {
      ok: !isProduction,
      mode: "absent",
      message: isProduction
        ? "STRIPE_SECRET_KEY is not set. No customer can pay and no company can subscribe."
        : "STRIPE_SECRET_KEY is not set. Payment flows are unavailable in this environment.",
    };
  }

  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) {
    return {
      ok: isProduction,
      mode: "live",
      message: isProduction
        ? "Stripe is in live mode, as production requires."
        : "A LIVE Stripe key is configured outside production. A test click here is a real charge against a real card. Replace it with an sk_test_ key.",
    };
  }

  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) {
    return {
      ok: !isProduction,
      mode: "test",
      message: isProduction
        ? "A TEST Stripe key is configured in production. Checkout appears to work and takes no money."
        : "Stripe is in test mode, which is correct outside production."
    };
  }

  return {
    ok: false,
    mode: "unknown",
    message:
      "STRIPE_SECRET_KEY does not look like a Stripe secret key. Neither mode can be confirmed, so neither can be trusted.",
  };
}
