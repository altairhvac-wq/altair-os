import "server-only";

import { upsertMarketingConnectedAccountSecret } from "@/lib/database/queries/marketing-connected-account-secrets";
import { upsertMarketingConnectedResource } from "@/lib/database/queries/marketing-connected-accounts-admin";
import { currentSecretKeyVersion } from "@/lib/integrations/credentials";
import type { MarketingPublishCapability } from "@/shared/types/marketing-channel-connection";
import { deriveYouTubeCapability as deriveYouTubeCapabilityPure } from "./capability";
import { YOUTUBE_CONNECT_SCOPES } from "./oauth-url";
import {
  YouTubeApiError,
  exchangeYouTubeAuthorizationCode,
  fetchYouTubeChannels,
  type YouTubeChannel,
} from "./api";

/**
 * Completes YouTube Connect after a valid OAuth state consume:
 * code → tokens → channels.list → encrypted secret + account rows.
 *
 * ============ NOTHING IS ASSUMED ABOUT WHAT WE GOT ============
 * Two things are read back from Google rather than inferred from what we
 * asked for, and both determine what the connection is allowed to claim:
 *
 *   1. THE GRANTED SCOPES. Google's consent screen lets a user withhold
 *      individual scopes. `scopes` records what we requested;
 *      `granted_scopes` records what came back, and the capability is
 *      derived from the second. A connection that was denied upload is
 *      recorded as unable to publish, with the missing scope named — not as
 *      connected-and-ready with a failure waiting at the first upload.
 *
 *   2. THE CHANNELS. There may be none (a Google account with no YouTube
 *      channel), one, or several (Brand Accounts). Each becomes its own row,
 *      because a channel is the thing content is delivered to and 143's
 *      duplicate guard is keyed per provider resource.
 *
 * ============ THE UPLOAD SCOPE IS NOT PERMISSION TO PUBLISH ============
 * A capability of `direct` here means Google granted the API permission. It
 * does NOT mean anything will be posted: `MARKETING_PUBLISH_MODE` still has
 * to be armed, the gate still requires a recorded human approval, and no
 * YouTube adapter is registered yet, so there is currently no code path from
 * this connection to an upload at all.
 */

export type CompleteYouTubeConnectInput = {
  companyId: string;
  connectedBy: string;
  authorizationCode: string;
};

export type YouTubeConnectErrorCode =
  | "config"
  | "token_exchange"
  | "channels"
  | "no_channels"
  | "persist";

export type CompleteYouTubeConnectResult = {
  channelCount?: number;
  error?: string;
  errorCode?: YouTubeConnectErrorCode;
};

function expiresAtFromSeconds(seconds: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  return new Date(Date.now() + seconds * 1000).toISOString();
}

/**
 * Re-exported so the connect flow has one import surface. The decision lives
 * in a pure module (`./capability`) because it is reachable only by
 * persuading a person to untick a box on Google's consent screen, and a
 * decision testable only that way is one that will not be tested.
 *
 * The annotation is the load-bearing part: `MarketingPublishCapability` is
 * the real union mirroring migration 143's enum, so if the pure module's
 * locally-spelled capability string ever diverges from it, this line stops
 * compiling.
 */
export const deriveYouTubeCapability: (
  grantedScopes: readonly string[],
) => { capability: MarketingPublishCapability; detail: string | null } =
  deriveYouTubeCapabilityPure;

/** Turns a caught error into a stable code without forwarding its prose. */
function classify(error: unknown, fallback: YouTubeConnectErrorCode): {
  errorCode: YouTubeConnectErrorCode;
  code: string;
} {
  if (error instanceof YouTubeApiError) {
    return { errorCode: fallback, code: error.code };
  }
  return { errorCode: fallback, code: "unexpected_error" };
}

export async function completeYouTubeConnect(
  input: CompleteYouTubeConnectInput,
): Promise<CompleteYouTubeConnectResult> {
  const requestedScopes = [...YOUTUBE_CONNECT_SCOPES];

  let tokens;
  try {
    tokens = await exchangeYouTubeAuthorizationCode(input.authorizationCode);
  } catch (error) {
    const classified = classify(error, "token_exchange");
    // Status and Google's short code only. The response body is never logged:
    // the token endpoint quotes back what it rejected on some failures.
    console.error("[completeYouTubeConnect] token exchange failed:", {
      companyId: input.companyId,
      code: classified.code,
    });
    return { errorCode: classified.errorCode, error: "Token exchange failed." };
  }

  let channels: readonly YouTubeChannel[];
  try {
    channels = await fetchYouTubeChannels(tokens.accessToken);
  } catch (error) {
    const classified = classify(error, "channels");
    console.error("[completeYouTubeConnect] channel read failed:", {
      companyId: input.companyId,
      code: classified.code,
    });
    return { errorCode: classified.errorCode, error: "Channel lookup failed." };
  }

  if (channels.length === 0) {
    // No placeholder row. A Google account with no channel is not a
    // connection to anything, and recording one would put a card on the
    // Integrations page claiming a relationship that does not exist.
    return {
      errorCode: "no_channels",
      error: "That Google account has no YouTube channel.",
    };
  }

  const { capability, detail } = deriveYouTubeCapability(tokens.grantedScopes);
  const tokenExpiresAt = expiresAtFromSeconds(tokens.expiresInSeconds);
  const keyVersion = currentSecretKeyVersion();

  let saved = 0;
  for (const channel of channels) {
    const account = await upsertMarketingConnectedResource({
      companyId: input.companyId,
      connectedBy: input.connectedBy,
      provider: "youtube",
      integrationKind: "publisher",
      providerAccountId: channel.channelId,
      providerAccountName: channel.title,
      providerResourceId: channel.channelId,
      providerResourceName: channel.customUrl ?? channel.title,
      scopes: requestedScopes,
      grantedScopes: [...tokens.grantedScopes],
      publishCapability: capability,
      capabilityDetail: detail,
      tokenExpiresAt,
      metadata: {
        // Recorded so a later reader can tell a refreshable connection from
        // one that will simply die — Google issues a refresh token only on
        // the first consent unless prompt=consent forces a new one.
        hasRefreshToken: tokens.refreshToken != null,
      },
    });

    if (account.error || !account.account) {
      console.error("[completeYouTubeConnect] account persist failed:", {
        companyId: input.companyId,
        channelId: channel.channelId,
      });
      return { errorCode: "persist", error: "Saving the connection failed." };
    }

    const secret = await upsertMarketingConnectedAccountSecret({
      connectedAccountId: account.account.id,
      accessTokenPlaintext: tokens.accessToken,
      ...(tokens.refreshToken
        ? { refreshTokenPlaintext: tokens.refreshToken }
        : {}),
      // The version the ciphertext actually carries, not the helper's
      // default of 1. Left to default, a rotation would leave the column
      // saying v1 while the payload says v2 — and the column is what the
      // rotation script reads to decide which rows are still outstanding,
      // so the rows most needing attention would be the ones that look done.
      ...(keyVersion == null ? {} : { encryptionKeyVersion: keyVersion }),
    });

    if (secret.error) {
      // The account row exists but holds no credential. Reported as a
      // failure rather than a partial success: a row that looks connected
      // and cannot authenticate is worse than no row, because nothing on
      // the page would say which one it is.
      console.error("[completeYouTubeConnect] secret persist failed:", {
        companyId: input.companyId,
        connectedAccountId: account.account.id,
      });
      return { errorCode: "persist", error: "Saving the credential failed." };
    }

    saved += 1;
  }

  return { channelCount: saved };
}
