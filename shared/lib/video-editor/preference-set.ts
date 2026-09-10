/**
 * Builds the versioned `EditingPreferenceSet` an agent reads, from sessions.
 *
 * ==================== THE BOUNDARY ====================
 * Everything above this line is the editor's private learning stack — events,
 * diffs, per-session statistics. Everything below is what crosses into the
 * agent platform. Keeping the boundary in one small module means there is
 * exactly one place to look when asking "what does the Director actually see".
 *
 * ==================== SCOPE IS RESOLVED HERE, NOT BY THE AGENT ====================
 * The agent asks for a set given a series and a format, and gets back one
 * flat list already merged by precedence. Handing it four overlapping tiers and
 * a precedence rule would mean the rule is implemented twice — here in tests
 * and again inside a prompt, where it cannot be tested at all.
 */

import {
  DEFAULT_LEARNING_THRESHOLDS,
  type EditSession,
  type EditingPreference,
  type LearningThresholds,
  type PreferenceScope,
} from "@/shared/types/edit-learning";
import {
  EDITING_PREFERENCE_SET_VERSION,
  renderPreferenceGuidance,
  resolveByPrecedence,
  strengthOf,
  suppliedPreferenceKeys,
  type AgentEditingPreference,
  type EditingPreferenceSet,
  type ScopedPreferences,
} from "@/shared/types/editing-preferences";
import { actionablePreferences, derivePreferences } from "./learning";

function toAgentPreference(
  preference: EditingPreference,
): AgentEditingPreference {
  return {
    key: preference.key,
    evidenceSessions: preference.evidenceCount,
    confidence: preference.confidence,
    recommendation: preference.recommendation,
    metrics: preference.evidence,
  };
}

export type PreferenceSetRequest = {
  readonly series?: string;
  readonly format?: string;
  readonly topic?: string;
  readonly thresholds?: LearningThresholds;
  /** Supplied by the caller so the pure function stays deterministic. */
  readonly generatedAt: string;
};

/**
 * Derives every applicable tier, keeps only what clears BOTH thresholds, and
 * merges by precedence.
 *
 * A tier the caller did not name is skipped rather than computed and
 * discarded — asking for a format-scoped set should not quietly aggregate a
 * series the request said nothing about.
 */
export function buildPreferenceSet(
  sessions: readonly EditSession[],
  request: PreferenceSetRequest,
): EditingPreferenceSet {
  const thresholds = request.thresholds ?? DEFAULT_LEARNING_THRESHOLDS;

  const tiers: ScopedPreferences[] = [];

  const add = (scope: PreferenceScope, scopeValue?: string) => {
    const derived = derivePreferences(sessions, {
      scope,
      scopeValue,
      thresholds,
    });
    tiers.push({
      scope,
      scopeValue,
      // The threshold is applied HERE, not by the agent. A set that carried
      // sub-threshold entries would rely on every consumer remembering to
      // filter, and one that forgot would act on a single session.
      preferences: actionablePreferences(derived, thresholds).map(
        toAgentPreference,
      ),
    });
  };

  if (request.topic) add("topic", request.topic);
  if (request.series) add("series", request.series);
  if (request.format) add("format", request.format);
  add("global");

  const resolved = resolveByPrecedence(tiers);

  return {
    version: EDITING_PREFERENCE_SET_VERSION,
    generatedAt: request.generatedAt,
    scope: {
      ...(request.format ? { format: request.format } : {}),
      ...(request.series ? { series: request.series } : {}),
      ...(request.topic ? { topic: request.topic } : {}),
    },
    preferences: resolved.map((r) => r.preference),
  };
}

/**
 * Which tier each surviving preference came from. Not part of the agent
 * contract — it exists so the operator panel can show WHY a rule applies, and
 * so a precedence bug is visible rather than merely wrong.
 */
export function explainPrecedence(
  sessions: readonly EditSession[],
  request: PreferenceSetRequest,
): { key: string; scope: PreferenceScope; confidence: number }[] {
  const thresholds = request.thresholds ?? DEFAULT_LEARNING_THRESHOLDS;
  const tiers: ScopedPreferences[] = [];
  const add = (scope: PreferenceScope, scopeValue?: string) => {
    tiers.push({
      scope,
      scopeValue,
      preferences: actionablePreferences(
        derivePreferences(sessions, { scope, scopeValue, thresholds }),
        thresholds,
      ).map(toAgentPreference),
    });
  };
  if (request.topic) add("topic", request.topic);
  if (request.series) add("series", request.series);
  if (request.format) add("format", request.format);
  add("global");

  return resolveByPrecedence(tiers).map((r) => ({
    key: r.preference.key,
    scope: r.scope,
    confidence: r.preference.confidence,
  }));
}

/* ══════════════════════════════════════════════════════════════════════════
 * Operator-facing state
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Three states, so a panel never claims the system "learned" something after
 * one session.
 *
 *   collecting — below the evidence bar; the system is accumulating
 *   candidate  — enough sessions, not enough agreement
 *   active     — cleared both bars; an agent may act on it
 */
export const PREFERENCE_STATES = ["collecting", "candidate", "active"] as const;
export type PreferenceState = (typeof PREFERENCE_STATES)[number];

export function preferenceState(
  preference: EditingPreference,
  thresholds: LearningThresholds = DEFAULT_LEARNING_THRESHOLDS,
): PreferenceState {
  if (preference.evidenceCount < thresholds.minSessions) return "collecting";
  if (preference.confidence < thresholds.minConfidence) return "candidate";
  return "active";
}

export const PREFERENCE_STATE_LABEL: Record<PreferenceState, string> = {
  collecting: "Collecting evidence",
  candidate: "Candidate",
  active: "Active guidance",
};

/** What an operator should read for the strength band, matching the agent's. */
export function preferenceStrengthLabel(confidence: number): string {
  const strength = strengthOf(confidence);
  return strength === "strong"
    ? "Follow normally"
    : strength === "guidance"
      ? "Guidance only"
      : "Not used by agents";
}

/* ══════════════════════════════════════════════════════════════════════════
 * Cross-repo handoff
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * The file the agent platform reads.
 *
 * ==================== IT CARRIES THE RENDERED TEXT ====================
 * The obvious design is for the platform to read the structured preferences and
 * render its own prompt section. That means `renderPreferenceGuidance` exists
 * twice, in two repositories, in two languages of comment — and the day they
 * disagree, the Director is being told something no test in either repo
 * asserts.
 *
 * So the text is rendered ONCE, here, where it is tested, and travels with the
 * data. The platform validates the envelope and injects the string. The
 * structured `preferences` array travels too, because the platform records
 * which keys it was given and that must not be parsed back out of prose.
 *
 * ==================== WHY A FILE ====================
 * Sessions live in the operator's browser today, so there is no server-side
 * store for an API to read. A file is what this system already uses to cross
 * the same boundary — episode JSON, visual plans, timeline exports — and it
 * needs no migration to exist. When sessions move to a table, this becomes an
 * endpoint and `loadPreferenceSetFile` is what it replaces.
 */
export type PreferenceSetFile = {
  readonly set: EditingPreferenceSet;
  /** Pre-rendered prompt section, or null when nothing cleared the bar. */
  readonly guidance: string | null;
  /** Keys the agent will be shown. Recorded on the draft afterwards. */
  readonly suppliedKeys: readonly string[];
  /** Where this came from, so a stale file is diagnosable. */
  readonly provenance: {
    readonly sessionsConsidered: number;
    readonly approvedSessions: number;
    readonly thresholds: LearningThresholds;
  };
};

export function buildPreferenceSetFile(
  sessions: readonly EditSession[],
  request: PreferenceSetRequest,
): PreferenceSetFile {
  const set = buildPreferenceSet(sessions, request);
  return {
    set,
    guidance: renderPreferenceGuidance(set),
    suppliedKeys: suppliedPreferenceKeys(set),
    provenance: {
      sessionsConsidered: sessions.length,
      approvedSessions: sessions.filter((s) => s.approvedProjectSnapshot).length,
      thresholds: request.thresholds ?? DEFAULT_LEARNING_THRESHOLDS,
    },
  };
}
