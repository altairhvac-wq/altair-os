import { getAiConfig, isAiFeaturesEnabled } from "@/lib/ai/env";
import {
  getMissingFacebookOAuthEnvVars,
  isFacebookOAuthConfigured,
} from "@/lib/integrations/facebook/env";
import { isIntegrationEncryptionConfigured } from "@/lib/integrations/env";
import { isAlphaHardeningEnabled } from "@/lib/beta/alpha-hardening";
import { readEmailRecipientOverrideEnv } from "@/lib/email/recipient";
import { resolveAppBaseUrl } from "@/lib/email/env";
import { getStripeSecretKey, getStripeWebhookSecret } from "@/lib/payments/env";
import { isValidEmail } from "@/shared/lib/email-validation";
import { getCurrentProfile, getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { COMPANY_FILES_BUCKET } from "@/lib/storage/company-files";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getRepoMigrationCatalog,
  REQUIRED_DATABASE_MARKERS,
} from "./migration-catalog";
import type { SystemCheckReport, SystemCheckResult } from "./types";

const MIGRATION_PROBE_NIL_UUID = "00000000-0000-0000-0000-000000000000";

type MigrationMarkerStatus = "present" | "missing" | "unknown";

type MigrationMarkerResult = {
  migration: string;
  label: string;
  status: MigrationMarkerStatus;
  detail?: string;
};

function isDbArtifactMissingError(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("could not find") ||
    (normalized.includes("does not exist") &&
      (normalized.includes("relation") ||
        normalized.includes("table") ||
        normalized.includes("function")))
  );
}

function buildSummary(checks: SystemCheckResult[]): SystemCheckReport["summary"] {
  return checks.reduce(
    (acc, check) => {
      acc[check.status] += 1;
      return acc;
    },
    { pass: 0, fail: 0, warn: 0, info: 0 },
  );
}

function checkRequiredEnvVars(): SystemCheckResult {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ] as const;

  const missing = required.filter((name) => !process.env[name]?.trim());

  if (missing.length === 0) {
    return {
      id: "env-required",
      label: "Required environment variables",
      status: "pass",
      message: "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured.",
    };
  }

  return {
    id: "env-required",
    label: "Required environment variables",
    status: "fail",
    message: `Missing: ${missing.join(", ")}`,
    hint: "Set these in Vercel Project Settings → Environment Variables for Production and Preview.",
  };
}

function checkOptionalEnvVars(): SystemCheckResult {
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  if (hasServiceRole) {
    return {
      id: "env-service-role",
      label: "Service role key (optional)",
      status: "info",
      message: "SUPABASE_SERVICE_ROLE_KEY is set for server-only scripts.",
    };
  }

  return {
    id: "env-service-role",
    label: "Service role key (optional)",
    status: "warn",
    message: "SUPABASE_SERVICE_ROLE_KEY is not set.",
    hint: "Not required for the web app runtime. Only needed for local workflow scripts.",
  };
}

function checkOutboundEmailConfig(): SystemCheckResult {
  const hasApiKey = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasFromEmail = Boolean(process.env.RESEND_FROM_EMAIL?.trim());
  const recipientOverrideEnvs = [
    "EMAIL_RECIPIENT_OVERRIDE",
    "TEST_EMAIL",
    "RESEND_TEST_EMAIL",
    "EMAIL_OVERRIDE_TO",
  ].filter((name) => Boolean(process.env[name]?.trim()));
  const { value: overrideValue, envName: overrideEnvName } =
    readEmailRecipientOverrideEnv();

  if (overrideValue && overrideEnvName && !isValidEmail(overrideValue)) {
    return {
      id: "env-outbound-email",
      label: "Email sending",
      status: "fail",
      message: `${overrideEnvName} is set but is not a valid email address.`,
      hint: "Fix or remove the override env var. Invalid overrides block estimate and invoice sends before Resend is called.",
    };
  }

  const appUrl = resolveAppBaseUrl();

  if (appUrl.ok === false && appUrl.reason === "invalid") {
    return {
      id: "env-outbound-email",
      label: "Email sending",
      status: "fail",
      message: "NEXT_PUBLIC_APP_URL is set but is not a valid URL.",
      hint: "Use a full URL with https:// (for example, https://your-app.vercel.app). Estimate approval links require this.",
    };
  }

  if (recipientOverrideEnvs.length > 0 && process.env.NODE_ENV === "production") {
    return {
      id: "env-outbound-email",
      label: "Email sending",
      status: "warn",
      message: `Billing email recipient override is active (${recipientOverrideEnvs.join(", ")}).`,
      hint: "Remove these Vercel env vars so estimate and invoice emails go to customer addresses.",
    };
  }

  if (hasApiKey && hasFromEmail) {
    return {
      id: "env-outbound-email",
      label: "Email sending",
      status: "pass",
      message: "Email sending configured.",
    };
  }

  const missing: string[] = [];
  if (!hasApiKey) {
    missing.push("RESEND_API_KEY");
  }
  if (!hasFromEmail) {
    missing.push("RESEND_FROM_EMAIL");
  }

  return {
    id: "env-outbound-email",
    label: "Email sending",
    status: "warn",
    message: `Email sending is not fully configured (${missing.join(", ")} missing).`,
    hint: "Estimate and invoice sends will stay in draft until email is set up in Vercel env vars.",
  };
}

function checkPublicAppUrl(): SystemCheckResult {
  const appUrl = resolveAppBaseUrl();
  const explicitAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (appUrl.ok === false && appUrl.reason === "invalid") {
    return {
      id: "env-public-app-url",
      label: "Public app URL",
      status: "fail",
      message: "NEXT_PUBLIC_APP_URL is set but is not a valid URL.",
      hint: "Use a full URL with https:// (for example, https://your-app.vercel.app).",
    };
  }

  if (explicitAppUrl && appUrl.ok) {
    return {
      id: "env-public-app-url",
      label: "Public app URL",
      status: "pass",
      message: "Public app URL configured.",
    };
  }

  if (appUrl.ok) {
    return {
      id: "env-public-app-url",
      label: "Public app URL",
      status: "warn",
      message: "Public app URL is resolved from VERCEL_URL.",
      hint: "Set NEXT_PUBLIC_APP_URL in production so estimate, invoice, and invite links stay stable.",
    };
  }

  return {
    id: "env-public-app-url",
    label: "Public app URL",
    status: "warn",
    message: "NEXT_PUBLIC_APP_URL is not set.",
    hint: "Set NEXT_PUBLIC_APP_URL in Vercel so customer-facing links use your production domain.",
  };
}

function checkStripeCheckoutConfig(): SystemCheckResult {
  const hasSecretKey = Boolean(getStripeSecretKey());
  const hasWebhookSecret = Boolean(getStripeWebhookSecret());

  if (hasSecretKey && hasWebhookSecret) {
    return {
      id: "env-stripe-checkout",
      label: "Stripe checkout",
      status: "pass",
      message: "Stripe checkout env is configured.",
    };
  }

  const missing: string[] = [];
  if (!hasSecretKey) {
    missing.push("STRIPE_SECRET_KEY");
  }
  if (!hasWebhookSecret) {
    missing.push("STRIPE_WEBHOOK_SECRET");
  }

  return {
    id: "env-stripe-checkout",
    label: "Stripe checkout",
    status: "warn",
    message: "Stripe checkout not configured yet.",
    hint: `${missing.join(" and ")} not set. Online payments stay disabled; manual payments are unaffected.`,
  };
}

function checkFacebookOAuth(): SystemCheckResult {
  if (isFacebookOAuthConfigured()) {
    return {
      id: "facebook-oauth",
      label: "Facebook OAuth",
      status: "info",
      message: "Facebook OAuth is configured.",
    };
  }

  const missing = getMissingFacebookOAuthEnvVars();

  return {
    id: "facebook-oauth",
    label: "Facebook OAuth",
    status: "warn",
    message:
      "Facebook OAuth is not configured. Required before connecting Facebook Pages.",
    hint: missing.length > 0 ? `Missing: ${missing.join(", ")}` : undefined,
  };
}

function checkIntegrationEncryption(): SystemCheckResult {
  const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim();

  if (!raw) {
    return {
      id: "integration-encryption",
      label: "Integration token encryption",
      status: "warn",
      message:
        "INTEGRATIONS_ENCRYPTION_KEY is not set. Required before OAuth connect or posting.",
      hint: "Generate with: openssl rand -base64 32",
    };
  }

  if (!isIntegrationEncryptionConfigured()) {
    return {
      id: "integration-encryption",
      label: "Integration token encryption",
      status: "warn",
      message: "INTEGRATIONS_ENCRYPTION_KEY must decode to 32 bytes.",
      hint: "Generate with: openssl rand -base64 32",
    };
  }

  return {
    id: "integration-encryption",
    label: "Integration token encryption",
    status: "pass",
    message: "INTEGRATIONS_ENCRYPTION_KEY is configured.",
  };
}

function checkAiConfig(): SystemCheckResult {
  if (!isAiFeaturesEnabled()) {
    return {
      id: "ai-config",
      label: "AI features (optional)",
      status: "info",
      message: "AI features are disabled (AI_FEATURES_ENABLED is not true).",
    };
  }

  const config = getAiConfig();

  if (!config.hasApiKey) {
    return {
      id: "ai-config",
      label: "AI features (optional)",
      status: "warn",
      message: "AI_FEATURES_ENABLED=true but OPENAI_API_KEY is missing.",
      hint: "Set OPENAI_API_KEY in server env vars. Draft generation will fail until configured.",
    };
  }

  return {
    id: "ai-config",
    label: "AI features (optional)",
    status: "pass",
    message: `AI is enabled (model: ${config.model}).`,
  };
}

function checkAlphaHardening(): SystemCheckResult {
  const enabled = isAlphaHardeningEnabled();
  const explicitFlag = process.env.NEXT_PUBLIC_ALPHA_HARDENING === "true";

  if (enabled) {
    return {
      id: "alpha-hardening",
      label: "Alpha hardening",
      status: "info",
      message: explicitFlag
        ? "Enabled via NEXT_PUBLIC_ALPHA_HARDENING=true."
        : "Enabled because NODE_ENV is production.",
    };
  }

  return {
    id: "alpha-hardening",
    label: "Alpha hardening",
    status: "info",
    message: "Disabled in local development unless NEXT_PUBLIC_ALPHA_HARDENING=true.",
  };
}

async function checkSupabaseConnection(): Promise<SystemCheckResult> {
  if (!hasSupabaseEnv()) {
    return {
      id: "supabase-connection",
      label: "Supabase connection",
      status: "fail",
      message: "Cannot connect without required Supabase env vars.",
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      return {
        id: "supabase-connection",
        label: "Supabase connection",
        status: "fail",
        message: "Authenticated session could not be verified.",
        hint: error.message,
      };
    }

    if (!user) {
      return {
        id: "supabase-connection",
        label: "Supabase connection",
        status: "fail",
        message: "No authenticated user in the current session.",
      };
    }

    return {
      id: "supabase-connection",
      label: "Supabase connection",
      status: "pass",
      message: "Supabase auth session is active.",
    };
  } catch (error) {
    return {
      id: "supabase-connection",
      label: "Supabase connection",
      status: "fail",
      message: "Supabase client failed to initialize.",
      hint: error instanceof Error ? error.message : undefined,
    };
  }
}

async function checkActiveCompanyContext(): Promise<SystemCheckResult> {
  try {
    const context = await getActiveCompanyContext();

    if (!context) {
      return {
        id: "company-context",
        label: "Active company context",
        status: "fail",
        message: "No active company membership was loaded for this user.",
        hint: "Complete /setup or verify default_company_id and membership status.",
      };
    }

    return {
      id: "company-context",
      label: "Active company context",
      status: "pass",
      message: `Loaded company "${context.company.name}" with role ${context.role}.`,
    };
  } catch (error) {
    return {
      id: "company-context",
      label: "Active company context",
      status: "fail",
      message: "Company context query failed.",
      hint: error instanceof Error ? error.message : undefined,
    };
  }
}

async function checkCurrentProfile(): Promise<SystemCheckResult> {
  const [user, profile] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
  ]);

  if (!user) {
    return {
      id: "user-profile",
      label: "Current user profile",
      status: "fail",
      message: "Authenticated user is missing.",
    };
  }

  if (!profile) {
    return {
      id: "user-profile",
      label: "Current user profile",
      status: "fail",
      message: "Profile row was not found for the signed-in user.",
      hint: "Verify profiles RLS and bootstrap_company_for_new_user grants.",
    };
  }

  return {
    id: "user-profile",
    label: "Current user profile",
    status: "pass",
    message: `Profile loaded for ${profile.full_name?.trim() || profile.email || user.email || "current user"}.`,
  };
}

async function checkBootstrapRpc(): Promise<SystemCheckResult> {
  if (!hasSupabaseEnv()) {
    return {
      id: "bootstrap-rpc",
      label: "bootstrap_company_for_new_user RPC",
      status: "fail",
      message: "Cannot verify RPC without Supabase env vars.",
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("bootstrap_company_for_new_user", {
      p_company_name: "",
    });

    if (!error) {
      return {
        id: "bootstrap-rpc",
        label: "bootstrap_company_for_new_user RPC",
        status: "warn",
        message: "RPC responded without the expected validation error.",
        hint: "Confirm the function rejects empty company names in production.",
      };
    }

    const message = error.message.toLowerCase();

    if (
      message.includes("company name is required") ||
      message.includes("not authenticated")
    ) {
      return {
        id: "bootstrap-rpc",
        label: "bootstrap_company_for_new_user RPC",
        status: "pass",
        message: "RPC is callable and validates input (read-only probe).",
      };
    }

    if (
      message.includes("function") &&
      (message.includes("does not exist") || message.includes("could not find"))
    ) {
      return {
        id: "bootstrap-rpc",
        label: "bootstrap_company_for_new_user RPC",
        status: "fail",
        message: "RPC is missing from the connected Supabase project.",
        hint: "Apply migrations through 031_setup_profile_rls_recursion_fix.sql.",
      };
    }

    return {
      id: "bootstrap-rpc",
      label: "bootstrap_company_for_new_user RPC",
      status: "warn",
      message: "RPC returned an unexpected error during the read-only probe.",
      hint: error.message,
    };
  } catch (error) {
    return {
      id: "bootstrap-rpc",
      label: "bootstrap_company_for_new_user RPC",
      status: "fail",
      message: "RPC probe failed.",
      hint: error instanceof Error ? error.message : undefined,
    };
  }
}

async function checkStorageBucketAccess(): Promise<SystemCheckResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return {
      id: "storage-bucket",
      label: "company-files storage bucket",
      status: "fail",
      message: "Cannot verify storage without an active company context.",
    };
  }

  if (!hasSupabaseEnv()) {
    return {
      id: "storage-bucket",
      label: "company-files storage bucket",
      status: "fail",
      message: "Cannot verify storage without Supabase env vars.",
    };
  }

  try {
    const supabase = await createClient();
    const prefix = `company/${context.company.id}`;
    const { error } = await supabase.storage
      .from(COMPANY_FILES_BUCKET)
      .list(prefix, { limit: 1 });

    if (error) {
      const message = error.message.toLowerCase();

      if (message.includes("bucket") && message.includes("not found")) {
        return {
          id: "storage-bucket",
          label: "company-files storage bucket",
          status: "fail",
          message: `Bucket "${COMPANY_FILES_BUCKET}" is missing.`,
          hint: "Apply migration 021_job_attachments_foundation.sql.",
        };
      }

      return {
        id: "storage-bucket",
        label: "company-files storage bucket",
        status: "fail",
        message: "Storage list probe failed for the active company prefix.",
        hint: error.message,
      };
    }

    return {
      id: "storage-bucket",
      label: "company-files storage bucket",
      status: "pass",
      message: `Bucket "${COMPANY_FILES_BUCKET}" is reachable for the active company.`,
    };
  } catch (error) {
    return {
      id: "storage-bucket",
      label: "company-files storage bucket",
      status: "fail",
      message: "Storage probe failed.",
      hint: error instanceof Error ? error.message : undefined,
    };
  }
}

async function probeCompanyPaymentAccountsTable(
  supabase: SupabaseClient,
  companyId: string,
): Promise<MigrationMarkerResult> {
  const marker = REQUIRED_DATABASE_MARKERS[0];

  const { error } = await supabase
    .from("company_payment_accounts")
    .select("id")
    .eq("company_id", companyId)
    .limit(0);

  if (!error) {
    return { ...marker, status: "present" };
  }

  if (isDbArtifactMissingError(error.message)) {
    return { ...marker, status: "missing", detail: error.message };
  }

  return { ...marker, status: "unknown", detail: error.message };
}

async function probeStripeCheckoutPaymentRpc(
  supabase: SupabaseClient,
  companyId: string,
): Promise<MigrationMarkerResult> {
  const marker = REQUIRED_DATABASE_MARKERS[1];

  const { error } = await supabase.rpc("record_invoice_payment_atomic", {
    p_company_id: companyId,
    p_invoice_id: MIGRATION_PROBE_NIL_UUID,
    p_amount: -1,
    p_payment_method: "cash",
    p_payment_date: "2024-01-01",
    p_source: "manual",
  });

  if (!error) {
    return {
      ...marker,
      status: "unknown",
      detail: "RPC probe returned success unexpectedly.",
    };
  }

  const message = error.message.toLowerCase();

  if (isDbArtifactMissingError(error.message)) {
    return { ...marker, status: "missing", detail: error.message };
  }

  if (
    message.includes("payment_amount_invalid") ||
    message.includes("insufficient_permission") ||
    message.includes("invoice_not_found")
  ) {
    return { ...marker, status: "present" };
  }

  return { ...marker, status: "unknown", detail: error.message };
}

async function probeSmsOptOutsTable(
  supabase: SupabaseClient,
  companyId: string,
): Promise<MigrationMarkerResult> {
  const marker = REQUIRED_DATABASE_MARKERS[2];
  const untypedSupabase = supabase as SupabaseClient & {
    from: (table: string) => ReturnType<SupabaseClient["from"]>;
  };

  const { error } = await untypedSupabase
    .from("sms_opt_outs")
    .select("id")
    .eq("company_id", companyId)
    .limit(0);

  if (!error) {
    return { ...marker, status: "present" };
  }

  if (isDbArtifactMissingError(error.message)) {
    return { ...marker, status: "missing", detail: error.message };
  }

  return { ...marker, status: "unknown", detail: error.message };
}

async function probeRequiredDatabaseMarkers(
  supabase: SupabaseClient,
  companyId: string,
): Promise<MigrationMarkerResult[]> {
  return Promise.all([
    probeCompanyPaymentAccountsTable(supabase, companyId),
    probeStripeCheckoutPaymentRpc(supabase, companyId),
    probeSmsOptOutsTable(supabase, companyId),
  ]);
}

async function checkDatabaseFoundation(): Promise<SystemCheckResult> {
  const catalog = getRepoMigrationCatalog();

  if (!catalog.ok) {
    return {
      id: "database-foundation",
      label: "Database foundation",
      status: "warn",
      message: "System check could not read repo migration catalog.",
      hint: catalog.reason,
    };
  }

  if (!hasSupabaseEnv()) {
    return {
      id: "database-foundation",
      label: "Database foundation",
      status: "warn",
      message: "Database foundation check skipped until Supabase env vars are configured.",
      hint: `Repo contains ${catalog.count} migrations (latest: ${catalog.latest}).`,
    };
  }

  const context = await getActiveCompanyContext();

  if (!context) {
    return {
      id: "database-foundation",
      label: "Database foundation",
      status: "warn",
      message: "Database foundation check skipped until company context is available.",
      hint: `Repo contains ${catalog.count} migrations (latest: ${catalog.latest}).`,
    };
  }

  try {
    const supabase = await createClient();
    const markerResults = await probeRequiredDatabaseMarkers(
      supabase,
      context.company.id,
    );
    const missing = markerResults.filter((result) => result.status === "missing");
    const unknown = markerResults.filter((result) => result.status === "unknown");

    if (missing.length > 0) {
      const missingMigrations = missing.map((result) => result.migration).join(", ");

      return {
        id: "database-foundation",
        label: "Database foundation",
        status: "fail",
        message: "Database is missing required migration artifacts.",
        hint: `Apply ${missingMigrations}. Repo has ${catalog.count} migrations; latest is ${catalog.latest}.`,
      };
    }

    if (unknown.length > 0) {
      const unknownLabels = unknown
        .map((result) => `${result.label} (${result.migration})`)
        .join("; ");

      return {
        id: "database-foundation",
        label: "Database foundation",
        status: "warn",
        message: "System check could not verify migration marker.",
        hint: `${unknownLabels}. Repo latest is ${catalog.latest}. Confirm Supabase migrations via CLI or dashboard.`,
      };
    }

    return {
      id: "database-foundation",
      label: "Database foundation",
      status: "pass",
      message: "Database foundation current.",
      hint: `Verified ${markerResults.length} migration markers against repo catalog (${catalog.count} files, latest ${catalog.latest}).`,
    };
  } catch (error) {
    return {
      id: "database-foundation",
      label: "Database foundation",
      status: "warn",
      message: "System check could not verify migration marker.",
      hint: error instanceof Error ? error.message : undefined,
    };
  }
}

export async function runSystemChecks(): Promise<SystemCheckReport> {
  const checks: SystemCheckResult[] = [
    checkRequiredEnvVars(),
    checkOptionalEnvVars(),
    checkPublicAppUrl(),
    checkIntegrationEncryption(),
    checkFacebookOAuth(),
    checkOutboundEmailConfig(),
    checkStripeCheckoutConfig(),
    checkAiConfig(),
    checkAlphaHardening(),
    await checkSupabaseConnection(),
    await checkActiveCompanyContext(),
    await checkCurrentProfile(),
    await checkBootstrapRpc(),
    await checkStorageBucketAccess(),
    await checkDatabaseFoundation(),
  ];

  return {
    checkedAt: new Date().toISOString(),
    summary: buildSummary(checks),
    checks,
  };
}
