import "server-only";

import { recordRefreshedTokenExpiry } from "@/lib/database/queries/marketing-connected-accounts-admin";
import {
  refreshIfNeeded,
  type CredentialAccountFacts,
  type CredentialResult,
} from "./credentials";

/**
 * The one call a publish path makes to get a usable access token.
 *
 * ============ WHY THIS EXISTS AT ALL ============
 * `refreshIfNeeded` deliberately writes only the secrets table it owns, and
 * documents on its own return type that the caller must persist
 * `tokenExpiresAt` to `marketing_connected_accounts` when `refreshed` is
 * true. That is a correct boundary and a bad contract: the single caller it
 * had did not do it, `token_expires_at` kept the value issued at consent,
 * and `deriveMarketingChannelState` — which derives expiry from time rather
 * than from a status someone remembered to write — reported TOKEN_EXPIRED
 * for connections that had just been refreshed successfully.
 *
 * The boundary is kept. What changes is that remembering is no longer a
 * caller's job: this module is the seam publish paths use, and it does both
 * halves. `refreshIfNeeded` stays exported for the paths that genuinely only
 * want a token — a capability re-probe has no publish to protect — but
 * anything that is about to contact a provider on a customer's behalf goes
 * through here.
 *
 * ============ THE WRITE CANNOT FAIL THE PUBLISH ============
 * By the time the expiry is written, the refreshed credential is already
 * encrypted and stored, and the token in hand is valid. Refusing to publish
 * because a health column did not land would trade a working publish for
 * bookkeeping. So the write's failure is logged and swallowed, and the cost
 * is one stale column until the next refresh — which the next call fixes.
 */
export async function getUsableAccessToken(input: {
  readonly account: CredentialAccountFacts;
  readonly nowIso: string;
}): Promise<CredentialResult> {
  const result = await refreshIfNeeded(input);

  if (!result.ok || !result.refreshed) {
    // Nothing was refreshed, so nothing about the stored expiry changed.
    return result;
  }

  const written = await recordRefreshedTokenExpiry({
    connectedAccountId: input.account.connectedAccountId,
    tokenExpiresAt: result.tokenExpiresAt,
    nowIso: input.nowIso,
  });

  if (written.error) {
    // No token, no expiry, no provider prose — the account id and the fact.
    console.error("[getUsableAccessToken] refreshed expiry not persisted:", {
      connectedAccountId: input.account.connectedAccountId,
      provider: input.account.provider,
    });
  }

  return result;
}
