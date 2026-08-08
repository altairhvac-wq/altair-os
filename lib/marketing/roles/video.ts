import "server-only";

// Video Producer role: drafts a complete video brief — hook, scene-by-scene
// narration mapped to real product screens, CTA, thumbnail idea, and
// platform-ready upload fields. The brief is the creative front half; the
// AltairDemoTool pipeline (script -> captures -> TTS -> Remotion) is the
// render back half. Nothing is rendered or published from here.
// Architecture: docs/product/MARKETING_AI_HQ.md

import type { GenerateDraftTextRequest } from "@/lib/ai/types";
import type { MarketingHqContext } from "@/lib/marketing/brand";
import { buildMarketingHqContextBlock } from "@/lib/marketing/brand";
import { MARKETING_WORKFLOW_CHECKLIST } from "@/lib/marketing/foundation";
import type { MarketingItemInsert } from "@/lib/marketing/store";
import {
  MARKETING_CONTENT_OBJECTIVES,
  type MarketingVideoBriefContent,
} from "@/shared/types/marketing-ai-hq";
import {
  clampMarketingPlatformFields,
  resolveMarketingPlatform,
} from "@/shared/types/marketing-channels";

export const MARKETING_HQ_VIDEO_AI_FEATURE = "marketing-hq-video";

const TITLE_MAX_CHARS = 200;
const HOOK_MAX_CHARS = 200;
const NARRATION_MAX_CHARS = 300;
const CAPTION_MAX_CHARS = 80;
const CTA_MAX_CHARS = 200;
const THUMBNAIL_MAX_CHARS = 300;
const MIN_BEATS = 3;
const MAX_BEATS = 10;

/**
 * Product screens the capture pipeline can put on camera. Routes are real;
 * ready test-ids follow the repo naming law (`page-{id}`) and are refined at
 * capture time in the demo tool.
 */
const AVAILABLE_SCREENS = [
  { route: "/", label: "Dashboard (operational overview)" },
  { route: "/work", label: "Work hub (jobs pipeline)" },
  { route: "/dispatch", label: "Dispatch board with live map" },
  { route: "/schedule", label: "Schedule / calendar" },
  { route: "/customers", label: "Customer CRM" },
  { route: "/sales", label: "Sales / leads pipeline" },
  { route: "/estimates", label: "Estimates" },
  { route: "/invoices", label: "Invoices & payments" },
  { route: "/reports", label: "Reports & business health" },
  { route: "/marketing", label: "Marketing hub" },
] as const;

const VALID_ROUTES = new Set<string>(
  AVAILABLE_SCREENS.map((screen) => screen.route),
);

const VIDEO_PLATFORMS = new Set(["youtube", "tiktok", "instagram", "facebook"]);

const VIDEO_PROMPT = `You are the Video Producer on the Altair OS marketing team. The Marketing AI Foundation at the top of the context governs everything you do. You draft ONE complete short-video brief for HUMAN REVIEW in an approval queue. A separate capture/render pipeline films real product screens from your brief — you are not rendering or publishing anything.

${MARKETING_WORKFLOW_CHECKLIST}

Output requirements:
- Output ONLY a single valid JSON object — no markdown code fences, headings, preamble, or commentary
- Use exactly these keys: title, platform, objective, hook, beats, cta, thumbnail_idea, fields
- title: short internal label for the queue list
- platform: one of youtube, tiktok, instagram, facebook — pick what fits the concept and the channel focus in context
- objective: the ONE objective this video accomplishes — exactly one of: ${MARKETING_CONTENT_OBJECTIVES.join(", ")}
- hook: the spoken opening line (first 3 seconds; must earn the next 40)
- beats: JSON array of ${MIN_BEATS}-${MAX_BEATS} scenes in order. Each beat: {"narration": string, "route": string, "caption": string}
  - narration: what the voiceover says during this scene, 15-30 words, conversational
  - route: which product screen is on camera — EXACTLY one of: ${AVAILABLE_SCREENS.map((screen) => `${screen.route} (${screen.label})`).join(", ")}
  - caption: on-screen text overlay for this scene, max ${CAPTION_MAX_CHARS} characters, may be empty ""
- cta: the spoken closing call to action
- thumbnail_idea: one sentence describing the thumbnail (real product screenshot based, per brand visual rules)
- fields: the platform-ready upload fields for the chosen platform per the requirements in context (title/description/tags for youtube; caption for tiktok/instagram; message for facebook)

Craft rules:
- Total runtime 45-75 seconds: hook + beats + cta at a calm, confident pace — do not rush; founder feedback says calmer beats faster
- Tell one story: a real problem a trades owner has, shown being solved on real screens — never a feature tour
- Narration must only claim what the screens actually show; no invented customers, numbers, or results
- The hook names the pain, not the product; the product appears when the story needs it
- Write narration like the founder talks: plain, direct, zero hype
- Before output, apply the Foundation's final check; revise if it fails`;

type VideoBriefInput = {
  context: MarketingHqContext;
  recentTitles: string[];
  strategistFocus: string[];
};

function formatVideoInput(input: VideoBriefInput): string {
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
      `Recent video briefs (do not repeat these concepts):\n${input.recentTitles
        .slice(0, 10)
        .map((title) => `- ${title}`)
        .join("\n")}`,
    );
  }

  sections.push("Produce the single JSON object described above.");

  return sections.join("\n\n");
}

export function buildVideoBriefRequest(
  input: VideoBriefInput,
): GenerateDraftTextRequest {
  return {
    feature: MARKETING_HQ_VIDEO_AI_FEATURE,
    prompt: VIDEO_PROMPT,
    inputText: formatVideoInput(input),
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

function normalizeBeats(
  value: unknown,
): MarketingVideoBriefContent["beats"] {
  if (!Array.isArray(value)) {
    return [];
  }

  const beats: MarketingVideoBriefContent["beats"] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const narration = normalizeText(record.narration, NARRATION_MAX_CHARS);
    if (!narration) {
      continue;
    }

    const rawRoute = normalizeText(record.route, 60);
    const route = VALID_ROUTES.has(rawRoute) ? rawRoute : "/";

    beats.push({
      narration,
      route,
      caption: normalizeText(record.caption, CAPTION_MAX_CHARS),
    });

    if (beats.length >= MAX_BEATS) {
      break;
    }
  }

  return beats;
}

export function parseVideoBriefResponse(
  draftText: string,
): MarketingItemInsert | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripJsonCodeFence(draftText));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const record = parsed as Record<string, unknown>;
  const title = normalizeText(record.title, TITLE_MAX_CHARS);
  const hook = normalizeText(record.hook, HOOK_MAX_CHARS);
  const beats = normalizeBeats(record.beats);

  if (!title || !hook || beats.length < MIN_BEATS) {
    return null;
  }

  const rawPlatform = normalizeText(record.platform, 20).toLowerCase();
  const platform = VIDEO_PLATFORMS.has(rawPlatform) ? rawPlatform : "youtube";
  const spec = resolveMarketingPlatform(platform);

  const rawObjective = normalizeText(record.objective, 40).toLowerCase();
  const objective = (
    MARKETING_CONTENT_OBJECTIVES as readonly string[]
  ).includes(rawObjective)
    ? rawObjective
    : "build_authority";

  const rawFields =
    record.fields &&
    typeof record.fields === "object" &&
    !Array.isArray(record.fields)
      ? (record.fields as Record<string, unknown>)
      : null;

  const content: MarketingVideoBriefContent = {
    platform,
    objective,
    hook,
    beats,
    cta: normalizeText(record.cta, CTA_MAX_CHARS),
    thumbnailIdea: normalizeText(record.thumbnail_idea, THUMBNAIL_MAX_CHARS),
    fields: clampMarketingPlatformFields(spec, rawFields),
  };

  const bodyLines = [
    `Hook: ${hook}`,
    ...beats.map(
      (beat, index) =>
        `${index + 1}. [${beat.route}] ${beat.narration}${beat.caption ? ` (on-screen: "${beat.caption}")` : ""}`,
    ),
    content.cta ? `CTA: ${content.cta}` : "",
    content.thumbnailIdea ? `Thumbnail: ${content.thumbnailIdea}` : "",
  ].filter(Boolean);

  return {
    kind: "video_brief",
    role: "video_producer",
    title,
    bodyText: bodyLines.join("\n"),
    content: content as unknown as Record<string, unknown>,
    channelHint: platform,
  };
}
