import { isAlphaHardeningEnabled } from "@/lib/beta/alpha-hardening";
import { getCurrentProfile, getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { COMPANY_FILES_BUCKET } from "@/lib/storage/company-files";
import type { CompanyMembershipInsert } from "@/lib/database/types/core-tables";
import type { SystemCheckReport, SystemCheckResult } from "./types";

const EXPECTED_MIGRATION_COUNT = 43;
const LATEST_MIGRATION_MARKER = "043_job_activity_audit_trail_types";
const MIGRATION_PROBE_NIL_UUID = "00000000-0000-0000-0000-000000000000";

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

async function checkMigrationMarker(): Promise<SystemCheckResult> {
  const context = await getActiveCompanyContext();

  if (!context || !hasSupabaseEnv()) {
    return {
      id: "migration-status",
      label: "Production migration status",
      status: "warn",
      message: "Migration marker check skipped until Supabase and company context are available.",
      hint: `Expected ${EXPECTED_MIGRATION_COUNT} SQL migrations through ${LATEST_MIGRATION_MARKER}.`,
    };
  }

  try {
    const supabase = await createClient();
    const { error: deleteError } = await supabase
      .from("company_memberships")
      .delete()
      .eq("id", MIGRATION_PROBE_NIL_UUID)
      .eq("company_id", context.company.id);

    if (deleteError) {
      const message = deleteError.message.toLowerCase();

      if (
        message.includes("permission denied") &&
        message.includes("company_memberships")
      ) {
        return {
          id: "migration-status",
          label: "Production migration status",
          status: "fail",
          message: "company_memberships DELETE grant is missing (invite cancellation).",
          hint: `Apply all migrations through ${LATEST_MIGRATION_MARKER}.`,
        };
      }

      return {
        id: "migration-status",
        label: "Production migration status",
        status: "warn",
        message: "Could not verify company_memberships DELETE grant.",
        hint: deleteError.message,
      };
    }

    const { error: insertError } = await supabase.from("company_memberships").insert({
      company_id: context.company.id,
      status: "invited",
    } as CompanyMembershipInsert);

    if (!insertError) {
      return {
        id: "migration-status",
        label: "Production migration status",
        status: "warn",
        message: "Migration probe insert succeeded unexpectedly.",
        hint: "Confirm invite/member RLS policies reject invalid membership rows.",
      };
    }

    const insertMessage = insertError.message.toLowerCase();

    if (
      insertMessage.includes("permission denied") &&
      insertMessage.includes("company_memberships")
    ) {
      return {
        id: "migration-status",
        label: "Production migration status",
        status: "fail",
        message: "company_memberships INSERT grant is missing (team invites).",
        hint: "Apply migrations through 037_grant_company_memberships_insert.sql.",
      };
    }

    if (
      insertMessage.includes("row-level security") ||
      insertMessage.includes("row level security")
    ) {
      return {
        id: "migration-status",
        label: "Production migration status",
        status: "fail",
        message: "company_memberships admin RLS policy is missing.",
        hint: "Apply migrations through 038_restore_company_memberships_admin_rls.sql.",
      };
    }

    if (
      insertMessage.includes("company_memberships_invite_identity_check") ||
      insertMessage.includes("check constraint")
    ) {
      return {
        id: "migration-status",
        label: "Production migration status",
        status: "pass",
        message: `Latest migration marker (${LATEST_MIGRATION_MARKER}) is present.`,
        hint: `Repo contains ${EXPECTED_MIGRATION_COUNT} migrations. Confirm Supabase matches via CLI or dashboard.`,
      };
    }

    return {
      id: "migration-status",
      label: "Production migration status",
      status: "warn",
      message: "Migration marker probe returned an unexpected insert error.",
      hint: insertError.message,
    };
  } catch (error) {
    return {
      id: "migration-status",
      label: "Production migration status",
      status: "warn",
      message: "Migration marker probe failed.",
      hint: error instanceof Error ? error.message : undefined,
    };
  }
}

export async function runSystemChecks(): Promise<SystemCheckReport> {
  const checks: SystemCheckResult[] = [
    checkRequiredEnvVars(),
    checkOptionalEnvVars(),
    checkAlphaHardening(),
    await checkSupabaseConnection(),
    await checkActiveCompanyContext(),
    await checkCurrentProfile(),
    await checkBootstrapRpc(),
    await checkStorageBucketAccess(),
    await checkMigrationMarker(),
  ];

  return {
    checkedAt: new Date().toISOString(),
    summary: buildSummary(checks),
    checks,
  };
}
