"use client";

import { useMemo, useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import {
  publishMarketingPostToFacebookAction,
  publishMarketingPostToInstagramAction,
} from "@/app/actions/marketing-publish";
import { getFacebookPageInstagramBusinessAccountId } from "@/shared/lib/marketing-facebook-metadata";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { MarketingConnectedAccount } from "@/shared/types/marketing-connected-account";
import type { MarketingPost } from "@/shared/types/marketing-post";

type MarketingFounderPublishControlsProps = {
  post: MarketingPost;
  connectedAccounts: MarketingConnectedAccount[];
  northStar?: boolean;
  disabled?: boolean;
  onPublished: () => void;
};

type PublishSuccessState = {
  platform: "facebook" | "instagram";
  permalinkUrl?: string;
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

export function MarketingFounderPublishControls({
  post,
  connectedAccounts,
  northStar = false,
  disabled = false,
  onPublished,
}: MarketingFounderPublishControlsProps) {
  const facebookPages = useMemo(
    () => listConnectedFacebookPages(connectedAccounts),
    [connectedAccounts],
  );

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<PublishSuccessState | null>(null);
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
  const hasScreenshot = Boolean(post.founderScreenshotReference?.trim());
  const isBusy = disabled || isFacebookPending || isInstagramPending;
  const canPublishFacebook = Boolean(selectedPage) && !isBusy;
  const instagramBlockedReason = !hasScreenshot
    ? "Instagram has no text-only posts. Attach a founder screenshot and save the draft first."
    : !selectedPage
      ? "Connect a Facebook Page first."
      : !igUserId
        ? "This Page has no linked Instagram Business account. Link one in Meta, then reconnect Facebook."
        : null;
  const canPublishInstagram =
    Boolean(selectedPage) &&
    hasScreenshot &&
    Boolean(igUserId) &&
    !isBusy;

  const mutedTextClass = northStar ? "text-[#6B6255]" : "text-slate-500";
  const bodyTextClass = northStar ? "text-[#17130E]" : "text-slate-900";

  function handlePublishFacebook() {
    if (!canPublishFacebook || !selectedPage) {
      return;
    }

    setError(null);
    setSuccess(null);

    startFacebookTransition(async () => {
      const result = await publishMarketingPostToFacebookAction(
        post.id,
        selectedPage.id,
      );

      if (result.error) {
        setError(
          formatActionError(
            result.error,
            "Facebook publish failed. Try again.",
          ),
        );
        return;
      }

      setSuccess({
        platform: "facebook",
        permalinkUrl: result.permalinkUrl,
      });
    });
  }

  function handlePublishInstagram() {
    if (!canPublishInstagram || !selectedPage) {
      return;
    }

    setError(null);
    setSuccess(null);

    startInstagramTransition(async () => {
      const result = await publishMarketingPostToInstagramAction(
        post.id,
        selectedPage.id,
      );

      if (result.error) {
        setError(
          formatActionError(
            result.error,
            "Instagram publish failed. Try again.",
          ),
        );
        return;
      }

      setSuccess({
        platform: "instagram",
        permalinkUrl: result.permalinkUrl,
      });
    });
  }

  return (
    <div
      className={`w-full rounded-xl border px-3.5 py-3 ${
        northStar
          ? "border-[rgba(148,163,184,0.22)] bg-[#FAF6EE]/70"
          : "border-slate-200/90 bg-slate-50/80"
      }`}
    >
      <div className="flex flex-col gap-1">
        <p className={`text-sm font-semibold ${bodyTextClass}`}>Post now</p>
        <p className={`text-xs leading-relaxed ${mutedTextClass}`}>
          Publishes the last saved draft. Save changes first if you edited copy
          or the screenshot. Every publish is a deliberate click — nothing is
          scheduled automatically.
        </p>
      </div>

      {success ? null : facebookPages.length === 0 ? (
        <p className={`mt-3 text-xs leading-relaxed ${mutedTextClass}`}>
          Connect a Facebook Page in Connected accounts, then return here to
          post.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {facebookPages.length > 1 ? (
            <label className="flex flex-col gap-1.5">
              <span
                className={`text-xs font-medium ${
                  northStar ? "text-[#6B4E1A]" : "text-slate-700"
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
                    ? "w-full rounded-lg border border-[rgba(148,163,184,0.24)] bg-white px-3 py-2 text-sm text-[#101827]"
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
              onClick={handlePublishFacebook}
              className="admin-btn-primary"
            >
              {isFacebookPending ? "Posting to Facebook…" : "Post to Facebook"}
            </button>
            <button
              type="button"
              disabled={!canPublishInstagram}
              onClick={handlePublishInstagram}
              className="admin-btn-secondary"
              title={instagramBlockedReason ?? undefined}
            >
              {isInstagramPending
                ? "Posting to Instagram…"
                : "Post to Instagram"}
            </button>
          </div>

          {instagramBlockedReason ? (
            <p className={`text-xs leading-relaxed ${mutedTextClass}`}>
              {instagramBlockedReason}
            </p>
          ) : (
            <p className={`text-xs leading-relaxed ${mutedTextClass}`}>
              Instagram uses the Business account linked to the selected Page.
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
            Posted to{" "}
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
                  View live post
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </>
            ) : null}
          </p>
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
