import "server-only";

// Brand + HQ context assembly: the stable prompt prefix every role shares.
// Architecture: docs/product/MARKETING_AI_HQ.md

import {
  normalizeMarketingBrandKit,
  normalizeMarketingHqConfig,
  type MarketingBrandKit,
  type MarketingHqConfig,
  type MarketingIndustryProfile,
} from "@/shared/types/marketing-ai-hq";
import {
  buildSeasonLine,
  MARKETING_FOUNDATION_BLOCK,
} from "@/lib/marketing/foundation";
import { getActiveMarketingDirective } from "@/lib/marketing/store";

/**
 * Honesty rules from the Altair Promise (docs/product/MARKETING_AI_FOUNDATION.md)
 * plus the founder-draft heritage rules. Merged with the founder's own banned
 * claims — never replaced by them.
 */
export const DEFAULT_BANNED_CLAIMS: readonly string[] = [
  "Inventing customers, reviews, statistics, revenue numbers, integrations, testimonials, or case studies",
  "Stating anything as fact that cannot be verified from provided context",
  "Claiming beta users unless explicitly provided",
  "Claiming publishing/scheduling happened",
  "Mentioning AI or automation as the author",
  "Exaggerating capabilities or market position",
];

export const DEFAULT_BRAND_VOICE =
  "Honest, founder-led, practical — not hypey or salesy. Written by a working HVAC business owner building software for other trades owners.";

export const DEFAULT_BRAND_STYLE =
  "Plain language a busy contractor reads in ten seconds. Short sentences. Concrete benefits over feature lists. No corporate buzzwords.";

export type MarketingHqContext = {
  config: MarketingHqConfig;
  brandKit: MarketingBrandKit;
  hasConfig: boolean;
  hasBrandKit: boolean;
};

export async function loadMarketingHqContext(
  companyId: string,
): Promise<MarketingHqContext> {
  const [configDirective, brandDirective] = await Promise.all([
    getActiveMarketingDirective(companyId, "hq_config"),
    getActiveMarketingDirective(companyId, "brand_kit"),
  ]);

  return {
    config: normalizeMarketingHqConfig(configDirective?.content),
    brandKit: normalizeMarketingBrandKit(brandDirective?.content),
    hasConfig: Boolean(configDirective),
    hasBrandKit: Boolean(brandDirective),
  };
}

function buildIndustryProfileSection(
  profile: MarketingIndustryProfile,
): string | null {
  const lines: string[] = [];

  if (profile.industry) {
    lines.push(`Industry: ${profile.industry}`);
  }
  if (profile.focus) {
    lines.push(`Focus: ${profile.focus}`);
  }
  if (profile.businessSize) {
    lines.push(`Business size: ${profile.businessSize}`);
  }
  if (profile.location) {
    lines.push(`Local market: ${profile.location}`);
  }
  if (profile.services.length > 0) {
    lines.push(`Services: ${profile.services.join(", ")}`);
  }
  if (profile.idealCustomer) {
    lines.push(`Ideal customer: ${profile.idealCustomer}`);
  }
  if (profile.seasonalityNotes) {
    lines.push(`Seasonality: ${profile.seasonalityNotes}`);
  }
  if (profile.commonObjections.length > 0) {
    lines.push(
      `Common customer objections: ${profile.commonObjections.join("; ")}`,
    );
  }
  if (profile.typicalJobValues) {
    lines.push(`Typical job values: ${profile.typicalJobValues}`);
  }
  if (profile.preferredChannels.length > 0) {
    lines.push(
      `Preferred marketing channels: ${profile.preferredChannels.join(", ")}`,
    );
  }
  if (profile.competitorNotes) {
    lines.push(`Competitor landscape: ${profile.competitorNotes}`);
  }

  if (lines.length === 0) {
    return null;
  }

  return `Industry Profile (adapt everything to this specific business — never assume every contractor is the same):\n${lines.join("\n")}`;
}

/**
 * The shared context block prepended to every role's input: the Foundation
 * constitution first, then this company's Industry Profile, goals, and brand
 * kit, ending with the current-season line. Kept order-stable so
 * provider-side prompt caching can do its job (the only daily-changing line
 * is the season line at the very end).
 */
export function buildMarketingHqContextBlock(
  context: MarketingHqContext,
): string {
  const { config, brandKit } = context;
  const sections: string[] = [MARKETING_FOUNDATION_BLOCK];

  const industrySection = buildIndustryProfileSection(config.industryProfile);
  if (industrySection) {
    sections.push(industrySection);
  }

  sections.push(
    `Mission (what we are marketing):\n${config.mission || "Altair OS — field-service software built by a working HVAC founder."}`,
  );
  sections.push(
    `Audience:\n${config.audience || "Owners of small HVAC, plumbing, and electrical businesses (1-15 techs)."}`,
  );

  if (config.positioning) {
    sections.push(`Positioning:\n${config.positioning}`);
  }

  if (config.goals) {
    sections.push(`Current goals:\n${config.goals}`);
  }

  if (config.channels.length > 0) {
    sections.push(`Channel focus: ${config.channels.join(", ")}`);
  }

  sections.push(`Brand voice:\n${brandKit.voice || DEFAULT_BRAND_VOICE}`);
  sections.push(`Writing style:\n${brandKit.style || DEFAULT_BRAND_STYLE}`);

  const bannedClaims = [
    ...DEFAULT_BANNED_CLAIMS,
    ...brandKit.bannedClaims,
  ];
  sections.push(
    `Never do the following:\n${bannedClaims.map((claim) => `- ${claim}`).join("\n")}`,
  );

  if (brandKit.sampleHooks.length > 0) {
    sections.push(
      `Approved example hooks:\n${brandKit.sampleHooks.map((hook) => `- ${hook}`).join("\n")}`,
    );
  }

  sections.push(buildSeasonLine());

  return sections.join("\n\n");
}
