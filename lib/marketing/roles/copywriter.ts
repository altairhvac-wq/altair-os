import "server-only";

// Copywriter role: batched social-post drafting into the approval queue.
// Prompt builder + strict JSON parser only — the engine owns orchestration.
// Architecture: docs/product/MARKETING_AI_HQ.md

import type { GenerateDraftTextRequest } from "@/lib/ai/types";
import type { MarketingHqContext } from "@/lib/marketing/brand";
import { buildMarketingHqContextBlock } from "@/lib/marketing/brand";
import { MARKETING_WORKFLOW_CHECKLIST } from "@/lib/marketing/foundation";
import type { MarketingItemInsert } from "@/lib/marketing/store";
import {
  MARKETING_CONTENT_OBJECTIVES,
  type MarketingSocialPostContent,
} from "@/shared/types/marketing-ai-hq";
import {
  buildPlatformRequirementsBlock,
  clampMarketingPlatformFields,
  getMarketingPlatformPrimaryText,
  resolveMarketingPlatform,
} from "@/shared/types/marketing-channels";

export const MARKETING_HQ_COPYWRITER_AI_FEATURE = "marketing-hq-copywriter";

const POST_TEXT_MAX_CHARS = 2_500;
const TITLE_MAX_CHARS = 200;
const RATIONALE_MAX_CHARS = 300;
const CTA_MAX_CHARS = 300;
const MAX_HASHTAGS = 6;
const RECENT_TITLES_LIMIT = 20;

const COPYWRITER_PROMPT = `You are the Copywriter on the Altair OS marketing team. The Marketing AI Foundation at the top of the context governs everything you do. You draft social posts for HUMAN REVIEW in an approval queue. You are not posting, scheduling, or publishing anything.

${MARKETING_WORKFLOW_CHECKLIST}

Output requirements:
- Output ONLY a single valid JSON array — no markdown code fences, headings, preamble, or commentary
- Each element is an object with exactly these keys: title, channel, objective, fields, hashtags, call_to_action, rationale
- title: short internal label for the queue list (not the post headline)
- channel: the target platform label, matching one of the channel-focus labels from context (or "general")
- objective: the ONE objective this post accomplishes — exactly one of: ${MARKETING_CONTENT_OBJECTIVES.join(", ")}
- fields: a JSON object holding the platform-ready upload fields for that channel — EXACTLY the keys listed for that channel in the per-platform requirements, every value final and ready to publish with zero editing, every limit respected
- hashtags: JSON array of strings without the # prefix (0-${MAX_HASHTAGS}; ALSO place them inside the caption field where the platform's convention expects them, e.g. Instagram/TikTok caption ends)
- call_to_action: one clear CTA line (also woven into the fields where natural)
- rationale: one sentence on why this post serves this specific business's current goals

Craft rules:
- Vary both the angle AND the objective across the batch: build-in-public updates, pain-point posts, feature-into-benefit translations, audience questions, behind-the-scenes
- Match tone and platform conventions per channel; the Foundation's personality and voice rules always win
- Use ONLY facts provided in context. Where a post would need a fact you don't have (a number, a customer, a date), write the post so it doesn't need it
- Do not repeat topics from the recent-post list in context
- No em dashes; write like a person, not a press release
- Before output, apply the Foundation's final check to every post; revise any that fail`;

type CopywriterBatchInput = {
  context: MarketingHqContext;
  recentTitles: string[];
  strategistFocus: string[];
  batchSize: number;
};

function formatCopywriterInput(input: CopywriterBatchInput): string {
  const sections: string[] = [buildMarketingHqContextBlock(input.context)];

  const channels =
    input.context.config.channels.length > 0
      ? input.context.config.channels
      : ["general"];
  sections.push(buildPlatformRequirementsBlock(channels));

  if (input.strategistFocus.length > 0) {
    sections.push(
      `This week's focus (from the strategist):\n${input.strategistFocus
        .map((focus) => `- ${focus}`)
        .join("\n")}`,
    );
  }

  if (input.recentTitles.length > 0) {
    sections.push(
      `Recent posts (do not repeat these topics):\n${input.recentTitles
        .slice(0, RECENT_TITLES_LIMIT)
        .map((title) => `- ${title}`)
        .join("\n")}`,
    );
  }

  sections.push(
    `Produce exactly ${input.batchSize} posts as the JSON array described above.`,
  );

  return sections.join("\n\n");
}

export function buildCopywriterBatchRequest(
  input: CopywriterBatchInput,
): GenerateDraftTextRequest {
  return {
    feature: MARKETING_HQ_COPYWRITER_AI_FEATURE,
    prompt: COPYWRITER_PROMPT,
    inputText: formatCopywriterInput(input),
  };
}

function stripJsonCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

function normalizeHashtags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter((tag) => tag.length > 0)
    .slice(0, MAX_HASHTAGS);
}

function normalizeText(value: unknown, maxChars: number): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxChars);
}

/**
 * Parse the model's JSON array into queue-ready item inserts.
 * Lenient on wrapper noise, strict on shape — invalid entries are dropped.
 */
export function parseCopywriterBatchResponse(
  draftText: string,
): MarketingItemInsert[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripJsonCodeFence(draftText));
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const items: MarketingItemInsert[] = [];

  for (const entry of parsed) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const title = normalizeText(record.title, TITLE_MAX_CHARS);

    if (!title) {
      continue;
    }

    const channel =
      normalizeText(record.channel, 40).toLowerCase() || "general";
    const spec = resolveMarketingPlatform(channel);

    const rawFields =
      record.fields &&
      typeof record.fields === "object" &&
      !Array.isArray(record.fields)
        ? (record.fields as Record<string, unknown>)
        : null;
    const fields = clampMarketingPlatformFields(spec, rawFields);

    // Legacy fallback: accept post_text into the primary field when the
    // model didn't produce a fields object.
    if (!fields[spec.primaryField]) {
      const legacyText = normalizeText(record.post_text, POST_TEXT_MAX_CHARS);
      if (legacyText) {
        fields[spec.primaryField] = clampMarketingPlatformFields(spec, {
          [spec.primaryField]: legacyText,
        })[spec.primaryField];
      }
    }

    const postText = getMarketingPlatformPrimaryText(spec, fields);
    if (!postText) {
      continue;
    }

    const rawObjective = normalizeText(record.objective, 40).toLowerCase();
    const objective = (
      MARKETING_CONTENT_OBJECTIVES as readonly string[]
    ).includes(rawObjective)
      ? rawObjective
      : "build_trust";

    const content: MarketingSocialPostContent = {
      channel: spec.id,
      objective,
      fields,
      postText,
      hashtags: normalizeHashtags(record.hashtags),
      callToAction: normalizeText(record.call_to_action, CTA_MAX_CHARS),
      rationale: normalizeText(record.rationale, RATIONALE_MAX_CHARS),
    };

    items.push({
      kind: "social_post",
      role: "copywriter",
      title,
      bodyText: postText,
      content: content as unknown as Record<string, unknown>,
      channelHint: spec.id,
    });
  }

  return items;
}
