// Channel packaging registry (client-safe).
// One source of truth for what each social platform requires: the fields,
// their character limits, and conventions. The copywriter fills these exact
// fields per platform, code clamps them to the limits, the queue renders and
// edits them, and future upload adapters read them directly — so nothing
// needs manual reformatting at publish time.
// Architecture: docs/product/MARKETING_AI_HQ.md

export type MarketingPlatformFieldSpec = {
  /** Stable key inside item content.fields. */
  key: string;
  /** Human label shown in the queue and edit form. */
  label: string;
  /** Hard character cap enforced in code (clamped, never trusted to AI). */
  maxChars: number;
  /** Render as textarea (true) or single-line input (false). */
  multiline: boolean;
  /** Primary-required: item is unusable without it. */
  required: boolean;
  /** Guidance shown to the AI and in the edit form. */
  hint: string;
};

export type MarketingPlatformSpec = {
  /** Registry id — matches the item channel label (lowercase). */
  id: string;
  label: string;
  /** The field key that is the main body text (feeds bodyText + hub). */
  primaryField: string;
  fields: MarketingPlatformFieldSpec[];
  /** Media requirement note (enforced at publish time, not draft time). */
  mediaNote: string | null;
  /** Where this maps in the existing Marketing Hub channel enum. */
  hubChannel: "facebook" | "instagram" | "google_business" | "website" | "general";
};

export const MARKETING_PLATFORMS: Record<string, MarketingPlatformSpec> = {
  facebook: {
    id: "facebook",
    label: "Facebook",
    primaryField: "message",
    fields: [
      {
        key: "message",
        label: "Post text",
        maxChars: 5_000,
        multiline: true,
        required: true,
        hint: "Conversational, community feel. Ideal under 500 characters; hashtags optional and minimal.",
      },
      {
        key: "link",
        label: "Link (optional)",
        maxChars: 300,
        multiline: false,
        required: false,
        hint: "One URL if the post points somewhere; otherwise leave empty.",
      },
    ],
    mediaNote: "Image optional; posts with a real product screenshot perform better.",
    hubChannel: "facebook",
  },
  instagram: {
    id: "instagram",
    label: "Instagram",
    primaryField: "caption",
    fields: [
      {
        key: "caption",
        label: "Caption",
        maxChars: 2_200,
        multiline: true,
        required: true,
        hint: "First line is the hook (feed truncates early). Put hashtags at the end of the caption, 3-8 of them.",
      },
    ],
    mediaNote: "Image or video is REQUIRED to publish on Instagram.",
    hubChannel: "instagram",
  },
  x: {
    id: "x",
    label: "X (Twitter)",
    primaryField: "text",
    fields: [
      {
        key: "text",
        label: "Post text",
        maxChars: 280,
        multiline: true,
        required: true,
        hint: "Hard 280-character limit including any link. Punchy, no hashtag spam (0-2 max).",
      },
    ],
    mediaNote: null,
    hubChannel: "general",
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    primaryField: "text",
    fields: [
      {
        key: "text",
        label: "Post text",
        maxChars: 3_000,
        multiline: true,
        required: true,
        hint: "Professional but human. Short paragraphs with line breaks; first two lines carry the hook.",
      },
    ],
    mediaNote: "Image optional.",
    hubChannel: "general",
  },
  youtube: {
    id: "youtube",
    label: "YouTube",
    primaryField: "description",
    fields: [
      {
        key: "video_title",
        label: "Video title",
        maxChars: 100,
        multiline: false,
        required: true,
        hint: "Searchable and honest — no clickbait. Front-load the keyword.",
      },
      {
        key: "description",
        label: "Description",
        maxChars: 5_000,
        multiline: true,
        required: true,
        hint: "First 2 lines show before the fold. Include what the video covers and one clear link/CTA.",
      },
      {
        key: "tags",
        label: "Tags (comma-separated)",
        maxChars: 480,
        multiline: false,
        required: false,
        hint: "10-15 relevant tags, comma-separated.",
      },
    ],
    mediaNote: "Video required at upload time (pairs with a video brief).",
    hubChannel: "general",
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    primaryField: "caption",
    fields: [
      {
        key: "caption",
        label: "Caption",
        maxChars: 2_200,
        multiline: true,
        required: true,
        hint: "Short and native — first words are the hook. 2-5 hashtags at the end.",
      },
    ],
    mediaNote: "Video is REQUIRED to publish on TikTok.",
    hubChannel: "general",
  },
  google_business: {
    id: "google_business",
    label: "Google Business",
    primaryField: "summary",
    fields: [
      {
        key: "summary",
        label: "Post text",
        maxChars: 1_500,
        multiline: true,
        required: true,
        hint: "Professional, local, trustworthy. No hashtags.",
      },
      {
        key: "cta_label",
        label: "Button (optional)",
        maxChars: 40,
        multiline: false,
        required: false,
        hint: "One of: Learn more, Sign up, Call now, Book. Leave empty for none.",
      },
    ],
    mediaNote: "Image recommended.",
    hubChannel: "google_business",
  },
  general: {
    id: "general",
    label: "General",
    primaryField: "text",
    fields: [
      {
        key: "text",
        label: "Post text",
        maxChars: 3_000,
        multiline: true,
        required: true,
        hint: "Platform-neutral copy, ready to adapt anywhere.",
      },
    ],
    mediaNote: null,
    hubChannel: "general",
  },
};

/** Resolve a free-form channel label to a platform spec (fallback: general). */
export function resolveMarketingPlatform(
  channel: string | null | undefined,
): MarketingPlatformSpec {
  const normalized = channel?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
  return MARKETING_PLATFORMS[normalized] ?? MARKETING_PLATFORMS.general;
}

/** Clamp a fields map to a platform's spec: known keys only, limits enforced. */
export function clampMarketingPlatformFields(
  spec: MarketingPlatformSpec,
  fields: Record<string, unknown> | null | undefined,
): Record<string, string> {
  const clamped: Record<string, string> = {};

  for (const fieldSpec of spec.fields) {
    const raw = fields?.[fieldSpec.key];
    if (typeof raw !== "string") {
      continue;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }
    clamped[fieldSpec.key] =
      trimmed.length > fieldSpec.maxChars
        ? `${trimmed.slice(0, Math.max(0, fieldSpec.maxChars - 1))}…`
        : trimmed;
  }

  return clamped;
}

/** The main body text for previews, bodyText, and hub conversion. */
export function getMarketingPlatformPrimaryText(
  spec: MarketingPlatformSpec,
  fields: Record<string, string>,
): string {
  return fields[spec.primaryField] ?? "";
}

/**
 * AI-facing requirements block for a set of channel labels — generated from
 * the registry so prompts and validation can never drift apart.
 */
export function buildPlatformRequirementsBlock(channels: string[]): string {
  const seen = new Set<string>();
  const specs: MarketingPlatformSpec[] = [];

  for (const channel of channels) {
    const spec = resolveMarketingPlatform(channel);
    if (!seen.has(spec.id)) {
      seen.add(spec.id);
      specs.push(spec);
    }
  }

  if (specs.length === 0) {
    specs.push(MARKETING_PLATFORMS.general);
  }

  const lines = specs.map((spec) => {
    const fieldLines = spec.fields
      .map(
        (field) =>
          `    - ${field.key}${field.required ? " (required)" : " (optional)"}: max ${field.maxChars} chars. ${field.hint}`,
      )
      .join("\n");
    const media = spec.mediaNote ? `\n    Media: ${spec.mediaNote}` : "";
    return `- channel "${spec.id}" fields:\n${fieldLines}${media}`;
  });

  return `Per-platform field requirements (fill the "fields" object with EXACTLY these keys for the post's channel; respect every limit):\n${lines.join("\n")}`;
}
