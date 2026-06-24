import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { DbClient } from "@/lib/database/db-client";
import { mapDatabaseError } from "@/lib/database/errors";
import { getEstimateById } from "@/lib/database/queries/estimates";
import { applyEstimateApprovalRouting } from "@/lib/database/services/estimate-approval-routing";
import type { EstimateApprovalTokenInsert } from "@/lib/database/types/core-tables";
import {
  generateEstimateApprovalToken,
  getEstimateApprovalTokenExpiresAt,
} from "@/shared/lib/estimate-approval-token";
import type { PublicEstimateApprovalView } from "@/shared/types/public-estimate-approval";
import type { EstimateLineItem, EstimateStatus } from "@/shared/types/estimate";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";

type RpcLineItem = {
  id: string;
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  taxable: boolean;
};

function mapRpcLineItem(row: RpcLineItem): EstimateLineItem {
  const name = String(row.name ?? "").trim();
  const description = row.description?.trim();

  return {
    id: row.id,
    name,
    description:
      description && description !== name ? description : undefined,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    taxable: Boolean(row.taxable),
  };
}

function mapCompanyFromRpc(
  value: Record<string, unknown> | undefined,
): BillingCompanyContact | undefined {
  if (!value || typeof value.name !== "string") {
    return undefined;
  }

  return {
    name: value.name,
    phone: typeof value.phone === "string" ? value.phone : null,
    email: typeof value.email === "string" ? value.email : null,
    addressLine1:
      typeof value.address_line1 === "string" ? value.address_line1 : null,
    addressLine2:
      typeof value.address_line2 === "string" ? value.address_line2 : null,
    city: typeof value.city === "string" ? value.city : null,
    state: typeof value.state === "string" ? value.state : null,
    postalCode:
      typeof value.postal_code === "string" ? value.postal_code : null,
  };
}

function mapPublicEstimateApprovalView(
  payload: Record<string, unknown>,
): PublicEstimateApprovalView {
  const state = payload.state as PublicEstimateApprovalView["state"];
  const message =
    typeof payload.message === "string" ? payload.message : undefined;
  const estimateStatus =
    typeof payload.estimate_status === "string"
      ? (payload.estimate_status as PublicEstimateApprovalView["estimateStatus"])
      : undefined;

  const company = mapCompanyFromRpc(
    payload.company as Record<string, unknown> | undefined,
  );

  const estimateRaw = payload.estimate as Record<string, unknown> | undefined;
  let estimate: PublicEstimateApprovalView["estimate"];

  if (estimateRaw && typeof estimateRaw.estimate_number === "string") {
    const lineItemsRaw = Array.isArray(estimateRaw.line_items)
      ? (estimateRaw.line_items as RpcLineItem[])
      : [];

    const createdAt =
      typeof estimateRaw.created_at === "string"
        ? estimateRaw.created_at.split("T")[0] ?? estimateRaw.created_at
        : "";

    estimate = {
      id: String(estimateRaw.id ?? ""),
      estimateNumber: estimateRaw.estimate_number,
      customerName: String(estimateRaw.customer_name ?? "Customer"),
      status: estimateRaw.status as EstimateStatus,
      subtotal: Number(estimateRaw.subtotal ?? 0),
      taxRate: Number(estimateRaw.tax_rate ?? 0),
      tax: Number(estimateRaw.tax ?? 0),
      total: Number(estimateRaw.total ?? 0),
      validUntil:
        typeof estimateRaw.valid_until === "string"
          ? estimateRaw.valid_until.split("T")[0]
          : undefined,
      notes:
        typeof estimateRaw.notes === "string"
          ? estimateRaw.notes
          : undefined,
      createdAt,
      lineItems: lineItemsRaw.map(mapRpcLineItem),
    };
  }

  const signatureRaw = payload.signature as Record<string, unknown> | null;
  const signature =
    signatureRaw &&
    typeof signatureRaw.signer_name === "string" &&
    typeof signatureRaw.signed_at === "string"
      ? {
          signerName: signatureRaw.signer_name,
          signedAt: signatureRaw.signed_at,
        }
      : null;

  return {
    state,
    message,
    estimateStatus,
    company,
    estimate,
    signature,
  };
}

export async function revokeActiveEstimateApprovalTokens(
  companyId: string,
  estimateId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("estimate_approval_tokens")
    .update({ revoked_at: now })
    .eq("company_id", companyId)
    .eq("estimate_id", estimateId)
    .is("used_at", null)
    .is("revoked_at", null);

  if (error) {
    return { error: mapDatabaseError(error) ?? "Failed to rotate approval link." };
  }

  return {};
}

export async function createEstimateApprovalTokenForEmail(input: {
  companyId: string;
  estimateId: string;
  customerEmail: string;
  createdBy: string;
}): Promise<{ rawToken?: string; error?: string }> {
  const revokeResult = await revokeActiveEstimateApprovalTokens(
    input.companyId,
    input.estimateId,
  );

  if (revokeResult.error) {
    return { error: revokeResult.error };
  }

  const { raw, hash } = generateEstimateApprovalToken();
  const payload: EstimateApprovalTokenInsert = {
    company_id: input.companyId,
    estimate_id: input.estimateId,
    token_hash: hash,
    customer_email: input.customerEmail.trim(),
    expires_at: getEstimateApprovalTokenExpiresAt(),
    created_by: input.createdBy,
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("estimate_approval_tokens")
    .insert(payload);

  if (error) {
    return {
      error:
        mapDatabaseError(error) ??
        "Failed to create estimate approval link.",
    };
  }

  return { rawToken: raw };
}

export async function getPublicEstimateApprovalView(
  rawToken: string,
): Promise<PublicEstimateApprovalView> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_public_estimate_approval_view",
    { p_raw_token: rawToken },
  );

  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    console.error("[getPublicEstimateApprovalView]", error);
    return { state: "invalid" };
  }

  return mapPublicEstimateApprovalView(data as Record<string, unknown>);
}

function resolvePublicApprovalRoutingClient(): DbClient | undefined {
  try {
    return createServiceRoleClient();
  } catch (error) {
    console.error(
      "[submitPublicEstimateApproval] privileged routing client unavailable:",
      error,
    );
    return undefined;
  }
}

export type SubmitPublicEstimateApprovalResult = {
  ok?: boolean;
  error?: string;
  estimateId?: string;
  estimateNumber?: string;
  customerName?: string;
  signedAt?: string;
  companyId?: string;
  customerId?: string;
  jobId?: string | null;
};

export async function submitPublicEstimateApproval(input: {
  rawToken: string;
  signerName: string;
  signatureData: string;
  authorized: boolean;
}): Promise<SubmitPublicEstimateApprovalResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("submit_public_estimate_approval", {
    p_raw_token: input.rawToken,
    p_signer_name: input.signerName,
    p_signature_data: input.signatureData,
    p_authorized: input.authorized,
  });

  if (error) {
    return {
      error:
        error.message?.trim() ||
        "We couldn't approve this estimate. Try again or contact the company.",
    };
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { error: "Unexpected response while approving estimate." };
  }

  const payload = data as Record<string, unknown>;

  if (payload.ok !== true) {
    return { error: "Unexpected response while approving estimate." };
  }

  const estimateId =
    typeof payload.estimate_id === "string" ? payload.estimate_id : undefined;
  const estimateNumber =
    typeof payload.estimate_number === "string"
      ? payload.estimate_number
      : undefined;
  const customerName =
    typeof payload.customer_name === "string" ? payload.customer_name : undefined;
  const signedAt =
    typeof payload.signed_at === "string" ? payload.signed_at : undefined;

  const companyId =
    typeof payload.company_id === "string" ? payload.company_id : undefined;
  const customerId =
    typeof payload.customer_id === "string" ? payload.customer_id : undefined;
  const jobId =
    typeof payload.job_id === "string"
      ? payload.job_id
      : payload.job_id === null
        ? null
        : undefined;

  let resolvedJobId = jobId ?? null;

  if (estimateId && companyId) {
    const routingDb = resolvePublicApprovalRoutingClient();

    await applyEstimateApprovalRouting({
      companyId,
      estimateId,
      approvalSource: "public_link",
      actorId: null,
      estimateNumber,
      customerId,
      jobId: jobId ?? null,
      signerName: input.signerName,
      db: routingDb,
    });

    const refreshedEstimate = await getEstimateById(
      companyId,
      estimateId,
      routingDb,
    );
    resolvedJobId = refreshedEstimate?.jobId ?? resolvedJobId;
  }

  return {
    ok: true,
    estimateId,
    estimateNumber,
    customerName,
    signedAt,
    companyId,
    customerId,
    jobId: resolvedJobId,
  };
}
