/**
 * Queries for `network_help_requests` + `network_help_offers` — Help
 * Requests / Opportunities (see shared/types/network-help-request.ts for
 * the feature's design notes). Accepting an offer hands off to the
 * `network_referrals` pipeline via app/actions/network-help-requests.ts.
 */

import { selectInChunks } from "@/lib/database/queries/chunked-in";
import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  NetworkHelpOfferInsert,
  NetworkHelpOfferRow,
  NetworkHelpRequestInsert,
  NetworkHelpRequestRow,
} from "@/lib/database/types/core-tables";
import { normalizeNetworkTradeType } from "@/shared/types/network";
import type {
  NetworkHelpOffer,
  NetworkHelpRequest,
} from "@/shared/types/network-help-request";

type HelpRequestRowWithCompany = NetworkHelpRequestRow & {
  company?: { id: string; name: string } | null;
};

type HelpOfferRowWithRelations = NetworkHelpOfferRow & {
  company?: { id: string; name: string } | null;
  offered_by_profile?: { id: string; full_name: string | null; email: string } | null;
};

function mapHelpRequestRow(row: HelpRequestRowWithCompany): NetworkHelpRequest {
  return {
    id: row.id,
    companyId: row.company_id,
    createdBy: row.created_by,
    tradeType: normalizeNetworkTradeType(row.trade_type),
    title: row.title,
    details: row.details,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    urgency: row.urgency,
    status: row.status,
    expiresAt: row.expires_at,
    filledReferralId: row.filled_referral_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    companyName: row.company?.name,
  };
}

function mapHelpOfferRow(row: HelpOfferRowWithRelations): NetworkHelpOffer {
  return {
    id: row.id,
    helpRequestId: row.help_request_id,
    companyId: row.company_id,
    offeredBy: row.offered_by,
    message: row.message ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    companyName: row.company?.name,
    offeredByName:
      row.offered_by_profile?.full_name?.trim() || row.offered_by_profile?.email,
  };
}

const HELP_REQUEST_SELECT = `
  *,
  company:companies!network_help_requests_company_id_fkey (
    id,
    name
  )
`;

const HELP_OFFER_SELECT = `
  *,
  company:companies!network_help_offers_company_id_fkey (
    id,
    name
  ),
  offered_by_profile:profiles!network_help_offers_offered_by_fkey (
    id,
    full_name,
    email
  )
`;

/** Best-effort lazy expiry — cheap enough to call before every browse read. */
async function expireStaleHelpRequests(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("expire_stale_network_help_requests");
  if (error) {
    console.error("[expireStaleHelpRequests] RPC failed:", error);
  }
}

export async function listOpenNetworkHelpRequests(
  excludeCompanyId: string,
): Promise<NetworkHelpRequest[]> {
  await expireStaleHelpRequests();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_help_requests")
    .select(HELP_REQUEST_SELECT)
    .eq("status", "open")
    .neq("company_id", excludeCompanyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listOpenNetworkHelpRequests] query failed:", error);
    return [];
  }

  const requests = (data ?? []).map((row) =>
    mapHelpRequestRow(row as HelpRequestRowWithCompany),
  );

  if (requests.length === 0) {
    return requests;
  }

  // Chunked — see lib/database/queries/chunked-in.ts. Counted into Maps below,
  // so chunk completion order is irrelevant.
  const { data: offerCounts } = await selectInChunks<{
    id: string;
    help_request_id: string;
    company_id: string;
    status: NetworkHelpOffer["status"];
  }>(
    requests.map((request) => request.id),
    (chunk) =>
      supabase
        .from("network_help_offers")
        .select("id, help_request_id, company_id, status")
        .in("help_request_id", chunk),
  );

  const countsByRequest = new Map<string, number>();
  const myOfferStatusByRequest = new Map<string, NetworkHelpOffer["status"]>();
  const myOfferIdByRequest = new Map<string, string>();

  for (const row of offerCounts ?? []) {
    countsByRequest.set(
      row.help_request_id,
      (countsByRequest.get(row.help_request_id) ?? 0) + 1,
    );
    if (row.company_id === excludeCompanyId) {
      myOfferStatusByRequest.set(row.help_request_id, row.status);
      myOfferIdByRequest.set(row.help_request_id, row.id);
    }
  }

  return requests.map((request) => ({
    ...request,
    offerCount: countsByRequest.get(request.id) ?? 0,
    myOfferStatus: myOfferStatusByRequest.get(request.id),
    myOfferId: myOfferIdByRequest.get(request.id),
  }));
}

export async function listMyNetworkHelpRequests(
  companyId: string,
): Promise<NetworkHelpRequest[]> {
  await expireStaleHelpRequests();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_help_requests")
    .select(HELP_REQUEST_SELECT)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listMyNetworkHelpRequests] query failed:", error);
    return [];
  }

  return (data ?? []).map((row) => mapHelpRequestRow(row as HelpRequestRowWithCompany));
}

export async function getNetworkHelpRequestById(
  helpRequestId: string,
): Promise<NetworkHelpRequest | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_help_requests")
    .select(HELP_REQUEST_SELECT)
    .eq("id", helpRequestId)
    .maybeSingle();

  if (error) {
    console.error("[getNetworkHelpRequestById] query failed:", error);
    return null;
  }

  return data ? mapHelpRequestRow(data as HelpRequestRowWithCompany) : null;
}

export async function insertNetworkHelpRequest(
  row: NetworkHelpRequestInsert,
): Promise<{ request: NetworkHelpRequest | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_help_requests")
    .insert(row)
    .select(HELP_REQUEST_SELECT)
    .single();

  if (error || !data) {
    return { request: null, error: mapDatabaseError(error) };
  }

  return { request: mapHelpRequestRow(data as HelpRequestRowWithCompany), error: null };
}

export async function cancelNetworkHelpRequest(
  helpRequestId: string,
  companyId: string,
): Promise<{ request: NetworkHelpRequest | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_help_requests")
    .update({ status: "cancelled" })
    .eq("id", helpRequestId)
    .eq("company_id", companyId)
    .eq("status", "open")
    .select(HELP_REQUEST_SELECT)
    .maybeSingle();

  if (error) {
    return { request: null, error: mapDatabaseError(error) };
  }

  return {
    request: data ? mapHelpRequestRow(data as HelpRequestRowWithCompany) : null,
    error: data ? null : "This request can no longer be cancelled.",
  };
}

export async function listOffersForHelpRequest(
  helpRequestId: string,
): Promise<NetworkHelpOffer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_help_offers")
    .select(HELP_OFFER_SELECT)
    .eq("help_request_id", helpRequestId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[listOffersForHelpRequest] query failed:", error);
    return [];
  }

  return (data ?? []).map((row) => mapHelpOfferRow(row as HelpOfferRowWithRelations));
}

export async function insertNetworkHelpOffer(
  row: NetworkHelpOfferInsert,
): Promise<{ offer: NetworkHelpOffer | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_help_offers")
    .insert(row)
    .select(HELP_OFFER_SELECT)
    .single();

  if (error || !data) {
    return { offer: null, error: mapDatabaseError(error) };
  }

  return { offer: mapHelpOfferRow(data as HelpOfferRowWithRelations), error: null };
}

export async function withdrawNetworkHelpOffer(
  offerId: string,
  companyId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("network_help_offers")
    .update({ status: "withdrawn" })
    .eq("id", offerId)
    .eq("company_id", companyId)
    .eq("status", "pending");

  return { error: error ? mapDatabaseError(error) : null };
}

export async function getNetworkHelpOfferById(
  offerId: string,
): Promise<NetworkHelpOffer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_help_offers")
    .select(HELP_OFFER_SELECT)
    .eq("id", offerId)
    .maybeSingle();

  if (error) {
    console.error("[getNetworkHelpOfferById] query failed:", error);
    return null;
  }

  return data ? mapHelpOfferRow(data as HelpOfferRowWithRelations) : null;
}

export async function acceptNetworkHelpOfferRpc(input: {
  helpRequestId: string;
  offerId: string;
  actingCompanyId: string;
  referralId: string;
}): Promise<{ request: NetworkHelpRequest | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_network_help_offer", {
    p_help_request_id: input.helpRequestId,
    p_offer_id: input.offerId,
    p_acting_company_id: input.actingCompanyId,
    p_referral_id: input.referralId,
  });

  if (error || !data) {
    return { request: null, error: mapDatabaseError(error) };
  }

  const request = await getNetworkHelpRequestById(input.helpRequestId);
  return { request, error: request ? null : "Help request not found." };
}
