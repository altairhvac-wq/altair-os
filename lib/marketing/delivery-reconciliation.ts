import "server-only";

import { getMarketingConnectedAccountAccessToken } from "@/lib/database/queries/marketing-connected-account-secrets";
import {
  downgradePostedDelivery,
  listPostedDeliveries,
} from "@/lib/database/queries/marketing-channel-deliveries";
import { probeReelPublicVisibility } from "@/lib/integrations/facebook/reels";
import { getFacebookOAuthConfig } from "@/lib/integrations/facebook/env";
import { graphBaseUrl } from "@/lib/integrations/facebook/graph";

/**
 * Delivery reconciliation — does the provider still serve what we recorded?
 *
 * ==================== WHY (2026-09-06 incident) ====================
 * A delivery row that says `posted` is a fact about the PAST: the provider
 * accepted the publish once. Two live failures proved the past is not the
 * present — the Sep-2 automated Reel no longer exists at Meta while its row
 * still claimed `posted` with a permalink, and three API-published Reels
 * were being served as Development-Mode test content: perfect provider
 * metadata, invisible to every non-admin.
 *
 * This pass re-reads each posted Facebook delivery through two lenses:
 *
 *   PAGE token (privileged)  — does the object still EXIST?
 *   APP token oEmbed         — can a NON-privileged reader see it?
 *
 * and downgrades `posted` → `posted_unverified` (one-way, evidence merged,
 * nothing deleted) when the object is gone or definitively not public. An
 * UNKNOWN probe (e.g. the app lacks the approved oEmbed feature) records
 * itself and downgrades nothing — absence of an answer is never treated as
 * either verdict.
 *
 * Instagram rows are listed but only annotated as unprobed: the IG oEmbed
 * endpoint is a different, separately-permissioned surface, and pretending
 * the Facebook probe covers it would be exactly the cross-layer vouching
 * this incident forbids.
 *
 * Read-mostly and founder-invoked. It never publishes, never deletes, and
 * never touches marketing_posts rows.
 */
export interface DeliveryReconciliationFinding {
  readonly deliveryId: string;
  readonly provider: string;
  readonly providerPostId: string | null;
  readonly providerObjectExists: boolean | null;
  readonly publicVisibility: "PUBLIC" | "NOT_PUBLIC" | "UNKNOWN" | "NOT_PROBED";
  readonly action: "none" | "recorded" | "downgraded";
  readonly detail: string;
}

async function facebookObjectExists(
  objectId: string,
  pageToken: string,
): Promise<boolean | null> {
  const config = getFacebookOAuthConfig();
  const url = new URL(
    `${graphBaseUrl(config.graphApiVersion)}/${encodeURIComponent(objectId)}`,
  );
  url.searchParams.set("fields", "id");
  url.searchParams.set("access_token", pageToken);
  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (response.ok) return true;
    const body = (await response.json().catch(() => null)) as {
      error?: { code?: number; error_subcode?: number };
    } | null;
    // GraphMethodException #100 subcode 33 is Meta's "does not exist /
    // cannot be loaded" — with the OWNING Page's token, that means gone.
    if (body?.error?.code === 100 && body.error.error_subcode === 33) {
      return false;
    }
    return null; // Any other refusal: unknown, not evidence of deletion.
  } catch {
    return null;
  }
}

export async function reconcileMarketingDeliveries(input: {
  companyId: string;
  nowIso: string;
}): Promise<DeliveryReconciliationFinding[]> {
  const findings: DeliveryReconciliationFinding[] = [];
  const posted = await listPostedDeliveries(input.companyId);

  // Page tokens by connected account, loaded once each.
  const tokens = new Map<string, string | null>();
  async function tokenFor(accountId: string): Promise<string | null> {
    if (!tokens.has(accountId)) {
      const loaded = await getMarketingConnectedAccountAccessToken(accountId);
      tokens.set(accountId, loaded.accessToken ?? null);
    }
    return tokens.get(accountId) ?? null;
  }

  for (const delivery of posted) {
    if (!delivery.providerPostId) continue;

    if (delivery.provider !== "facebook") {
      findings.push({
        deliveryId: delivery.id,
        provider: delivery.provider,
        providerPostId: delivery.providerPostId,
        providerObjectExists: null,
        publicVisibility: "NOT_PROBED",
        action: "none",
        detail: `${delivery.provider} reconciliation is not probed by this pass — no verdict recorded.`,
      });
      continue;
    }

    const pageToken = await tokenFor(delivery.connectedAccountId);
    const exists = pageToken
      ? await facebookObjectExists(delivery.providerPostId, pageToken)
      : null;

    if (exists === false) {
      const downgraded = await downgradePostedDelivery({
        companyId: input.companyId,
        deliveryId: delivery.id,
        reason: "provider object no longer exists",
        evidence: {
          providerObjectExists: false,
          reconciledAt: input.nowIso,
        },
        nowIso: input.nowIso,
      });
      findings.push({
        deliveryId: delivery.id,
        provider: delivery.provider,
        providerPostId: delivery.providerPostId,
        providerObjectExists: false,
        publicVisibility: "NOT_PROBED",
        action: downgraded.error ? "none" : "downgraded",
        detail:
          downgraded.error ??
          "The provider no longer serves this object; the row was downgraded to posted_unverified.",
      });
      continue;
    }

    const visibility = await probeReelPublicVisibility(
      delivery.providerPostId,
    ).catch(() => "UNKNOWN" as const);

    if (visibility === "NOT_PUBLIC") {
      const downgraded = await downgradePostedDelivery({
        companyId: input.companyId,
        deliveryId: delivery.id,
        reason: "not publicly accessible (non-privileged probe)",
        evidence: {
          providerObjectExists: exists,
          publicPermalinkAccessible: false,
          publicVisibilityProbe: visibility,
          reconciledAt: input.nowIso,
        },
        nowIso: input.nowIso,
      });
      findings.push({
        deliveryId: delivery.id,
        provider: delivery.provider,
        providerPostId: delivery.providerPostId,
        providerObjectExists: exists,
        publicVisibility: visibility,
        action: downgraded.error ? "none" : "downgraded",
        detail:
          downgraded.error ??
          "A non-privileged probe cannot see this object; the row was downgraded to posted_unverified.",
      });
      continue;
    }

    findings.push({
      deliveryId: delivery.id,
      provider: delivery.provider,
      providerPostId: delivery.providerPostId,
      providerObjectExists: exists,
      publicVisibility: visibility,
      action: "recorded",
      detail:
        visibility === "PUBLIC"
          ? "Object exists and a non-privileged reader can see it."
          : "Object exists; public visibility could not be determined (probe UNKNOWN) — no downgrade on absence of evidence.",
    });
  }

  return findings;
}
