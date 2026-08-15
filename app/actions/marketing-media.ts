"use server";

import { canAccessAdminNavItem } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  getMediaAssetById,
  getMediaAssetByJob,
} from "@/lib/database/queries/marketing-media-assets";
import { createMediaReadGrant } from "@/lib/media/marketing-media-storage";
import {
  decideMediaRead,
  describeMediaReadDecision,
  isSafeSourceJobId,
  type MarketingMediaAsset,
} from "@/shared/types/marketing-media";

/**
 * Handing out a short-lived link to a stored render.
 *
 * ==================== MINTED AT REQUEST TIME, NEVER STORED ====================
 * There is no column anywhere that holds a playable URL, and this action does
 * not create one. It answers a question — "may this person watch this video
 * right now" — and the answer expires in fifteen minutes. A URL persisted at
 * upload time would answer that question once, permanently, for whoever later
 * read the row; that is the failure this shape exists to avoid, and it is the
 * same rule the snapshot contract has enforced since the first audit.
 *
 * ======================== THREE INDEPENDENT CONDITIONS ========================
 *   1. the caller may see this company's marketing at all  (authorization)
 *   2. the record is `stored`, so bytes actually exist     (state)
 *   3. the key re-derives from this company and job        (integrity)
 *
 * All three are checked before storage is contacted, and the third is checked
 * against a RECOMPUTED key rather than the stored one, so a rewritten
 * `object_key` column cannot redirect a grant at someone else's object.
 *
 * ============================ WHAT IT CANNOT DO ============================
 * It publishes nothing, spends nothing, and writes no row. The only side
 * effect is a signed URL returned to the caller that made the request.
 */

export type MarketingMediaPreviewResult = {
  error?: string;
  /** Short-lived. Returned to the caller and never written down. */
  url?: string;
  expiresAt?: string;
  objectKey?: string;
  contentType?: string;
  byteSize?: number | null;
};

export type MarketingMediaPreviewRequest =
  | { readonly sourceJobId: string; readonly assetId?: undefined }
  | { readonly assetId: string; readonly sourceJobId?: undefined };

export async function requestMarketingMediaPreviewAction(
  request: MarketingMediaPreviewRequest,
): Promise<MarketingMediaPreviewResult> {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  // The same gate as the page that renders the control — a preview is a read
  // of the company's own marketing, not a separate privilege to invent.
  if (!canAccessAdminNavItem(context, "/marketing")) {
    return { error: "You do not have access to this company's marketing." };
  }

  const companyId = context.company.id;

  let asset: MarketingMediaAsset | null = null;
  if (typeof request.assetId === "string") {
    const assetId = request.assetId.trim();
    if (!assetId) return { error: "A media reference is required." };
    asset = await getMediaAssetById(companyId, assetId);
  } else {
    const sourceJobId =
      typeof request.sourceJobId === "string" ? request.sourceJobId.trim() : "";
    // Checked before it reaches key derivation: the job id becomes part of an
    // object key, so an unacceptable one is refused rather than escaped.
    if (!sourceJobId || !isSafeSourceJobId(sourceJobId)) {
      return { error: "A media reference is required." };
    }
    asset = await getMediaAssetByJob(companyId, sourceJobId);
  }

  const decision = decideMediaRead(asset, companyId);
  if (decision !== "GRANT" || !asset) {
    return { error: describeMediaReadDecision(decision) };
  }

  const grant = await createMediaReadGrant({
    companyId,
    objectKey: asset.objectKey,
    contentType: asset.contentType,
    byteSize: asset.byteSize,
    nowMs: Date.now(),
  });

  if (grant.error || !grant.grant) {
    return { error: grant.error ?? "Could not open this video." };
  }

  return {
    url: grant.grant.url,
    expiresAt: grant.grant.expiresAt,
    objectKey: grant.grant.objectKey,
    contentType: grant.grant.contentType,
    byteSize: grant.grant.byteSize,
  };
}
