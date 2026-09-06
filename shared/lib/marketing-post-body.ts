import type { MarketingPost } from "@/shared/types/marketing-post";
import type { IntegrationProvider } from "@/shared/types/integration-provider";
import { capabilityFor } from "@/shared/types/integration-capability";

/** Compose the caption/body used for copy and Meta publish. */
export function buildMarketingPostBodyText(input: {
  postText?: string | null;
  callToAction?: string | null;
  suggestedHashtags?: string[] | null;
}): string {
  const parts: string[] = [];

  const postText = input.postText?.trim() ?? "";
  if (postText) {
    parts.push(postText);
  }

  const callToAction = input.callToAction?.trim() ?? "";
  if (callToAction) {
    parts.push(callToAction);
  }

  const hashtags = (input.suggestedHashtags ?? [])
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean)
    .map((tag) => `#${tag}`);

  if (hashtags.length > 0) {
    parts.push(hashtags.join(" "));
  }

  return parts.join("\n\n");
}

export function buildMarketingPostBodyFromPost(post: MarketingPost): string {
  return buildMarketingPostBodyText({
    postText: post.postText,
    callToAction: post.callToAction,
    suggestedHashtags: post.suggestedHashtags,
  });
}

/**
 * ==================== THE ASSEMBLED PAYLOAD IS WHAT THE LIMIT APPLIES TO ====================
 * Provider limits were only ever checked against an intermediate field, and
 * only by `assessPackage` on the ContentPackage path — which the marketing-post
 * publish actions do not use. What actually reached YouTube was
 * `buildYouTubeUploadInitRequest`'s `description.trim().slice(0, 5000)`: a
 * SILENT truncation, four layers below the founder's approval click.
 *
 * That is the same defect the September 6 work fixed for the TITLE and left
 * live for the BODY. The body is worse, because the body is assembled — a
 * caption that fits on its own can still overflow once the CTA and the
 * hashtags are appended, so checking `postText` alone can never catch it. The
 * only string worth measuring is the one the provider is actually handed.
 *
 * ==================== WHY REFUSE RATHER THAN SHORTEN ====================
 * Every part of this string was approved by a human, and this layer has no
 * idea which sentence matters. Dropping the hashtags, or cutting mid-word,
 * substitutes a machine's judgement for the founder's on copy they signed off.
 * Refusing hands the decision back to the person who can actually make it, and
 * says exactly how much has to go.
 *
 * The `.slice()` downstream is deliberately left in place as an unreachable
 * backstop — belt and braces, not the enforcement point.
 */
export interface MarketingPostBodyFit {
  /** The exact string the provider would receive. */
  readonly body: string;
  /** Null when it fits; otherwise a message naming what to shorten and by how much. */
  readonly error: string | null;
}

/** Parts, for an error a person can act on without opening the code. */
function describeBodyParts(input: {
  postText?: string | null;
  callToAction?: string | null;
  suggestedHashtags?: string[] | null;
}): string {
  const parts: string[] = [];
  const text = input.postText?.trim() ?? "";
  if (text) parts.push(`post text ${text.length}`);
  const cta = input.callToAction?.trim() ?? "";
  if (cta) parts.push(`call to action ${cta.length}`);
  const tags = (input.suggestedHashtags ?? [])
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean);
  if (tags.length > 0) {
    const rendered = tags.map((tag) => `#${tag}`).join(" ");
    parts.push(`${tags.length} hashtag${tags.length === 1 ? "" : "s"} ${rendered.length}`);
  }
  return parts.length > 0 ? parts.join(", ") : "nothing";
}

/**
 * Measures the FINAL assembled body against the provider's own declared
 * ceiling (`INTEGRATION_CAPABILITIES[provider].bodyMaxChars` — facebook 5000,
 * instagram 2200, youtube 5000). Pure: it reads no database and publishes
 * nothing, so it is safe to call before a delivery is claimed.
 */
export function checkMarketingPostBodyFits(
  post: MarketingPost,
  provider: IntegrationProvider,
): MarketingPostBodyFit {
  const body = buildMarketingPostBodyFromPost(post);
  const limit = capabilityFor(provider).bodyMaxChars;
  if (body.length <= limit) return { body, error: null };

  const over = body.length - limit;
  return {
    body,
    error:
      `This post's ${provider} text is ${body.length} characters once the call to action and ` +
      `hashtags are added, which is ${over} over ${provider}'s ${limit}-character limit. ` +
      `It is made of: ${describeBodyParts(post)} (plus blank lines between them). ` +
      `Nothing was published and nothing was shortened for you — edit the draft so the whole ` +
      `thing fits, then publish again.`,
  };
}

/**
 * The same rule for the title, where the provider declares one.
 *
 * The draft-posts route already refuses an over-length title at INGEST
 * (`CHANNEL_TITLE_LIMITS`), so an agent-authored title cannot arrive too
 * long. This closes the other door: a founder can edit a draft's title in
 * Today after it lands, and that edit never passed the ingest check. Same
 * ceiling, enforced at the moment of publishing rather than only at the
 * moment of arrival.
 *
 * Providers with no separate title field (`titleMaxChars: null` — Facebook,
 * Instagram) are not checked, because for them the row title is internal
 * labelling that never reaches the provider.
 */
export function checkMarketingPostTitleFits(
  title: string | null | undefined,
  provider: IntegrationProvider,
): { readonly title: string; readonly error: string | null } {
  const trimmed = title?.trim() ?? "";
  const limit = capabilityFor(provider).titleMaxChars;
  if (limit === null || trimmed.length <= limit) {
    return { title: trimmed, error: null };
  }
  return {
    title: trimmed,
    error:
      `This post's ${provider} title is ${trimmed.length} characters, which is ` +
      `${trimmed.length - limit} over ${provider}'s ${limit}-character limit. ` +
      `Nothing was published and the title was not shortened for you — rename the draft so it ` +
      `fits, then publish again.`,
  };
}
