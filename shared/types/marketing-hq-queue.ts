/**
 * Which HQ items may carry an Approve button.
 *
 * ==================== WHY THIS IS A MODULE AND NOT AN `if` ====================
 * The HQ queue filtered on `status === 'draft'` and nothing else, so every
 * artifact the AI team produced arrived wearing the same green Approve button:
 * social posts, SEO pages, blog articles, video briefs — and the weekly
 * strategy report, which then rendered simultaneously as an approvable card in
 * the queue and as a report in the Strategy tab.
 *
 * Approving a strategy report set a status column and did nothing else. That is
 * the precise shape of an inert control: it looks like a decision, it records
 * something, and no behaviour anywhere depends on it. Worse, it teaches the
 * reader that Approve in this product might not mean anything — which is the
 * belief that makes a REAL approval elsewhere feel safe to click without
 * reading.
 *
 * ==================== WHAT "GENUINELY PUBLISHABLE" MEANS ====================
 * Not a judgement made here. Both routes an approved item can take out of this
 * queue impose the same two conditions, in `app/actions/marketing-ai-hq.ts`:
 *
 *   convertMarketingItemToPostAction   kind !== 'social_post'  -> refused
 *                                      resolved text is blank  -> refused
 *   publishMarketingItemToFacebookAction
 *                                      kind !== 'social_post'  -> refused
 *
 * So this module mirrors those server guards and nothing more. An item the
 * server would refuse must never be offered an Approve button, and an item the
 * server would accept must never be hidden from one.
 *
 * ==================== THE ALLOW-LIST FAILS CLOSED ====================
 * `MarketingItemKind` has nine members and gains more as roles are added.
 * A deny-list would silently hand an Approve button to every future kind on the
 * day it is introduced. The allow-list makes the default "informational", so
 * adding a kind to the actionable queue is a deliberate edit here, next to the
 * server guards it has to match.
 */

import type { MarketingItem, MarketingItemKind } from "./marketing-ai-hq";
import { formatMarketingItemKind } from "./marketing-ai-hq";

/**
 * The only kinds whose approval leads anywhere.
 *
 * Exactly the set both server actions accept. Adding a member here without
 * also relaxing those guards would put back the button this module removed.
 */
export const APPROVABLE_MARKETING_ITEM_KINDS = [
  "social_post",
] as const satisfies readonly MarketingItemKind[];

function isApprovableKind(kind: MarketingItemKind): boolean {
  return (APPROVABLE_MARKETING_ITEM_KINDS as readonly string[]).includes(kind);
}

/**
 * The text an approved item would actually publish.
 *
 * Mirrors `convertMarketingItemToPostAction` exactly: the packaged
 * `content.postText` when it has one, otherwise the raw `bodyText`. Kept in
 * one place so the button and the server cannot disagree about whether an item
 * has anything to say.
 */
export function marketingItemPublishableText(item: MarketingItem): string {
  const packaged = item.content?.["postText"];
  if (typeof packaged === "string" && packaged.trim() !== "") {
    return packaged.trim();
  }
  return typeof item.bodyText === "string" ? item.bodyText.trim() : "";
}

/**
 * True when Approve would lead somewhere.
 *
 * Status is deliberately NOT part of this: partitioning by status is the
 * caller's job and mixing the two here would make "is this approvable" depend
 * on when you asked.
 */
export function isApprovableMarketingItem(item: MarketingItem): boolean {
  return (
    isApprovableKind(item.kind) && marketingItemPublishableText(item) !== ""
  );
}

/**
 * Why an item is informational, in the reader's terms.
 *
 * Never "unsupported" or "not eligible". A person looking at a card they
 * cannot act on is owed the actual reason, and the reason differs: a strategy
 * report is read elsewhere, an SEO page has nowhere to go yet, and an empty
 * social post is a generation that failed quietly.
 */
export function marketingItemInformationalReason(item: MarketingItem): string {
  if (item.kind === "strategy_report") {
    return "Read in the Strategy tab. A report is evidence, not something to approve.";
  }
  if (isApprovableKind(item.kind)) {
    // The only way an approvable kind lands here: nothing to publish.
    return "This post has no text, so there is nothing to send to the Hub or publish.";
  }
  if (item.kind === "video_brief") {
    return "Exported to the video editor rather than published from here.";
  }
  return `${formatMarketingItemKind(item.kind)} items have no publishing route yet, so approving one would record a decision that nothing acts on.`;
}

export type MarketingQueuePartition = {
  /** Drafts whose Approve leads somewhere. The only cards with buttons. */
  actionable: MarketingItem[];
  /** Drafts that are real output but need no decision. Read-only. */
  informational: MarketingItem[];
  /** Anything already decided, newest work first as the store returned it. */
  reviewed: MarketingItem[];
};

/**
 * Splits the queue three ways, preserving the caller's order within each part.
 *
 * NOTHING IS DROPPED. Every item the store returned lands in exactly one of
 * the three lists, which is the property that makes it safe to replace a
 * single `filter` with this: no artifact can disappear from the page as a side
 * effect of losing its button.
 */
export function partitionMarketingQueue(
  items: readonly MarketingItem[],
): MarketingQueuePartition {
  const actionable: MarketingItem[] = [];
  const informational: MarketingItem[] = [];
  const reviewed: MarketingItem[] = [];

  for (const item of items) {
    if (item.status !== "draft") {
      reviewed.push(item);
    } else if (isApprovableMarketingItem(item)) {
      actionable.push(item);
    } else {
      informational.push(item);
    }
  }

  return { actionable, informational, reviewed };
}
