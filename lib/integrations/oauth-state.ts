import "server-only";

import { createHash, randomBytes } from "crypto";
import { mapDatabaseError } from "@/lib/database/errors";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  MARKETING_CONNECTED_PROVIDER_OPTIONS,
  type MarketingConnectedProvider,
} from "@/shared/types/marketing-connected-account";

const DEFAULT_TTL_MINUTES = 10;
const MAX_TTL_MINUTES = 30;
const MAX_REDIRECT_PATH_LENGTH = 300;
const MARKETING_REDIRECT_PREFIX = "/marketing";

// redirectPath is only for internal app redirects after OAuth completes.
// Provider OAuth codes/tokens must never be stored there.
// External URLs are rejected to prevent open redirects.
export function normalizeMarketingOAuthRedirectPath(
  input?: string | null,
): string | null {
  if (input == null) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length > MAX_REDIRECT_PATH_LENGTH) {
    return null;
  }

  if (!trimmed.startsWith("/")) {
    return null;
  }

  if (trimmed.startsWith("//")) {
    return null;
  }

  if (trimmed.includes("\\")) {
    return null;
  }

  if (trimmed.startsWith("/\\")) {
    return null;
  }

  if (trimmed.includes("://")) {
    return null;
  }

  // Strict V1: only /marketing, /marketing?..., /marketing/...
  if (
    trimmed !== MARKETING_REDIRECT_PREFIX &&
    !trimmed.startsWith(`${MARKETING_REDIRECT_PREFIX}/`) &&
    !trimmed.startsWith(`${MARKETING_REDIRECT_PREFIX}?`)
  ) {
    return null;
  }

  return trimmed;
}

const ALLOWED_PROVIDERS = new Set<MarketingConnectedProvider>(
  MARKETING_CONNECTED_PROVIDER_OPTIONS.map((option) => option.value),
);

type MarketingOAuthStateRow = {
  id: string;
  company_id: string;
  provider: MarketingConnectedProvider;
  state_hash: string;
  redirect_path: string | null;
  status: "pending" | "consumed" | "expired";
  created_by: string;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

type MarketingOAuthStatesClient = ReturnType<typeof createServiceRoleClient>;

function marketingOAuthStatesTable(client: MarketingOAuthStatesClient) {
  // marketing_oauth_states: migration 091 — wire into Database types on next gen types run
  return (client as MarketingOAuthStatesClient & {
    from(table: "marketing_oauth_states"): ReturnType<
      MarketingOAuthStatesClient["from"]
    >;
  }).from("marketing_oauth_states");
}

function isMarketingConnectedProvider(
  value: string,
): value is MarketingConnectedProvider {
  return ALLOWED_PROVIDERS.has(value as MarketingConnectedProvider);
}

function hashMarketingOAuthState(rawState: string): string {
  return createHash("sha256").update(rawState.trim()).digest("hex");
}

function generateMarketingOAuthStateToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  const hash = hashMarketingOAuthState(raw);
  return { raw, hash };
}

function resolveTtlMinutes(ttlMinutes?: number): number {
  const requested = ttlMinutes ?? DEFAULT_TTL_MINUTES;
  return Math.min(Math.max(requested, 1), MAX_TTL_MINUTES);
}

export type CreateMarketingOAuthStateInput = {
  companyId: string;
  userId: string;
  provider: MarketingConnectedProvider;
  redirectPath?: string | null;
  ttlMinutes?: number;
};

export type CreateMarketingOAuthStateResult = {
  state?: string;
  expiresAt?: string;
  error?: string;
};

export async function createMarketingOAuthState(
  input: CreateMarketingOAuthStateInput,
): Promise<CreateMarketingOAuthStateResult> {
  if (!isMarketingConnectedProvider(input.provider)) {
    return { error: "Unsupported marketing provider." };
  }

  const ttlMinutes = resolveTtlMinutes(input.ttlMinutes);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  const { raw, hash } = generateMarketingOAuthStateToken();

  const trimmedRedirectPath = input.redirectPath?.trim() ?? "";
  const redirectPath = trimmedRedirectPath
    ? normalizeMarketingOAuthRedirectPath(trimmedRedirectPath)
    : null;
  if (trimmedRedirectPath && redirectPath === null) {
    return { error: "Choose a valid internal redirect path." };
  }

  const supabase = createServiceRoleClient();
  const { error } = await marketingOAuthStatesTable(supabase).insert({
    company_id: input.companyId,
    provider: input.provider,
    state_hash: hash,
    redirect_path: redirectPath,
    status: "pending",
    created_by: input.userId,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return {
      error:
        mapDatabaseError(error) ?? "Failed to create OAuth state.",
    };
  }

  return {
    state: raw,
    expiresAt: expiresAt.toISOString(),
  };
}

export type ConsumeMarketingOAuthStateInput = {
  rawState: string;
  provider: MarketingConnectedProvider;
};

export type ConsumeMarketingOAuthStateResult = {
  companyId?: string;
  createdBy?: string;
  redirectPath?: string | null;
  provider?: MarketingConnectedProvider;
  error?: string;
};

export async function consumeMarketingOAuthState(
  input: ConsumeMarketingOAuthStateInput,
): Promise<ConsumeMarketingOAuthStateResult> {
  if (!input.rawState.trim()) {
    return { error: "Invalid or expired OAuth state." };
  }

  if (!isMarketingConnectedProvider(input.provider)) {
    return { error: "Unsupported marketing provider." };
  }

  const stateHash = hashMarketingOAuthState(input.rawState);
  const supabase = createServiceRoleClient();

  const { data: row, error: fetchError } = await marketingOAuthStatesTable(
    supabase,
  )
    .select("id, company_id, created_by, redirect_path, expires_at")
    .eq("state_hash", stateHash)
    .eq("provider", input.provider)
    .eq("status", "pending")
    .maybeSingle();

  if (fetchError) {
    console.error("[consumeMarketingOAuthState] lookup failed:", {
      provider: input.provider,
      code: fetchError.code,
      message: fetchError.message,
    });
    return { error: "Invalid or expired OAuth state." };
  }

  if (!row) {
    return { error: "Invalid or expired OAuth state." };
  }

  const pendingRow = row as Pick<
    MarketingOAuthStateRow,
    "id" | "company_id" | "created_by" | "redirect_path" | "expires_at"
  >;

  if (new Date(pendingRow.expires_at) <= new Date()) {
    await marketingOAuthStatesTable(supabase)
      .update({ status: "expired" })
      .eq("id", pendingRow.id)
      .eq("status", "pending");

    return { error: "OAuth state has expired." };
  }

  const consumedAt = new Date().toISOString();
  const { data: consumed, error: consumeError } =
    await marketingOAuthStatesTable(supabase)
      .update({
        status: "consumed",
        consumed_at: consumedAt,
      })
      .eq("id", pendingRow.id)
      .eq("status", "pending")
      .select("company_id, created_by, redirect_path, provider")
      .maybeSingle();

  if (consumeError) {
    console.error("[consumeMarketingOAuthState] consume failed:", {
      provider: input.provider,
      code: consumeError.code,
      message: consumeError.message,
    });
    return { error: "Invalid or expired OAuth state." };
  }

  if (!consumed) {
    return { error: "Invalid or expired OAuth state." };
  }

  const consumedRow = consumed as Pick<
    MarketingOAuthStateRow,
    "company_id" | "created_by" | "redirect_path" | "provider"
  >;

  return {
    companyId: consumedRow.company_id,
    createdBy: consumedRow.created_by,
    redirectPath: consumedRow.redirect_path,
    provider: consumedRow.provider,
  };
}

export async function expireOldMarketingOAuthStates(): Promise<{
  expiredCount?: number;
  error?: string;
}> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data, error } = await marketingOAuthStatesTable(supabase)
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("expires_at", now)
    .select("id");

  if (error) {
    return {
      error:
        mapDatabaseError(error) ?? "Failed to expire old OAuth states.",
    };
  }

  return { expiredCount: data?.length ?? 0 };
}
