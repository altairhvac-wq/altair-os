import "server-only";

// Strategist role: the weekly judgment call. Reads computed stats (code-math
// layer) plus standing directives and produces a structured report + next
// week's focus. It NEVER computes numbers — it narrates the ones it is given.
// Architecture: docs/product/MARKETING_AI_HQ.md

import type { GenerateDraftTextRequest } from "@/lib/ai/types";
import type { MarketingHqContext } from "@/lib/marketing/brand";
import { buildMarketingHqContextBlock } from "@/lib/marketing/brand";
import type {
  MarketingItemFlowStats,
  MarketingItemInsert,
} from "@/lib/marketing/store";
import {
  MARKETING_AI_ROLES,
  type MarketingStrategyReportContent,
} from "@/shared/types/marketing-ai-hq";
import {
  formatReelEvidence,
  type ReelEvidence,
} from "@/shared/types/marketing-reel-evidence";

export const MARKETING_HQ_STRATEGIST_AI_FEATURE = "marketing-hq-strategist";

const HEADLINE_MAX_CHARS = 200;
const SUMMARY_MAX_CHARS = 2_000;
const NARRATIVE_MAX_CHARS = 1_500;
const RECOMMENDATION_MAX_CHARS = 300;
const FOCUS_MAX_CHARS = 200;
const MAX_RECOMMENDATIONS = 8;
const MAX_FOCUS_ITEMS = 6;

const VALID_ROLES = new Set<string>(MARKETING_AI_ROLES);

const STRATEGIST_PROMPT = `You are the Marketing Strategist (Marketing Director) on the Altair OS marketing team. The Marketing AI Foundation at the top of the context governs everything you do. Once a week you review the numbers you are given and set direction for the whole marketing team. Your report goes to the owner's approval queue for HUMAN REVIEW. You are not publishing, spending, or scheduling anything.

Output requirements:
- Output ONLY a single valid JSON object — no markdown code fences, headings, preamble, or commentary
- Use exactly these keys: headline, summary, metrics_narrative, recommendations, next_week_focus
- headline: one-line state of the week
- summary: short honest assessment of where marketing stands (a few sentences)
- metrics_narrative: plain-language narration of the computed stats you were given — cite only numbers that appear in context, never invent or recompute
- recommendations: JSON array of objects {"text": string, "role": string} — role must be one of: ${MARKETING_AI_ROLES.join(", ")}
- next_week_focus: JSON array of short focus strings the copywriter will build next week's batch around

Judgment rules:
- Early weeks will have thin data; say so plainly instead of inventing signal
- Organic Reel performance, when present, is the only evidence you have about what the AUDIENCE responded to; the approval-queue stats only tell you what the FOUNDER accepted. Weigh them accordingly and never confuse the two
- Obey the sufficiency labels on the Reel evidence exactly. INSUFFICIENT means report the numbers and draw no comparison; DIRECTIONAL means you may propose a hypothesis to test; only COMPARABLE supports naming a pattern as a finding
- When a recommendation is based on Reel performance, cite the render job id it came from, so the next plan can be traced back to the evidence
- Recommend the smallest set of actions with the highest expected impact
- If the approval queue shows many rejections, diagnose why before recommending more volume
- Never recommend paid spend beyond proposals — ads are proposal-only at this stage
- Be direct with the owner; no filler praise
- Apply the Foundation's final check to every recommendation: does it help this specific business grow while maintaining customer trust? Revise any that fail before output`;

type StrategistInput = {
  context: MarketingHqContext;
  itemFlowStats: MarketingItemFlowStats;
  previousReport: Record<string, unknown> | null;
  recentRejectedTitles: string[];
  /**
   * What the audience did with the Reels that were actually published.
   *
   * Optional so an older caller — or a company with nothing published yet —
   * still produces a report. Absent is rendered as an explicit "no data"
   * sentence rather than omitted, because a silently missing section reads to
   * the model as a section with nothing worth saying.
   */
  reelEvidence?: ReelEvidence;
};

function formatStats(stats: MarketingItemFlowStats): string {
  const kinds = Object.entries(stats.byKind)
    .map(([kind, count]) => `${kind}: ${count}`)
    .join(", ");

  return [
    `Window: last ${stats.sinceDays} days`,
    `Items generated: ${stats.drafted}`,
    `Approved by founder: ${stats.approved}`,
    `Rejected by founder: ${stats.rejected}`,
    `Sent on to Marketing Hub: ${stats.converted}`,
    kinds ? `By kind: ${kinds}` : "By kind: none",
  ].join("\n");
}

function formatStrategistInput(input: StrategistInput): string {
  const sections: string[] = [buildMarketingHqContextBlock(input.context)];

  sections.push(
    `Computed stats (narrate these; do not recompute):\n${formatStats(input.itemFlowStats)}`,
  );

  // The audience half of the evidence. Placed before the queue stats' rejected
  // titles so that, when both exist, the model reads what people watched before
  // it reads what the founder declined.
  sections.push(
    formatReelEvidence(
      input.reelEvidence ?? { sinceDays: 30, reels: [], byProvider: {} },
    ),
  );

  if (input.recentRejectedTitles.length > 0) {
    sections.push(
      `Recently rejected items (diagnose the pattern):\n${input.recentRejectedTitles
        .slice(0, 10)
        .map((title) => `- ${title}`)
        .join("\n")}`,
    );
  }

  if (input.previousReport) {
    sections.push(
      `Last week's report (JSON):\n${JSON.stringify(input.previousReport).slice(0, 2_000)}`,
    );
  } else {
    sections.push(
      "Last week's report: none — this is the first strategy run.",
    );
  }

  return sections.join("\n\n");
}

export function buildStrategistRequest(
  input: StrategistInput,
): GenerateDraftTextRequest {
  return {
    feature: MARKETING_HQ_STRATEGIST_AI_FEATURE,
    prompt: STRATEGIST_PROMPT,
    inputText: formatStrategistInput(input),
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

function normalizeRecommendations(
  value: unknown,
): { text: string; role: string }[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const recommendations: { text: string; role: string }[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const text = normalizeText(record.text, RECOMMENDATION_MAX_CHARS);
    if (!text) {
      continue;
    }

    const rawRole = normalizeText(record.role, 40).toLowerCase();
    const role = VALID_ROLES.has(rawRole) ? rawRole : "strategist";

    recommendations.push({ text, role });

    if (recommendations.length >= MAX_RECOMMENDATIONS) {
      break;
    }
  }

  return recommendations;
}

function normalizeFocusList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().slice(0, FOCUS_MAX_CHARS))
    .filter((entry) => entry.length > 0)
    .slice(0, MAX_FOCUS_ITEMS);
}

export type ParsedStrategistReport = {
  content: MarketingStrategyReportContent;
  item: MarketingItemInsert;
};

export function parseStrategistResponse(
  draftText: string,
): ParsedStrategistReport | null {
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
  const headline = normalizeText(record.headline, HEADLINE_MAX_CHARS);
  const summary = normalizeText(record.summary, SUMMARY_MAX_CHARS);

  if (!headline || !summary) {
    return null;
  }

  const content: MarketingStrategyReportContent = {
    headline,
    summary,
    metricsNarrative: normalizeText(
      record.metrics_narrative,
      NARRATIVE_MAX_CHARS,
    ),
    recommendations: normalizeRecommendations(record.recommendations),
    nextWeekFocus: normalizeFocusList(record.next_week_focus),
  };

  const bodyLines = [
    content.summary,
    content.metricsNarrative,
    content.recommendations.length > 0
      ? `Recommendations:\n${content.recommendations
          .map((rec) => `- [${rec.role}] ${rec.text}`)
          .join("\n")}`
      : "",
    content.nextWeekFocus.length > 0
      ? `Next week focus:\n${content.nextWeekFocus
          .map((focus) => `- ${focus}`)
          .join("\n")}`
      : "",
  ].filter(Boolean);

  return {
    content,
    item: {
      kind: "strategy_report",
      role: "strategist",
      title: headline,
      bodyText: bodyLines.join("\n\n"),
      content: content as unknown as Record<string, unknown>,
      channelHint: null,
    },
  };
}

/** Focus list from the latest successful strategist run, for the copywriter. */
export function extractStrategistFocus(
  report: Record<string, unknown> | null,
): string[] {
  if (!report) {
    return [];
  }

  return normalizeFocusList(
    (report as { nextWeekFocus?: unknown }).nextWeekFocus,
  );
}
