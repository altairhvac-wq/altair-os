"use client";

import { useMemo, useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import {
  publishMarketingReelToFacebookAction,
  publishMarketingReelToInstagramAction,
} from "@/app/actions/marketing-publish";
import { getFacebookPageInstagramBusinessAccountId } from "@/shared/lib/marketing-facebook-metadata";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { MarketingConnectedAccount } from "@/shared/types/marketing-connected-account";
import type { MarketingPost } from "@/shared/types/marketing-post";
import {
  decideReelMedia,
  describeReelMediaDecision,
  mayAttemptReel,
  reelShapeWasVerified,
  type ReelVideoOption,
} from "@/shared/types/marketing-reel";

/**
 * Publishing a Reel.
 *
 * Separate from `MarketingFounderPublishControls` for the same reason the
 * actions are separate: a Reel has different prerequisites (a stored vertical
 * video rather than a screenshot), a different failure vocabulary, and a
 * publish that takes minutes rather than a second. Folding both into one
 * control would produce a panel whose buttons are disabled for reasons that
 * belong to the other kind of post.
 *
 * NO URL REACHES THIS COMPONENT. It is handed identities and shapes. The
 * signed URL Meta fetches is minted server-side, inside the action, after the
 * caller has been authorized, and is never returned to the browser.
 */

type MarketingReelPublishControlsProps = {
  post: MarketingPost;
  connectedAccounts: MarketingConnectedAccount[];
  /** Stored renders for this company. Identity and shape only. */
  videoOptions: ReelVideoOption[];
  northStar?: boolean;
  disabled?: boolean;
  onPublished: () => void;
};

type ReelSuccessState = {
  platform: "facebook" | "instagram";
  permalinkUrl?: string;
  providerMediaId?: string;
};

function listConnectedFacebookPages(
  accounts: MarketingConnectedAccount[],
): MarketingConnectedAccount[] {
  return accounts
    .filter(
      (account) =>
        account.provider === "facebook" &&
        account.status === "connected" &&
        Boolean(account.providerResourceId),
    )
    .slice()
    .sort((a, b) => {
      const aName = a.providerResourceName ?? a.providerResourceId ?? "";
      const bName = b.providerResourceName ?? b.providerResourceId ?? "";
      return aName.localeCompare(bName);
    });
}

export function MarketingReelPublishControls({
  post,
  connectedAccounts,
  videoOptions,
  northStar = false,
  disabled = false,
  onPublished,
}: MarketingReelPublishControlsProps) {
  const facebookPages = useMemo(
    () => listConnectedFacebookPages(connectedAccounts),
    [connectedAccounts],
  );

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ReelSuccessState | null>(null);
  const [isFacebookPending, startFacebookTransition] = useTransition();
  const [isInstagramPending, startInstagramTransition] = useTransition();

  const resolvedAccountId =
    selectedAccountId &&
    facebookPages.some((page) => page.id === selectedAccountId)
      ? selectedAccountId
      : (facebookPages[0]?.id ?? "");

  const selectedPage =
    facebookPages.find((page) => page.id === resolvedAccountId) ?? null;
  const igUserId = selectedPage
    ? getFacebookPageInstagramBusinessAccountId(selectedPage.metadata)
    : null;

  // The SAME pure decision the server action runs before it claims a delivery.
  // Duplicated here on purpose: this one only decides what a button looks like,
  // and the browser is never the authority on whether a publish may happen.
  const attachedVideo =
    videoOptions.find((option) => option.id === post.videoMediaAssetId) ?? null;
  const mediaDecision = decideReelMedia(
    attachedVideo
      ? {
          companyId: post.companyId,
          contentType: "video/mp4",
          uploadState: "stored",
          widthPx: attachedVideo.widthPx,
          heightPx: attachedVideo.heightPx,
          durationMs: attachedVideo.durationMs,
        }
      : null,
    post.companyId,
  );
  const mediaBlockedReason = mayAttemptReel(mediaDecision)
    ? null
    : describeReelMediaDecision(mediaDecision);

  const isBusy = disabled || isFacebookPending || isInstagramPending;
  const canPublishFacebook =
    Boolean(selectedPage) && !mediaBlockedReason && !isBusy;
  const instagramBlockedReason =
    mediaBlockedReason ??
    (!selectedPage
      ? "Connect a Facebook Page first."
      : !igUserId
        ? "This Page has no linked Instagram Business account. Link one in Meta, then reconnect Facebook."
        : null);
  const canPublishInstagram =
    Boolean(selectedPage) && Boolean(igUserId) && !mediaBlockedReason && !isBusy;

  const mutedTextClass = northStar ? "text-[#6B6255]" : "text-slate-500";
  const bodyTextClass = northStar ? "text-[#17130E]" : "text-slate-900";

  function runPublish(
    platform: "facebook" | "instagram",
    start: (fn: () => Promise<void>) => void,
  ) {
    if (!selectedPage) return;

    setError(null);
    setSuccess(null);

    start(async () => {
      const result =
        platform === "facebook"
          ? await publishMarketingReelToFacebookAction(post.id, selectedPage.id)
          : await publishMarketingReelToInstagramAction(post.id, selectedPage.id);

      if (result.error) {
        setError(
          formatActionError(
            result.error,
            `${platform === "facebook" ? "Facebook" : "Instagram"} Reel publish failed. Try again.`,
          ),
        );
        return;
      }

      setSuccess({
        platform,
        permalinkUrl: result.permalinkUrl,
        providerMediaId: result.providerMediaId,
      });
    });
  }

  return (
    <div
      className={`w-full rounded-xl border px-3.5 py-3 ${
        northStar
          ? "border-[rgba(176,168,143,0.22)] bg-[#FAF6EE]/70"
          : "border-slate-200/90 bg-slate-50/80"
      }`}
    >
      <div className="flex flex-col gap-1">
        <p className={`text-sm font-semibold ${bodyTextClass}`}>
          Publish Reel
        </p>
        <p className={`text-xs leading-relaxed ${mutedTextClass}`}>
          Publishes the attached video as a Reel. Meta fetches it over a
          short-lived link created for this publish only. This takes up to a
          couple of minutes — leave the tab open. Every publish is a deliberate
          click; nothing is scheduled automatically.
        </p>
      </div>

      {success ? null : facebookPages.length === 0 ? (
        <p className={`mt-3 text-xs leading-relaxed ${mutedTextClass}`}>
          Connect a Facebook Page in Connected accounts, then return here.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {facebookPages.length > 1 ? (
            <label className="flex flex-col gap-1.5">
              <span
                className={`text-xs font-medium ${
                  northStar ? "text-[#77591B]" : "text-slate-700"
                }`}
              >
                Facebook Page
              </span>
              <select
                value={resolvedAccountId}
                disabled={isBusy}
                onChange={(event) => {
                  setSelectedAccountId(event.target.value);
                  setError(null);
                  setSuccess(null);
                }}
                className={
                  northStar
                    ? "w-full rounded-lg border border-[rgba(176,168,143,0.24)] bg-white px-3 py-2 text-sm text-[#151914]"
                    : "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                }
              >
                {facebookPages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.providerResourceName ||
                      page.providerResourceId ||
                      "Facebook Page"}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className={`text-xs ${mutedTextClass}`}>
              Page:{" "}
              <span className={bodyTextClass}>
                {facebookPages[0]?.providerResourceName ||
                  facebookPages[0]?.providerResourceId}
              </span>
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canPublishFacebook}
              onClick={() => runPublish("facebook", startFacebookTransition)}
              className="admin-btn-primary"
              title={mediaBlockedReason ?? undefined}
            >
              {isFacebookPending
                ? "Publishing Reel to Facebook…"
                : "Publish Reel to Facebook"}
            </button>
            <button
              type="button"
              disabled={!canPublishInstagram}
              onClick={() => runPublish("instagram", startInstagramTransition)}
              className="admin-btn-secondary"
              title={instagramBlockedReason ?? undefined}
            >
              {isInstagramPending
                ? "Publishing Reel to Instagram…"
                : "Publish Reel to Instagram"}
            </button>
          </div>

          {instagramBlockedReason ? (
            <p className={`text-xs leading-relaxed ${mutedTextClass}`}>
              {instagramBlockedReason}
            </p>
          ) : reelShapeWasVerified(mediaDecision) ? (
            <p className={`text-xs leading-relaxed ${mutedTextClass}`}>
              Attached video checks out as a Reel (9:16, within Meta&rsquo;s
              length limits).
            </p>
          ) : (
            <p className={`text-xs leading-relaxed ${mutedTextClass}`}>
              The editor did not report this render&rsquo;s size or length, so it
              could not be checked here. Meta will accept or reject it.
            </p>
          )}
        </div>
      )}

      {error ? (
        <p
          className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {success ? (
        <div
          className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
          role="status"
        >
          <p>
            Reel published to{" "}
            {success.platform === "facebook" ? "Facebook" : "Instagram"}.
            {success.permalinkUrl ? (
              <>
                {" "}
                <a
                  href={success.permalinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
                >
                  View live Reel
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </>
            ) : null}
          </p>
          {success.providerMediaId ? (
            <p className="mt-1 font-mono break-all">
              Meta object: {success.providerMediaId}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onPublished}
            className="mt-2 font-medium underline underline-offset-2"
          >
            Done — back to list
          </button>
        </div>
      ) : null}
    </div>
  );
}
