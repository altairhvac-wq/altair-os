import "server-only";

import { upsertMarketingConnectedAccountSecret } from "@/lib/database/queries/marketing-connected-account-secrets";
import {
  clearMarketingConnectedFacebookNoPagesPlaceholder,
  disconnectMissingMarketingConnectedFacebookPages,
  upsertMarketingConnectedFacebookPage,
  upsertMarketingConnectedFacebookUserWithoutPages,
} from "@/lib/database/queries/marketing-connected-accounts-admin";
import { FACEBOOK_CONNECT_SCOPES } from "./oauth-url";
import {
  exchangeFacebookAuthorizationCode,
  exchangeFacebookShortLivedToken,
  fetchFacebookAssignedPages,
  fetchFacebookPageInstagramBusinessAccount,
  fetchFacebookPages,
  fetchFacebookUserProfile,
} from "./graph";

export type CompleteFacebookOAuthConnectInput = {
  companyId: string;
  connectedBy: string;
  authorizationCode: string;
};

export type CompleteFacebookOAuthConnectResult = {
  pageCount?: number;
  error?: string;
  errorCode?:
    | "token_exchange"
    | "pages"
    | "persist"
    | "no_pages"
    | "config";
};

function tokenExpiresAtFromSeconds(
  expiresIn: number | undefined,
): string | null {
  if (expiresIn == null || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    return null;
  }

  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

/**
 * Completes Facebook Connect after a valid OAuth state consume:
 * code → tokens → /me/accounts → encrypted secrets + account rows.
 */
export async function completeFacebookOAuthConnect(
  input: CompleteFacebookOAuthConnectInput,
): Promise<CompleteFacebookOAuthConnectResult> {
  const scopes = [...FACEBOOK_CONNECT_SCOPES];

  let userAccessToken: string;
  let tokenExpiresAt: string | null = null;

  try {
    const shortLived = await exchangeFacebookAuthorizationCode(
      input.authorizationCode,
    );

    try {
      const longLived = await exchangeFacebookShortLivedToken(
        shortLived.accessToken,
      );
      userAccessToken = longLived.accessToken;
      tokenExpiresAt = tokenExpiresAtFromSeconds(longLived.expiresIn);
    } catch (longLivedError) {
      // Short-lived token is still usable for listing Pages in this session.
      console.warn(
        "[completeFacebookOAuthConnect] long-lived exchange failed; using short-lived token:",
        longLivedError,
      );
      userAccessToken = shortLived.accessToken;
      tokenExpiresAt = tokenExpiresAtFromSeconds(shortLived.expiresIn);
    }
  } catch (error) {
    console.error("[completeFacebookOAuthConnect] token exchange failed:", {
      companyId: input.companyId,
      error,
    });
    return {
      error: "Could not complete Facebook authorization. Try connecting again.",
      errorCode: "token_exchange",
    };
  }

  let profile: { id: string; name: string };
  let pages: Awaited<ReturnType<typeof fetchFacebookPages>>;

  try {
    [profile, pages] = await Promise.all([
      fetchFacebookUserProfile(userAccessToken),
      fetchFacebookPages(userAccessToken),
    ]);
  } catch (error) {
    console.error("[completeFacebookOAuthConnect] Graph fetch failed:", {
      companyId: input.companyId,
      error,
    });
    return {
      error: "Could not load Facebook Pages for this account.",
      errorCode: "pages",
    };
  }

  if (pages.length === 0) {
    // Pages owned by a Meta Business Portfolio never appear in /me/accounts,
    // even for users with full control — they surface via /me/assigned_pages
    // (requires the business_management scope). Fall back before giving up.
    try {
      pages = await fetchFacebookAssignedPages(userAccessToken);
    } catch (assignedError) {
      console.warn(
        "[completeFacebookOAuthConnect] assigned_pages fallback failed:",
        {
          companyId: input.companyId,
          error: assignedError,
        },
      );
    }
  }

  if (pages.length === 0) {
    const accountResult = await upsertMarketingConnectedFacebookUserWithoutPages(
      {
        companyId: input.companyId,
        connectedBy: input.connectedBy,
        providerAccountId: profile.id,
        providerAccountName: profile.name,
        scopes,
        tokenExpiresAt,
        lastError:
          "No Facebook Pages were returned for this account. Make sure you manage at least one Page.",
      },
    );

    if (accountResult.error || !accountResult.account) {
      return {
        error: accountResult.error ?? "Failed to save Facebook connection.",
        errorCode: "persist",
      };
    }

    const secretResult = await upsertMarketingConnectedAccountSecret({
      connectedAccountId: accountResult.account.id,
      accessTokenPlaintext: userAccessToken,
    });

    if (secretResult.error) {
      return { error: secretResult.error, errorCode: "persist" };
    }

    await disconnectMissingMarketingConnectedFacebookPages({
      companyId: input.companyId,
      keepProviderResourceIds: [],
    });

    return {
      pageCount: 0,
      error:
        "Facebook connected, but no Pages were found for this account.",
      errorCode: "no_pages",
    };
  }

  await clearMarketingConnectedFacebookNoPagesPlaceholder({
    companyId: input.companyId,
  });

  const keptResourceIds: string[] = [];

  for (const page of pages) {
    const tokenToStore = page.accessToken?.trim() || userAccessToken;

    let instagramBusinessAccountId =
      page.instagramBusinessAccountId?.trim() || null;

    if (!instagramBusinessAccountId && tokenToStore) {
      try {
        instagramBusinessAccountId =
          await fetchFacebookPageInstagramBusinessAccount({
            pageId: page.id,
            accessToken: tokenToStore,
          });
      } catch (igError) {
        console.warn(
          "[completeFacebookOAuthConnect] Instagram Business account lookup failed:",
          {
            companyId: input.companyId,
            pageId: page.id,
            error: igError,
          },
        );
      }
    }

    const accountResult = await upsertMarketingConnectedFacebookPage({
      companyId: input.companyId,
      connectedBy: input.connectedBy,
      providerAccountId: profile.id,
      providerAccountName: profile.name,
      providerResourceId: page.id,
      providerResourceName: page.name,
      scopes,
      // Page tokens from long-lived user tokens typically do not expire;
      // retain user-token expiry as a reconnect hint only.
      tokenExpiresAt,
      metadata: {
        category: page.category ?? null,
        tasks: page.tasks ?? [],
        instagramBusinessAccountId,
      },
    });

    if (accountResult.error || !accountResult.account) {
      return {
        error: accountResult.error ?? "Failed to save Facebook Page.",
        errorCode: "persist",
      };
    }

    keptResourceIds.push(page.id);

    const secretResult = await upsertMarketingConnectedAccountSecret({
      connectedAccountId: accountResult.account.id,
      accessTokenPlaintext: tokenToStore,
    });

    if (secretResult.error) {
      return { error: secretResult.error, errorCode: "persist" };
    }
  }

  const disconnectResult = await disconnectMissingMarketingConnectedFacebookPages(
    {
      companyId: input.companyId,
      keepProviderResourceIds: keptResourceIds,
    },
  );

  if (disconnectResult.error) {
    return { error: disconnectResult.error, errorCode: "persist" };
  }

  return { pageCount: pages.length };
}
