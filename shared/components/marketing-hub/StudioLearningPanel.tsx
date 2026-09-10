"use client";

import { useEffect, useState } from "react";
import {
  altairMcCardClass,
  altairMcCardPadClass,
  StatusPill,
} from "@/shared/design-system/components";
import {
  actionablePreferences,
  aggregate,
  summariseSession,
  type SessionStats,
} from "@/shared/lib/video-editor/learning";
import { derivePreferences } from "@/shared/lib/video-editor/learning";
import { loadSessions } from "@/shared/lib/video-editor/session";
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
  const actionable = new Set(
    actionablePreferences(preferences).map((p) => p.key),
  );

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

          <ul>
            {preferences.map((preference) => (
              <PreferenceRow
                key={preference.key}
                preference={preference}
                usable={actionable.has(preference.key)}
              />
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
  usable,
}: {
  readonly preference: EditingPreference;
  readonly usable: boolean;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 border-t border-[var(--north-star-plate-border)] px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <span className="block text-sm text-altair-ink">
          {preference.recommendation}
        </span>
        <span className="mt-0.5 block font-mono text-[10px] text-altair-ink-muted">
          {preference.key} · {preference.evidenceCount} session
          {preference.evidenceCount === 1 ? "" : "s"} ·{" "}
          {Math.round(preference.confidence * 100)}% confidence
        </span>
      </div>
      <StatusPill tone={usable ? "success" : "neutral"} size="sm">
        {usable ? "Usable by agents" : "Needs more evidence"}
      </StatusPill>
    </li>
  );
}
