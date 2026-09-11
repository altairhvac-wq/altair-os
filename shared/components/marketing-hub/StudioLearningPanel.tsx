"use client";

import { useEffect, useState } from "react";
import {
  altairMcCardClass,
  altairMcCardPadClass,
  StatusPill,
} from "@/shared/design-system/components";
import {
  aggregate,
  derivePreferences,
  summariseSession,
  type SessionStats,
} from "@/shared/lib/video-editor/learning";
import {
  PREFERENCE_STATE_LABEL,
  preferenceState,
  preferenceStrengthLabel,
  type PreferenceState,
} from "@/shared/lib/video-editor/preference-set";
import { loadSessions } from "@/shared/lib/video-editor/session";
import {
  buildRetentionReport,
  describeTrend,
  MIN_SESSIONS_FOR_TREND,
} from "@/shared/lib/video-editor/retention";
import {
  DEFAULT_LEARNING_THRESHOLDS,
  type EditSession,
  type EditingPreference,
} from "@/shared/types/edit-learning";

/**
 * What the editor has learned from human corrections, for an operator.
 *
 * ==================== NOT A DASHBOARD ====================
 * Six numbers and a list. The temptation with learning data is to build a
 * analytics surface around it, which would be a lot of chrome around a sample
 * size that is currently in single digits. This says what has been observed and
 * how far it is from being trustworthy, and stops.
 *
 * ==================== NEAR-MISSES ARE SHOWN ON PURPOSE ====================
 * Preferences below the threshold are listed and clearly marked as not
 * actionable. An operator needs to see that the system is accumulating evidence
 * — otherwise a screen that stays empty for weeks looks broken rather than
 * patient. An AGENT gets `actionablePreferences` and never sees these.
 *
 * ==================== IT READS THE SAME STORE THE EDITOR WRITES ====================
 * Sessions live in this browser's localStorage, so this panel shows what THIS
 * browser has recorded. That limitation is stated on the panel rather than
 * implied, because a number that silently means "on this laptop only" is the
 * kind of number that gets quoted in a meeting.
 */
export function StudioLearningPanel() {
  const [sessions, setSessions] = useState<EditSession[] | null>(null);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  if (sessions === null) {
    return (
      <section className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
        <p className="text-xs text-altair-ink-muted">Reading edit sessions…</p>
      </section>
    );
  }

  const approved = sessions.filter((s) => s.approvedProjectSnapshot);
  const stats = approved
    .map(summariseSession)
    .filter((s): s is SessionStats => s !== null);
  const totals = aggregate(stats);
  const preferences = derivePreferences(sessions);

  return (
    <section className={altairMcCardClass}>
      <div className={altairMcCardPadClass}>
        <h3 className="text-sm font-semibold text-altair-ink">
          Learned from edits
        </h3>
        <p className="mt-1 text-xs text-altair-ink-muted">
          {approved.length === 0
            ? "No approved edits yet. Open an episode in the editor, change it, and press Approve — the difference from the generated draft is what gets recorded."
            : `${approved.length} approved edit${approved.length === 1 ? "" : "s"} recorded in this browser. A preference becomes usable by the Director and Editor agents at ${DEFAULT_LEARNING_THRESHOLDS.minSessions} sessions and ${Math.round(DEFAULT_LEARNING_THRESHOLDS.minConfidence * 100)}% confidence.`}
        </p>
      </div>

      {approved.length > 0 ? (
        <>
          <dl className="grid grid-cols-2 gap-px border-t border-[var(--north-star-plate-border)] bg-[var(--north-star-plate-border)] sm:grid-cols-3">
            <Stat
              label="Bot still duration"
              value={`${(totals.botMedianVisualMs / 1000).toFixed(1)}s`}
              hint="median"
            />
            <Stat
              label="Approved still duration"
              value={`${(totals.humanMedianVisualMs / 1000).toFixed(1)}s`}
              hint="median"
            />
            <Stat
              label="Left unchanged"
              value={`${Math.round(totals.unchangedRatio * 100)}%`}
              hint="of generated clips"
            />
            <Stat
              label="Opening replaced"
              value={`${Math.round(totals.openingReplacementRate * 100)}%`}
              hint="of approvals"
            />
            <Stat
              label="Captions corrected"
              value={`${Math.round(totals.captionEditRate * 100)}%`}
              hint="of approvals"
            />
            <Stat
              label="Runtime change"
              value={`${totals.medianDurationDeltaMs > 0 ? "+" : ""}${(totals.medianDurationDeltaMs / 1000).toFixed(1)}s`}
              hint="median, draft → approved"
            />
          </dl>

          <Retention sessions={sessions} />

          <ul>
            {preferences.map((preference) => (
              <PreferenceRow key={preference.key} preference={preference} />
            ))}
          </ul>
        </>
      ) : null}

      <p className="border-t border-[var(--north-star-plate-border)] px-3.5 py-2.5 text-[11px] text-altair-ink-muted">
        Sessions are stored in this browser only. Moving them server-side is
        what makes this evidence shared rather than personal.
      </p>
    </section>
  );
}

/**
 * Retention over time — whether the bot is getting better.
 *
 * ==================== TWO RATES, DELIBERATELY SEPARATE ====================
 * Cut retention moves when an operator retimes or reorders; visual retention
 * moves when they swap a shot the bot chose. A bot that times well and picks
 * badly, and one that picks well and times badly, produce the same single
 * number and need opposite corrections — so they are never averaged together.
 *
 * ==================== IT REFUSES TO DRAW A TREND ====================
 * Below four approved sessions there is no arrow, no direction, and no
 * encouraging phrasing — just how many more are needed. Two points make a line;
 * a line through two points is an anecdote with a slope. The same discipline
 * the preference thresholds enforce, applied to reporting.
 */
function Retention({ sessions }: { readonly sessions: readonly EditSession[] }) {
  const report = buildRetentionReport(sessions);
  if (report.points.length === 0) return null;

  return (
    <div
      data-testid="studio-retention"
      className="border-t border-[var(--north-star-plate-border)] px-3.5 py-2.5"
    >
      <h4 className="text-[11px] font-semibold text-altair-ink">
        Retention over time
      </h4>

      <dl className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1.5">
        <div>
          <dt className="text-[11px] text-altair-ink-muted">Cut kept</dt>
          <dd className="text-base font-semibold tabular-nums text-altair-ink">
            {report.cutRetention === null
              ? "—"
              : `${Math.round(report.cutRetention * 100)}%`}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-altair-ink-muted">Chosen shots kept</dt>
          <dd className="text-base font-semibold tabular-nums text-altair-ink">
            {/*
              An em dash, not 0%. No curated session has happened yet, which is
              a different fact from every shot having been rejected — and the
              line below says which.
            */}
            {report.visualRetention === null
              ? "—"
              : `${Math.round(report.visualRetention * 100)}%`}
          </dd>
          <dd className="text-[10px] text-altair-ink-muted">
            {report.visualRetention === null
              ? "no curated draft approved yet"
              : `${report.assets.replaced} of ${report.assets.chosen} swapped, over ${report.curatedSessions} session${report.curatedSessions === 1 ? "" : "s"}`}
          </dd>
        </div>
      </dl>

      <ul className="mt-2 space-y-0.5 text-[11px] text-altair-ink-muted">
        <li>
          {describeTrend(report.cutTrend, report.points.length, "Cut retention")}
        </li>
        <li>
          {describeTrend(
            report.visualTrend,
            report.curatedSessions,
            "Shot retention",
          )}
        </li>
      </ul>

      {report.points.length < MIN_SESSIONS_FOR_TREND ? (
        <p className="mt-1.5 text-[10px] text-altair-ink-muted">
          These are averages, not a direction. A direction needs at least{" "}
          {MIN_SESSIONS_FOR_TREND} approved sessions.
        </p>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint: string;
}) {
  return (
    <div className="bg-[var(--surface-section)] px-3.5 py-2.5">
      <dt className="text-[11px] text-altair-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-altair-ink">
        {value}
      </dd>
      <dd className="text-[10px] text-altair-ink-muted">{hint}</dd>
    </div>
  );
}

function PreferenceRow({
  preference,
}: {
  readonly preference: EditingPreference;
}) {
  const state: PreferenceState = preferenceState(preference);
  const tone =
    state === "active" ? "success" : state === "candidate" ? "warning" : "neutral";

  return (
    <li className="flex flex-wrap items-start justify-between gap-2 border-t border-[var(--north-star-plate-border)] px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <span className="block text-sm text-altair-ink">
          {preference.recommendation}
        </span>
        <span className="mt-0.5 block font-mono text-[10px] text-altair-ink-muted">
          {preference.key} · scope {preference.scope}
          {preference.scopeValue ? ` (${preference.scopeValue})` : ""} ·{" "}
          {preference.evidenceCount} session
          {preference.evidenceCount === 1 ? "" : "s"} ·{" "}
          {Math.round(preference.confidence * 100)}% confidence
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusPill tone={tone} size="sm">
          {PREFERENCE_STATE_LABEL[state]}
        </StatusPill>
        <span className="text-[10px] text-altair-ink-muted">
          {preferenceStrengthLabel(preference.confidence)}
        </span>
      </div>
    </li>
  );
}
