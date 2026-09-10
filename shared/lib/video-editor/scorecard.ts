/**
 * "How much did I have to change the bot's cut?" — as numbers, after approval.
 *
 * ==================== NO MODEL IS INVOLVED ====================
 * Every line comes from `diffEditorProjects`. Retention is a ratio of two
 * counts; pacing is clips per minute before and after. Asking a model to
 * describe a diff it was handed would be slower, non-deterministic, and
 * occasionally wrong about arithmetic that is not in dispute.
 *
 * ==================== IT IS THE METRIC THAT MATTERS ====================
 * The interesting long-run number is not "did the agent produce a video" but
 * "how much of it survived". A retention rate that climbs across episodes is
 * the learning loop working; one that does not is the loop failing, visibly,
 * which is the point of measuring it at all.
 */

import {
  projectDurationMs,
  isVisualTrackKind,
  type EditorProject,
} from "@/shared/types/video-editor";
import type { ProjectDiff } from "@/shared/types/edit-learning";
import { visualChangesPerMinute } from "./learning";

export type ScorecardLine = {
  readonly label: string;
  readonly value: string;
  /** True when this line represents a human intervention, for emphasis. */
  readonly isChange: boolean;
};

export type Scorecard = {
  /** 0..1 — generated clips that survived untouched. */
  readonly retentionRatio: number;
  readonly lines: readonly ScorecardLine[];
  readonly headline: string;
};

function countVisualClips(project: EditorProject): number {
  let n = 0;
  for (const track of project.tracks) {
    if (!isVisualTrackKind(track.kind)) continue;
    n += track.clips.length;
  }
  return n;
}

export function buildScorecard(
  generated: EditorProject,
  approved: EditorProject,
  diff: ProjectDiff,
): Scorecard {
  const summary = diff.summary;
  const retentionRatio =
    summary.clipsInDraft === 0
      ? 1
      : summary.clipsUnchanged / summary.clipsInDraft;

  const beforeRate = visualChangesPerMinute(generated);
  const afterRate = visualChangesPerMinute(approved);
  const beforeMs = projectDurationMs(generated);
  const afterMs = projectDurationMs(approved);

  const lines: ScorecardLine[] = [
    {
      label: "Clips retained",
      value: `${Math.round(retentionRatio * 100)}%`,
      isChange: false,
    },
  ];

  const push = (label: string, count: number, suffix = "") => {
    if (count > 0) {
      lines.push({
        label,
        value: `${count}${suffix}`,
        isChange: true,
      });
    }
  };

  push("Clips shortened", summary.clipsShortened);
  push("Clips lengthened", summary.clipsLengthened);
  push("Clips moved", summary.clipsMoved);
  push("Clips removed", summary.clipsRemoved);
  push("Clips added", summary.clipsAdded);
  push("Assets replaced", summary.assetsReplaced);
  push("Captions edited", summary.captionEdits);
  push("Text edited", summary.textEdits);
  push("Transforms changed", summary.transformEdits);
  push("Audio changed", summary.audioEdits);

  if (summary.openingVisualReplaced) {
    lines.push({ label: "Opening visual", value: "replaced", isChange: true });
  }

  if (beforeRate !== afterRate) {
    lines.push({
      label: "Visual changes / minute",
      value: `${beforeRate.toFixed(1)} → ${afterRate.toFixed(1)}`,
      isChange: true,
    });
  }

  if (beforeMs !== afterMs) {
    const delta = (afterMs - beforeMs) / 1000;
    lines.push({
      label: "Runtime",
      value: `${(beforeMs / 1000).toFixed(1)}s → ${(afterMs / 1000).toFixed(1)}s (${delta > 0 ? "+" : ""}${delta.toFixed(1)}s)`,
      isChange: true,
    });
  }

  const changed = summary.clipsInDraft - summary.clipsUnchanged;
  const headline =
    summary.totalChanges === 0
      ? "Approved unchanged — the generated cut was accepted as-is."
      : `${Math.round(retentionRatio * 100)}% of the generated cut was kept; ${changed} clip${changed === 1 ? "" : "s"} changed across ${summary.totalChanges} edit${summary.totalChanges === 1 ? "" : "s"}.`;

  return { retentionRatio, lines, headline };
}

/** Visual clip counts, for a caller that wants the raw pair. */
export function clipCounts(
  generated: EditorProject,
  approved: EditorProject,
): { readonly generated: number; readonly approved: number } {
  return {
    generated: countVisualClips(generated),
    approved: countVisualClips(approved),
  };
}
