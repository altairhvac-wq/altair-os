/**
 * Queries for `network_invites` — trusted network invitation growth flow.
 */

import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  NetworkInviteInsert,
  NetworkInviteRow,
} from "@/lib/database/types/core-tables";
import {
  generateNetworkInviteToken,
  getNetworkInviteTokenExpiresAt,
} from "@/shared/lib/network-invite-token";
import type {
  NetworkInvite,
  PublicNetworkInvitePreview,
} from "@/shared/types/network-invite";
import type { TradeType } from "@/shared/types/network";

const TRADE_TYPES = new Set<string>([
  "HVAC",
  "Plumbing",
  "Electrical",
  "Roofing",
  "General Contracting",
  "Landscaping",
  "Painting",
]);

function normalizeTradeType(value: string): TradeType {
  return TRADE_TYPES.has(value)
    ? (value as TradeType)
    : "General Contracting";
}

function mapNetworkInviteRow(
  row: NetworkInviteRow,
  sourceCompanyName?: string,
): NetworkInvite {
  return {
    id: row.id,
    sourceCompanyId: row.source_company_id,
    sourceUserId: row.source_user_id,
    invitedCompanyName: row.invited_company_name,
    invitedContactName: row.invited_contact_name,
    invitedEmail: row.invited_email,
    invitedPhone: row.invited_phone,
    tradeCategory: normalizeTradeType(row.trade_category),
    personalMessage: row.personal_message ?? undefined,
    status: row.status,
    acceptedCompanyId: row.accepted_company_id ?? undefined,
    acceptedUserId: row.accepted_user_id ?? undefined,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at ?? undefined,
    expiresAt: row.expires_at,
    sourceCompanyName,
  };
}

type InviteRowWithCompany = NetworkInviteRow & {
  source_company: { name: string } | null;
};

function mapInviteRowsWithCompany(rows: InviteRowWithCompany[]): NetworkInvite[] {
  return rows.map((row) =>
    mapNetworkInviteRow(row, row.source_company?.name ?? undefined),
  );
}

export async function listNetworkInvitesForSourceCompany(
  companyId: string,
): Promise<NetworkInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_invites")
    .select("*, source_company:companies!network_invites_source_company_id_fkey(name)")
    .eq("source_company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listNetworkInvitesForSourceCompany] query failed:", error);
    return [];
  }

  return mapInviteRowsWithCompany((data ?? []) as InviteRowWithCompany[]);
}

export async function getAcceptedNetworkInviteForCompany(
  companyId: string,
): Promise<NetworkInvite | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_invites")
    .select("*, source_company:companies!network_invites_source_company_id_fkey(name)")
    .eq("accepted_company_id", companyId)
    .eq("status", "accepted")
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getAcceptedNetworkInviteForCompany] query failed:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  const row = data as InviteRowWithCompany;
  return mapNetworkInviteRow(row, row.source_company?.name ?? undefined);
}

export async function createNetworkInvite(input: {
  sourceCompanyId: string;
  sourceUserId: string;
  invitedCompanyName: string;
  invitedContactName: string;
  invitedEmail: string;
  invitedPhone: string;
  tradeCategory: TradeType;
  personalMessage?: string;
}): Promise<{
  invite: NetworkInvite | null;
  rawToken: string | null;
  error: string | null;
}> {
  const { raw, hash } = generateNetworkInviteToken();
  const supabase = await createClient();

  const row: NetworkInviteInsert = {
    source_company_id: input.sourceCompanyId,
    source_user_id: input.sourceUserId,
    invited_company_name: input.invitedCompanyName,
    invited_contact_name: input.invitedContactName,
    invited_email: input.invitedEmail,
    invited_phone: input.invitedPhone,
    trade_category: input.tradeCategory,
    personal_message: input.personalMessage ?? null,
    invite_token_hash: hash,
    expires_at: getNetworkInviteTokenExpiresAt(),
  };

  const { data, error } = await supabase
    .from("network_invites")
    .insert(row)
    .select("*, source_company:companies!network_invites_source_company_id_fkey(name)")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return {
        invite: null,
        rawToken: null,
        error: "A pending invitation already exists for this email address.",
      };
    }

    return {
      invite: null,
      rawToken: null,
      error: mapDatabaseError(error),
    };
  }

  const inviteRow = data as InviteRowWithCompany;
  return {
    invite: mapNetworkInviteRow(
      inviteRow,
      inviteRow.source_company?.name ?? undefined,
    ),
    rawToken: raw,
    error: null,
  };
}

export async function getPublicNetworkInvitePreview(
  rawToken: string,
): Promise<PublicNetworkInvitePreview> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_network_invite_preview", {
    p_raw_token: rawToken,
  });

  if (error || !data || typeof data !== "object") {
    console.error("[getPublicNetworkInvitePreview] RPC failed:", error);
    return { state: "invalid" };
  }

  const payload = data as Record<string, unknown>;
  const state = payload.state;

  if (
    state !== "valid" &&
    state !== "accepted" &&
    state !== "expired" &&
    state !== "cancelled" &&
    state !== "invalid"
  ) {
    return { state: "invalid" };
  }

  return {
    state,
    sourceCompanyName:
      typeof payload.source_company_name === "string"
        ? payload.source_company_name
        : undefined,
    invitedCompanyName:
      typeof payload.invited_company_name === "string"
        ? payload.invited_company_name
        : undefined,
    invitedContactName:
      typeof payload.invited_contact_name === "string"
        ? payload.invited_contact_name
        : undefined,
    invitedEmail:
      typeof payload.invited_email === "string"
        ? payload.invited_email
        : undefined,
    tradeCategory:
      typeof payload.trade_category === "string"
        ? normalizeTradeType(payload.trade_category)
        : undefined,
    personalMessage:
      typeof payload.personal_message === "string"
        ? payload.personal_message
        : undefined,
  };
}

export async function acceptNetworkInvite(input: {
  rawToken: string;
  acceptedCompanyId: string;
  acceptedUserId: string;
  signupEmail: string;
}): Promise<{
  ok: boolean;
  sourceCompanyName?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_network_invite", {
    p_raw_token: input.rawToken,
    p_accepted_company_id: input.acceptedCompanyId,
    p_accepted_user_id: input.acceptedUserId,
    p_signup_email: input.signupEmail,
  });

  if (error) {
    console.error("[acceptNetworkInvite] RPC failed:", error);
    return { ok: false, error: mapDatabaseError(error) };
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: "Unable to accept this invitation." };
  }

  const payload = data as Record<string, unknown>;

  if (payload.ok !== true) {
    const errorCode =
      typeof payload.error === "string" ? payload.error : "unknown";

    const messageByCode: Record<string, string> = {
      invalid_token: "This invitation link is invalid.",
      invite_not_pending: "This invitation is no longer available.",
      invite_expired: "This invitation has expired.",
      email_mismatch:
        "Sign up with the same email address that received the invitation.",
      self_invite: "You cannot accept an invitation from your own company.",
    };

    return {
      ok: false,
      error: messageByCode[errorCode] ?? "Unable to accept this invitation.",
    };
  }

  return {
    ok: true,
    sourceCompanyName:
      typeof payload.source_company_name === "string"
        ? payload.source_company_name
        : undefined,
  };
}

export async function rotateNetworkInviteToken(input: {
  inviteId: string;
  sourceCompanyId: string;
}): Promise<{ rawToken: string | null; error: string | null }> {
  const { raw, hash } = generateNetworkInviteToken();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("rotate_network_invite_token", {
    p_invite_id: input.inviteId,
    p_source_company_id: input.sourceCompanyId,
    p_new_token_hash: hash,
  });

  if (error || data !== true) {
    return {
      rawToken: null,
      error: error
        ? mapDatabaseError(error)
        : "Unable to refresh this invitation link.",
    };
  }

  return { rawToken: raw, error: null };
}
