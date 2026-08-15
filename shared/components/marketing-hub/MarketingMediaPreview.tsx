"use client";

import { useState, useTransition } from "react";
import { Button } from "@/shared/design-system/components";
import { requestMarketingMediaPreviewAction } from "@/app/actions/marketing-media";

/**
 * Watching a render that has actually been transported.
 *
 * ===================== THE LINK IS FETCHED, NOT RENDERED =====================
 * This component receives a job id. It does NOT receive a URL, because the
 * server component that renders it does not have one to give — the signed URL
 * is minted only when the button is pressed, lives fifteen minutes, and is
 * never persisted. That is the whole point: the page can be cached, shared,
 * or read from the database later without carrying a capability with it.
 *
 * It is also why the URL goes into a `<video>` element rather than an anchor.
 * Opening it in a tab would put a live capability in browser history and in
 * the address bar; playing it in place does not.
 */

type MarketingMediaPreviewProps = {
  /** The render job id. The object key is derived from it server-side. */
  sourceJobId: string;
};

export function MarketingMediaPreview({ sourceJobId }: MarketingMediaPreviewProps) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function open() {
    setError(null);
    startTransition(async () => {
      const result = await requestMarketingMediaPreviewAction({ sourceJobId });
      if (result.error || !result.url) {
        setError(result.error ?? "Could not open this video.");
        return;
      }
      setUrl(result.url);
      setExpiresAt(result.expiresAt ?? null);
    });
  }

  if (url) {
    return (
      <div className="mt-2 space-y-1">
        {/* No caption track: the render pipeline produces none, and pointing
            at one that does not exist would be worse than its absence. */}
        <video
          controls
          preload="metadata"
          src={url}
          className="w-full max-w-md rounded-md border border-[var(--north-star-plate-border)]"
        />
        <p className="text-[11px] text-altair-ink-muted">
          {expiresAt
            ? `This link expires at ${new Date(expiresAt).toLocaleTimeString()}. Press Preview again for a new one.`
            : "This link is short-lived. Press Preview again for a new one."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1">
      <Button size="sm" variant="secondary" onClick={open} loading={pending}>
        Preview
      </Button>
      {error ? (
        <p className="text-[11px] text-altair-danger">{error}</p>
      ) : null}
    </div>
  );
}
