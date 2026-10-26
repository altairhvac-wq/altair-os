"use client";

import { useState } from "react";
import { Button } from "@/shared/design-system/components";
import { takeDownSitePageAction } from "@/app/actions/marketing-takedown";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";

/**
 * Published recently — the owner's end-of-day check.
 *
 * Owner decision 2026-10-25: "I want it to publish on its own and I can look
 * at what has been published and if I don't like it I can take it off at the
 * end of the day." Every live delivery from the last day, newest first, with
 * a link to the real post. A website page can be taken down from here; a
 * YouTube video or Facebook post is removed on that platform, because the
 * app's YouTube connection holds upload permission only.
 */

export type PublishedItem = {
  readonly deliveryId: string;
  readonly provider: string;
  readonly title: string;
  readonly permalink: string | null;
  readonly publishedAt: string;
  /** The live site page, for a website delivery only. */
  readonly sitePageId: string | null;
};

const PROVIDER_LABEL: Record<string, string> = {
  youtube: "YouTube",
  facebook: "Facebook",
  instagram: "Instagram",
  altair_site: "Website",
};

const REMOVE_HINT: Record<string, string> = {
  youtube: "To remove it, open it and delete or hide it in YouTube Studio.",
  facebook: "To remove it, open it and delete it on Facebook.",
  instagram: "To remove it, open it and delete it on Instagram.",
};

export function MarketingPublishedReview({ items }: { items: readonly PublishedItem[] }) {
  const timeZone = useCompanyTimezone();
  const [busy, setBusy] = useState<string | null>(null);
  const [takenDown, setTakenDown] = useState<Set<string>>(new Set());
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  async function takeDown(item: PublishedItem) {
    if (!item.sitePageId) return;
    setError(null);
    setBusy(item.deliveryId);
    try {
      const result = await takeDownSitePageAction(item.sitePageId);
      if (result.error) {
        setError({ id: item.deliveryId, message: result.error });
        return;
      }
      setTakenDown((current) => new Set(current).add(item.deliveryId));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--north-star-plate-border)] bg-[var(--north-star-plate)] p-6">
      <h2 className="text-lg font-semibold text-altair-ink">Published in the last day</h2>
      <p className="mt-1 text-sm text-altair-ink-muted">
        Everything that went live on its own. Open anything you want to check,
        and take down what you do not like.
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-altair-ink-muted">Nothing has been published in the last day.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => {
            const gone = takenDown.has(item.deliveryId);
            return (
              <li
                key={item.deliveryId}
                className="rounded-md border border-[var(--north-star-plate-border)] bg-[var(--surface-tile)] px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-altair-ink">{item.title}</p>
                    <p className="text-[11px] text-altair-ink-muted">
                      {PROVIDER_LABEL[item.provider] ?? item.provider} ·{" "}
                      {formatDateTimeInTimeZone(item.publishedAt, timeZone, {
                        weekday: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {gone ? " · taken down" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.permalink && !gone ? (
                      <a
                        href={item.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-altair-ink underline underline-offset-4"
                      >
                        Open
                      </a>
                    ) : null}
                    {item.sitePageId && !gone ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={busy === item.deliveryId}
                        onClick={() => void takeDown(item)}
                      >
                        Take down
                      </Button>
                    ) : null}
                  </div>
                </div>
                {!item.sitePageId && REMOVE_HINT[item.provider] ? (
                  <p className="mt-1 text-[11px] text-altair-ink-muted">{REMOVE_HINT[item.provider]}</p>
                ) : null}
                {error?.id === item.deliveryId ? (
                  <p className="mt-1 text-[11px] text-altair-danger">{error.message}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
