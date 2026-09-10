/**
 * The contract an agent reads. Everything else in the learning stack is
 * private to it.
 *
 * ==================== WHY A SEPARATE, VERSIONED SHAPE ====================
 * `EditingPreference` (in `edit-learning.ts`) is what the aggregator produces
 * — it changes whenever a new signal is added. An agent reads a FROZEN,
 * versioned envelope instead, because the two move at different speeds: adding
 * a new statistic should not require redeploying the agent platform, and an
 * agent that persisted "I used preference set v3" must be able to say what v3
 * meant six months later.
 *
 * ==================== IT IS DELIBERATELY SMALL ====================
 * No raw events, no sessions, no diffs. An agent given the raw log would
 * re-derive these statistics itself — differently, probably wrongly, and with
 * no threshold. What crosses this boundary is a handful of sentences plus the
 * evidence behind each one, and nothing else.
 *
 * ==================== CONFIDENCE IS PART OF THE PAYLOAD ====================
 * The agent is told how strong each signal is and what to do about it, because
 * a preference presented as fact is a preference that overrides creative
 * judgement on the strength of five sessions. `strengthOf` is the one place
 * that mapping lives.
 */

import type { PreferenceScope } from "./edit-learning";

/** Bumped when the SHAPE changes, not when the numbers do. */
export const EDITING_PREFERENCE_SET_VERSION = 1;

export type AgentEditingPreference = {
  readonly key: string;
  /** Independent approved sessions behind this. Never event count. */
  readonly evidenceSessions: number;
  /** 0..1. */
  readonly confidence: number;
  readonly recommendation: string;
  readonly metrics?: Readonly<Record<string, number>>;
};

export type EditingPreferenceSet = {
  readonly version: number;
  readonly generatedAt: string;
  readonly scope: {
    readonly format?: string;
    readonly series?: string;
    readonly topic?: string;
  };
  readonly preferences: readonly AgentEditingPreference[];
};

/**
 * How strongly the agent should weigh a preference.
 *
 * Three bands, not a number, because a number invites an agent to do
 * arithmetic on it. The bands say what to DO:
 *
 *   strong  — follow it unless there is a specific reason not to
 *   guidance— consider it; it is evidence, not instruction
 *   weak    — do not let it override creative reasoning
 *
 * Anything below `guidance` is filtered out before the agent ever sees it, so
 * `weak` exists for the operator panel and for tests, not for prompts.
 */
export const PREFERENCE_STRENGTHS = ["strong", "guidance", "weak"] as const;
export type PreferenceStrength = (typeof PREFERENCE_STRENGTHS)[number];

export const STRONG_CONFIDENCE = 0.8;
export const GUIDANCE_CONFIDENCE = 0.7;

export function strengthOf(confidence: number): PreferenceStrength {
  if (confidence >= STRONG_CONFIDENCE) return "strong";
  if (confidence >= GUIDANCE_CONFIDENCE) return "guidance";
  return "weak";
}

/* ══════════════════════════════════════════════════════════════════════════
 * Scope precedence
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Most specific wins.
 *
 *   series+format  →  series  →  format  →  global
 *
 * The rule exists because of one concrete failure it prevents: a 2.5-second
 * still learned from Shorts must not shorten every visual in a six-minute
 * educational video. Format is therefore ABOVE global, and a series-specific
 * signal outranks the format it belongs to — a series is a narrower claim than
 * "all long-form".
 *
 * `topic` participates by being folded into the series tier when present: a
 * topic is a subdivision of a series, not a peer of it, and giving it its own
 * tier would create two orderings for the same pair of facts.
 *
 * Precedence is applied PER KEY, not per set: a series that has learned
 * something about captions and nothing about pacing inherits the format's
 * pacing rule rather than losing it.
 */
export const SCOPE_PRECEDENCE: readonly PreferenceScope[] = [
  "topic",
  "series",
  "format",
  "global",
] as const;

export type ScopedPreferences = {
  readonly scope: PreferenceScope;
  readonly scopeValue?: string;
  readonly preferences: readonly AgentEditingPreference[];
};

/**
 * Merges scoped sets by precedence, per key.
 *
 * Later (broader) tiers fill gaps; they never overwrite a narrower tier's
 * answer. The returned list is sorted by confidence so the prompt renders the
 * strongest evidence first.
 */
export function resolveByPrecedence(
  tiers: readonly ScopedPreferences[],
): { preference: AgentEditingPreference; scope: PreferenceScope }[] {
  const byKey = new Map<
    string,
    { preference: AgentEditingPreference; scope: PreferenceScope }
  >();

  for (const scope of SCOPE_PRECEDENCE) {
    for (const tier of tiers) {
      if (tier.scope !== scope) continue;
      for (const preference of tier.preferences) {
        // First writer wins: SCOPE_PRECEDENCE is walked narrowest-first.
        if (!byKey.has(preference.key)) {
          byKey.set(preference.key, { preference, scope });
        }
      }
    }
  }

  return [...byKey.values()].sort(
    (a, b) => b.preference.confidence - a.preference.confidence,
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * What the agent is told
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Renders the preference set as a prompt section.
 *
 * NOT raw JSON. A model handed `{"key":"static_visual_duration","confidence":0.81}`
 * has to decide for itself what 0.81 licenses, and different runs will decide
 * differently. Prose with the evidence attached and an explicit instruction per
 * band is reproducible.
 *
 * Returns null when nothing clears the bar, and the caller then adds no section
 * at all — an empty "HUMAN-LEARNED EDITING PREFERENCES" heading tells a model
 * that humans had no opinion, which is not what "not enough evidence yet"
 * means.
 */
export function renderPreferenceGuidance(
  set: EditingPreferenceSet,
): string | null {
  const usable = set.preferences.filter(
    (p) => strengthOf(p.confidence) !== "weak",
  );
  if (usable.length === 0) return null;

  const lines = usable.map((preference) => {
    const strength = strengthOf(preference.confidence);
    return [
      `- ${preference.recommendation}`,
      `  Evidence: ${preference.evidenceSessions} approved editing session${preference.evidenceSessions === 1 ? "" : "s"}.`,
      `  Confidence: ${Math.round(preference.confidence * 100)}% (${strength}).`,
    ].join("\n");
  });

  const scopeBits = [
    set.scope.series ? `series "${set.scope.series}"` : null,
    set.scope.format ? `format "${set.scope.format}"` : null,
    set.scope.topic ? `topic "${set.scope.topic}"` : null,
  ].filter(Boolean);

  return [
    "# HUMAN-LEARNED EDITING PREFERENCES",
    "",
    `Derived from edits a human made to previous generated drafts${
      scopeBits.length ? ` for ${scopeBits.join(", ")}` : ""
    }. Preference set v${set.version}, generated ${set.generatedAt}.`,
    "",
    ...lines,
    "",
    "How to weigh these:",
    "- STRONG preferences should normally be followed. Depart from one only",
    "  when this specific piece has a reason the evidence does not cover.",
    "- GUIDANCE preferences are evidence, not instruction. Take them into",
    "  account; they do not settle the question.",
    "- These describe what humans CHANGED about earlier drafts. They are not a",
    "  brief, and they never outrank the topic, the research findings, or the",
    "  Director's rationale.",
  ].join("\n");
}

/** The keys actually shown to the agent — recorded on the draft afterwards. */
export function suppliedPreferenceKeys(
  set: EditingPreferenceSet,
): string[] {
  return set.preferences
    .filter((p) => strengthOf(p.confidence) !== "weak")
    .map((p) => p.key);
}
