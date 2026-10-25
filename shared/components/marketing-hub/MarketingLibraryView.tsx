"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Input, StatusPill, Textarea } from "@/shared/design-system/components";
import type { StatusTone } from "@/shared/design-system/components/status-tone";
import { updateMarketingPostAction } from "@/app/actions/marketing-posts";
import { useCompanyTimezone } from "@/shared/lib/company-timezone";
import { formatDateTimeInTimeZone } from "@/shared/lib/datetime";
import {
  formatMarketingChannel,
  type MarketingChannel,
  type MarketingPost,
  type MarketingPostStatus,
} from "@/shared/types/marketing-post";
import type { SitePublishingDetails } from "@/shared/types/site-publishing-details";
import { WebsitePublishingPanel } from "./WebsitePublishingPanel";

/**
 * Library — everything the marketing line has made, in one list.
 *
 * ==================== WHY ONE LIST ====================
 * Before 2026-10-25 the same posts appeared in a Content tab (with a 1,800-line
 * editor, templates, recurring copies and manual "mark posted"), a Publishing
 * tab, and a separate Website tab for the pages those posts became. The
 * owner operates agents now; what they need here is to find a piece, see
 * where it stands, and fix wording before approving it. Creating posts by hand
 * is gone; agents draft, Today approves.
 *
 * ==================== WHAT CAN BE EDITED ====================
 * Title and copy of a draft or approved-but-unpublished post. A website
 * article is read-only here: the site publisher builds the page from the
 * article's stored brief, so editing the post text would change nothing that
 * gets published.
 */

export type SitePageRow = {
  readonly slug: string;
  readonly title: string;
  readonly state: string;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
};

type Filter = "drafts" | "approved" | "published" | "archived";

const FILTERS: { id: Filter; label: string; statuses: MarketingPostStatus[] }[] = [
  { id: "drafts", label: "Drafts", statuses: ["draft"] },
  { id: "approved", label: "Approved", statuses: ["ready", "scheduled"] },
  { id: "published", label: "Published", statuses: ["posted"] },
  { id: "archived", label: "Archived", statuses: ["archived", "failed"] },
];

const STATUS_TONE: Record<MarketingPostStatus, StatusTone> = {
  draft: "neutral",
  ready: "info",
  scheduled: "info",
  posted: "success",
  failed: "danger",
  archived: "neutral",
};

const STATUS_LABEL: Record<MarketingPostStatus, string> = {
  draft: "Draft",
  ready: "Approved",
  scheduled: "Scheduled",
  posted: "Published",
  failed: "Failed",
  archived: "Archived",
};

/** Channels a hand edit may move a text post between. */
const EDITABLE_CHANNELS: MarketingChannel[] = ["facebook", "instagram", "general"];

const ROW = "rounded-lg border border-[var(--north-star-plate-border)] bg-[var(--north-star-plate)] p-4";

function PostEditor({
  post,
  onSaved,
  onCancel,
}: {
  post: MarketingPost;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(post.title);
  const [text, setText] = useState(post.postText);
  const [hashtags, setHashtags] = useState(post.suggestedHashtags.join(" "));
  const [channel, setChannel] = useState<MarketingChannel>(post.channelTarget);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A video post's channel is fixed by the render it was made for.
  const canChangeChannel = !post.videoMediaAssetId && EDITABLE_CHANNELS.includes(post.channelTarget);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const result = await updateMarketingPostAction(post.id, {
        title: title.trim(),
        postText: text,
        suggestedHashtags: hashtags
          .split(/\s+/)
          .map((tag) => tag.replace(/^#/, "").trim())
          .filter(Boolean),
        ...(canChangeChannel ? { channelTarget: channel } : {}),
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-[var(--north-star-plate-border)] pt-3">
      <label className="block space-y-1 text-xs text-altair-ink-muted">
        Title
        <Input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="block space-y-1 text-xs text-altair-ink-muted">
        Copy
        <Textarea rows={8} value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <label className="block space-y-1 text-xs text-altair-ink-muted">
        Hashtags (space separated)
        <Input value={hashtags} onChange={(event) => setHashtags(event.target.value)} />
      </label>
      {canChangeChannel ? (
        <label className="flex items-center gap-2 text-xs text-altair-ink-muted">
          Channel
          <select
            className="rounded border border-[var(--north-star-plate-border)] bg-[var(--north-star-plate)] px-2 py-1 text-xs text-altair-ink"
            value={channel}
            onChange={(event) => setChannel(event.target.value as MarketingChannel)}
          >
            {EDITABLE_CHANNELS.map((option) => (
              <option key={option} value={option}>
                {formatMarketingChannel(option)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" loading={saving} onClick={() => void save()}>
          Save changes
        </Button>
        <Button size="sm" variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {error ? <p className="text-[11px] text-altair-danger">{error}</p> : null}
    </div>
  );
}

export function MarketingLibraryView({
  posts,
  sitePages,
  sitePublishingDetails = {},
  onChanged,
}: {
  posts: readonly MarketingPost[];
  sitePages: readonly SitePageRow[];
  sitePublishingDetails?: Record<string, SitePublishingDetails>;
  onChanged: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("drafts");
  const [openId, setOpenId] = useState<string | null>(null);
  const timeZone = useCompanyTimezone();

  const counts = useMemo(() => {
    const out: Record<Filter, number> = { drafts: 0, approved: 0, published: 0, archived: 0 };
    for (const entry of FILTERS) {
      out[entry.id] = posts.filter((post) => entry.statuses.includes(post.status)).length;
    }
    out.published += sitePages.filter((page) => page.state === "published").length;
    return out;
  }, [posts, sitePages]);

  const rows = useMemo(() => {
    const statuses = FILTERS.find((entry) => entry.id === filter)?.statuses ?? [];
    return posts
      .filter((post) => statuses.includes(post.status))
      // A published website post is represented by its live page below.
      .filter((post) => !(filter === "published" && post.channelTarget === "website"))
      .sort((a, b) =>
        (b.postedAt ?? b.scheduledAt ?? b.createdAt ?? "").localeCompare(
          a.postedAt ?? a.scheduledAt ?? a.createdAt ?? "",
        ),
      );
  }, [posts, filter]);

  const livePages = filter === "published" ? sitePages.filter((page) => page.state === "published") : [];

  const when = (iso: string | undefined | null) =>
    iso
      ? formatDateTimeInTimeZone(iso, timeZone, { month: "short", day: "numeric", year: "numeric" })
      : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => {
              setFilter(entry.id);
              setOpenId(null);
            }}
            className={
              filter === entry.id
                ? "min-h-9 rounded-full border border-altair-accent px-3 text-sm font-medium text-altair-ink"
                : "min-h-9 rounded-full border border-[var(--north-star-plate-border)] px-3 text-sm text-altair-ink-muted hover:text-altair-ink"
            }
          >
            {entry.label} <span className="text-altair-ink-muted">{counts[entry.id]}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 && livePages.length === 0 ? (
        <p className={`${ROW} text-sm text-altair-ink-muted`}>
          {filter === "drafts"
            ? "No drafts. New ones arrive as the agents make them, and wait in Today for your decision."
            : "Nothing here yet."}
        </p>
      ) : null}

      <ul className="space-y-2">
        {livePages.map((page) => (
          <li key={`page:${page.slug}`} className={ROW}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-altair-ink">{page.title}</p>
                <p className="text-[11px] text-altair-ink-muted">
                  Website · /insights/{page.slug}
                  {page.publishedAt ? ` · ${when(page.publishedAt)}` : ""}
                </p>
              </div>
              <StatusPill tone="success" size="sm">
                Live
              </StatusPill>
            </div>
            <Link
              href={`/insights/${page.slug}`}
              className="mt-1 inline-block text-xs text-altair-brass underline underline-offset-4"
            >
              View the live page
            </Link>
          </li>
        ))}

        {rows.map((post) => {
          const isOpen = openId === post.id;
          const editable = post.channelTarget !== "website" && ["draft", "ready", "scheduled"].includes(post.status);
          return (
            <li key={post.id} className={ROW}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-altair-ink">{post.title}</p>
                  <p className="text-[11px] text-altair-ink-muted">
                    {formatMarketingChannel(post.channelTarget)}
                    {post.videoMediaAssetId ? " · video" : ""}
                    {" · "}
                    {when(post.postedAt ?? post.scheduledAt ?? post.createdAt)}
                  </p>
                </div>
                <StatusPill tone={STATUS_TONE[post.status]} size="sm">
                  {STATUS_LABEL[post.status]}
                </StatusPill>
              </div>
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="quiet"
                  onClick={() => setOpenId((current) => (current === post.id ? null : post.id))}
                >
                  {isOpen ? "Close" : editable ? "Open and edit" : "Open"}
                </Button>
              </div>
              {isOpen ? (
                editable ? (
                  <PostEditor
                    post={post}
                    onCancel={() => setOpenId(null)}
                    onSaved={() => {
                      setOpenId(null);
                      onChanged();
                    }}
                  />
                ) : (
                  <div className="mt-3 space-y-3 border-t border-[var(--north-star-plate-border)] pt-3">
                    <p className="whitespace-pre-line text-sm text-altair-ink">{post.postText}</p>
                    {post.channelTarget === "website" && sitePublishingDetails[post.id] ? (
                      <WebsitePublishingPanel details={sitePublishingDetails[post.id]} />
                    ) : null}
                  </div>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
