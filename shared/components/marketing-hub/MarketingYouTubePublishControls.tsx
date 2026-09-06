"use client";

import { useMemo, useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { publishMarketingPostToYouTubeAction } from "@/app/actions/marketing-publish-youtube";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { MarketingConnectedAccount } from "@/shared/types/marketing-connected-account";
import type { MarketingPost } from "@/shared/types/marketing-post";

/**
 * Publishing a post to YouTube — always as a PRIVATE upload.
 *
 * Separate from `MarketingReelPublishControls` for the same reason that one
 * is separate from the founder controls: different destination, different
 * prerequisites, different truth to tell the operator. The load-bearing
 * sentence in this panel is the visibility one: the upload lands PRIVATE on
 * the channel, verified by readback, and making it public is a deliberate
 * act on YouTube Studio after review — no control here can do it.
 *
 * NO URL REACHES THIS COMPONENT. Identities only; the signed URL YouTube
 * fetches is minted server-side inside the action after authorization.
 */

type MarketingYouTubePublishControlsProps = {
  post: MarketingPost;
  connectedAccounts: MarketingConnectedAccount[];
  disabled?: boolean;
  onPublished: () => void;
};

type YouTubeSuccessState = {
  videoId: string;
  permalink?: string;
  privacyStatus?: string;
  channelId?: string;
};

function listConnectedYouTubeChannels(
  accounts: MarketingConnectedAccount[],
): MarketingConnectedAccount[] {
  return accounts
    .filter(
      (account) =>
        account.provider === "youtube" &&
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

export function MarketingYouTubePublishControls({
  post,
  connectedAccounts,
  disabled = false,
  onPublished,
}: MarketingYouTubePublishControlsProps) {
  const channels = useMemo(
    () => listConnectedYouTubeChannels(connectedAccounts),
    [connectedAccounts],
  );

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<YouTubeSuccessState | null>(null);
  const [isPending, startTransition] = useTransition();

  const resolvedAccountId =
    selectedAccountId && channels.some((channel) => channel.id === selectedAccountId)
      ? selectedAccountId
      : (channels[0]?.id ?? "");
  const selectedChannel =
    channels.find((channel) => channel.id === resolvedAccountId) ?? null;

  const missingVideoReason = post.videoMediaAssetId
    ? null
    : "Attach a stored video to this post first.";

  const isBusy = disabled || isPending;
  const canPublish = Boolean(selectedChannel) && !missingVideoReason && !isBusy;

  function runPublish() {
    if (!selectedChannel) return;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await publishMarketingPostToYouTubeAction(
        post.id,
        selectedChannel.id,
      );

      if (result.error || !result.videoId) {
        setError(
          formatActionError(
            result.error,
            "YouTube upload failed. Try again.",
          ),
        );
        return;
      }

      setSuccess({
        videoId: result.videoId,
        permalink: result.permalink,
        privacyStatus: result.privacyStatus,
        channelId: result.channelId,
      });
    });
  }

  return (
    <div className="w-full rounded-xl border border-slate-200/90 bg-slate-50/80 px-3.5 py-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-slate-900">
          Upload to YouTube — private
        </p>
        <p className="text-xs leading-relaxed text-slate-500">
          Uploads the attached video to the connected channel as a PRIVATE
          video and verifies that by reading it back. It will not appear
          publicly: review it in YouTube Studio and publish it there when it
          is ready. The upload can take a couple of minutes — leave the tab
          open.
        </p>
      </div>

      {success ? null : channels.length === 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Connect a YouTube channel in Settings → Integrations, then return
          here.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {channels.length > 1 ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-slate-700">
                YouTube channel
              </span>
              <select
                value={resolvedAccountId}
                disabled={isBusy}
                onChange={(event) => {
                  setSelectedAccountId(event.target.value);
                  setError(null);
                  setSuccess(null);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.providerResourceName ||
                      channel.providerResourceId ||
                      "YouTube channel"}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-xs text-slate-500">
              Channel:{" "}
              <span className="text-slate-900">
                {channels[0]?.providerResourceName ||
                  channels[0]?.providerResourceId}
              </span>
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canPublish}
              onClick={runPublish}
              className="admin-btn-primary"
              title={missingVideoReason ?? undefined}
            >
              {isPending
                ? "Uploading private video…"
                : "Upload private to YouTube"}
            </button>
          </div>

          {missingVideoReason ? (
            <p className="text-xs leading-relaxed text-slate-500">
              {missingVideoReason}
            </p>
          ) : null}
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
            Uploaded to YouTube as{" "}
            <span className="font-semibold">
              {success.privacyStatus ?? "private"}
            </span>
            {success.channelId ? (
              <>
                {" "}
                on channel <span className="font-mono">{success.channelId}</span>
              </>
            ) : null}
            .
            {success.permalink ? (
              <>
                {" "}
                <a
                  href={success.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
                >
                  Open private video
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </>
            ) : null}
          </p>
          <p className="mt-1 font-mono break-all">Video id: {success.videoId}</p>
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
