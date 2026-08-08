import "server-only";

// SEO specialist role: weekly batch of one comparison/alternative page draft
// and one educational article draft into the approval queue. Drafts are
// content only — nothing is published to any site by this role.
// Architecture: docs/product/MARKETING_AI_HQ.md

import type { GenerateDraftTextRequest } from "@/lib/ai/types";
import type { MarketingHqContext } from "@/lib/marketing/brand";
import { buildMarketingHqContextBlock } from "@/lib/marketing/brand";
import { MARKETING_WORKFLOW_CHECKLIST } from "@/lib/marketing/foundation";
import type { MarketingItemInsert } from "@/lib/marketing/store";
import {
  MARKETING_CONTENT_OBJECTIVES,
  type MarketingSeoArticleContent,
} from "@/shared/types/marketing-ai-hq";

export const MARKETING_HQ_SEO_AI_FEATURE = "marketing-hq-seo";

const TITLE_MAX_CHARS = 200;
const KEYWORD_MAX_CHARS = 120;
const META_DESCRIPTION_MAX_CHARS = 200;
const BODY_MAX_CHARS = 12_000;
const OUTLINE_MAX_ENTRIES = 12;
const OUTLINE_ENTRY_MAX_CHARS = 150;
const LINK_IDEAS_MAX = 8;
const RECENT_TITLES_LIMIT = 20;

const SEO_PROMPT = `You are the SEO Specialist on the Altair OS marketing team. The Marketing AI Foundation at the top of the context governs everything you do. You draft site content for HUMAN REVIEW in an approval queue. You are not publishing anything.

${MARKETING_WORKFLOW_CHECKLIST}

Output requirements:
- Output ONLY a single valid JSON array with exactly two objects — no markdown code fences, headings, preamble, or commentary
- Each object has exactly these keys: kind, title, objective, target_keyword, meta_description, outline, body_markdown, internal_link_ideas
- objective: the ONE objective this content accomplishes — exactly one of: ${MARKETING_CONTENT_OBJECTIVES.join(", ")}
- kind: "seo_page" for the first object (a comparison/alternative-style page), "blog_article" for the second (an educational article)
- title: the page/article H1
- target_keyword: the primary search phrase this content targets
- meta_description: 150-160 characters, compelling, honest
- outline: JSON array of section headings in order
- body_markdown: the full draft in markdown, following the outline
- internal_link_ideas: JSON array of short strings describing pages this should link to

Craft rules:
- The seo_page targets buyers comparing field-service software (alternative/comparison/vs-style searches). Compare honestly on philosophy and fit — built-by-a-contractor vs enterprise tooling — and NEVER fabricate competitor pricing, features, or reviews. Where a specific fact about a competitor would be needed, speak to categories of difference instead
- The blog_article answers a real question your audience searches for and quietly demonstrates the product's point of view
- Write for small trades business owners: plain language, concrete examples, no filler
- Use ONLY facts provided in context; where a product fact is missing, write around it
- Do not repeat topics from the recent-content list in context
- No em dashes; write like a person, not a press release
- Before output, apply the Foundation's final check to both pieces; revise any that fail`;

type SeoBatchInput = {
  context: MarketingHqContext;
  recentTitles: string[];
  strategistFocus: string[];
};

function formatSeoInput(input: SeoBatchInput): string {
  const sections: string[] = [buildMarketingHqContextBlock(input.context)];

  if (input.strategistFocus.length > 0) {
    sections.push(
      `This week's focus (from the strategist):\n${input.strategistFocus
        .map((focus) => `- ${focus}`)
        .join("\n")}`,
    );
  }

  if (input.recentTitles.length > 0) {
    sections.push(
      `Recent SEO/blog drafts (do not repeat these topics):\n${input.recentTitles
        .slice(0, RECENT_TITLES_LIMIT)
        .map((title) => `- ${title}`)
        .join("\n")}`,
    );
  }

  sections.push(
    "Produce the two-object JSON array described above: one seo_page, one blog_article.",
  );

  return sections.join("\n\n");
}

export function buildSeoBatchRequest(
  input: SeoBatchInput,
): GenerateDraftTextRequest {
  return {
    feature: MARKETING_HQ_SEO_AI_FEATURE,
    prompt: SEO_PROMPT,
    inputText: formatSeoInput(input),
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

function normalizeText(value: unknown, maxChars: number): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxChars);
}

function normalizeStringList(
  value: unknown,
  maxEntries: number,
  maxChars: number,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().slice(0, maxChars))
    .filter((entry) => entry.length > 0)
    .slice(0, maxEntries);
}

export function parseSeoBatchResponse(
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
    const bodyMarkdown = normalizeText(record.body_markdown, BODY_MAX_CHARS);

    if (!title || !bodyMarkdown) {
      continue;
    }

    const rawKind = normalizeText(record.kind, 20).toLowerCase();
    const kind = rawKind === "seo_page" ? "seo_page" : "blog_article";

    const rawObjective = normalizeText(record.objective, 40).toLowerCase();
    const objective = (
      MARKETING_CONTENT_OBJECTIVES as readonly string[]
    ).includes(rawObjective)
      ? rawObjective
      : "improve_seo";

    const content: MarketingSeoArticleContent = {
      pageType: kind === "seo_page" ? "comparison" : "guide",
      objective,
      targetKeyword: normalizeText(record.target_keyword, KEYWORD_MAX_CHARS),
      metaDescription: normalizeText(
        record.meta_description,
        META_DESCRIPTION_MAX_CHARS,
      ),
      outline: normalizeStringList(
        record.outline,
        OUTLINE_MAX_ENTRIES,
        OUTLINE_ENTRY_MAX_CHARS,
      ),
      bodyMarkdown,
      internalLinkIdeas: normalizeStringList(
        record.internal_link_ideas,
        LINK_IDEAS_MAX,
        OUTLINE_ENTRY_MAX_CHARS,
      ),
    };

    items.push({
      kind,
      role: "seo_specialist",
      title,
      bodyText: bodyMarkdown,
      content: content as unknown as Record<string, unknown>,
      channelHint: "website",
    });
  }

  return items.slice(0, 2);
}
