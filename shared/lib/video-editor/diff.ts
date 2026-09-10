/**
 * `diffEditorProjects(generated, approved)` — what the human changed.
 *
 * ==================== DETERMINISTIC, BY CONSTRUCTION ====================
 * Clips are matched by id, which survives every operation the editor can
 * perform except split (which mints a new id for the right-hand half, and that
 * is correctly reported as one clip shortened plus one clip added). Everything
 * else is a field comparison. Run it twice on the same pair and it returns the
 * same entries in the same order, because the traversal is over sorted ids
 * rather than over object key order.
 *
 * ==================== WHAT IT DELIBERATELY DOES NOT DO ====================
 * It does not guess intent. "Clip shortened by 2800ms" is a fact; "the editor
 * felt this shot was too long" is a hypothesis, and hypotheses belong in the
 * aggregation step where there is enough evidence to support one. Nothing here
 * calls a model, and nothing here should.
 */

import {
  isVisualTrackKind,
  projectDurationMs,
  type EditorClip,
  type EditorProject,
  type EditorTrack,
} from "@/shared/types/video-editor";
import type {
  DiffEntry,
  DiffSummary,
  ProjectDiff,
} from "@/shared/types/edit-learning";

type Located = { clip: EditorClip; track: EditorTrack };

/** Every clip in the project, by id, with the track it sits on. */
function index(project: EditorProject): Map<string, Located> {
  const out = new Map<string, Located>();
  for (const track of project.tracks) {
    for (const clip of track.clips) out.set(clip.id, { clip, track });
  }
  return out;
}

/** The earliest visual clip. Used for the opening-shot signal. */
function openingVisual(project: EditorProject): Located | null {
  let best: Located | null = null;
  for (const track of project.tracks) {
    if (!isVisualTrackKind(track.kind)) continue;
    for (const clip of track.clips) {
      if (!best || clip.startMs < best.clip.startMs) best = { clip, track };
    }
  }
  return best;
}

/** Numeric field comparison that treats absent and default as equal. */
function changedNumber(
  before: number | undefined,
  after: number | undefined,
  fallback: number,
): boolean {
  return (before ?? fallback) !== (after ?? fallback);
}

export function diffEditorProjects(
  generated: EditorProject,
  approved: EditorProject,
): ProjectDiff {
  const before = index(generated);
  const after = index(approved);
  const entries: DiffEntry[] = [];

  // Sorted so the output is stable regardless of insertion order.
  const allIds = [...new Set([...before.keys(), ...after.keys()])].sort();

  let clipsShortened = 0;
  let clipsLengthened = 0;
  let clipsMoved = 0;
  let clipsAdded = 0;
  let clipsRemoved = 0;
  let assetsReplaced = 0;
  let textEdits = 0;
  let captionEdits = 0;
  let transformEdits = 0;
  let audioEdits = 0;
  let clipsUnchanged = 0;

  for (const id of allIds) {
    const b = before.get(id);
    const a = after.get(id);

    if (b && !a) {
      entries.push({
        type: "clip_removed",
        clipId: id,
        trackId: b.track.id,
        kind: b.clip.kind,
        startMs: b.clip.startMs,
        durationMs: b.clip.durationMs,
      });
      clipsRemoved += 1;
      continue;
    }

    if (!b && a) {
      entries.push({
        type: "clip_added",
        clipId: id,
        trackId: a.track.id,
        kind: a.clip.kind,
        startMs: a.clip.startMs,
        durationMs: a.clip.durationMs,
      });
      clipsAdded += 1;
      continue;
    }

    if (!b || !a) continue;

    let touched = false;

    if (b.track.id !== a.track.id) {
      entries.push({
        type: "clip_moved_track",
        clipId: id,
        beforeTrackId: b.track.id,
        afterTrackId: a.track.id,
      });
      touched = true;
    }

    if (b.clip.durationMs !== a.clip.durationMs) {
      entries.push({
        type: "clip_duration_changed",
        clipId: id,
        trackId: a.track.id,
        beforeMs: b.clip.durationMs,
        afterMs: a.clip.durationMs,
        deltaMs: a.clip.durationMs - b.clip.durationMs,
      });
      if (a.clip.durationMs < b.clip.durationMs) clipsShortened += 1;
      else clipsLengthened += 1;
      touched = true;
    }

    if (b.clip.startMs !== a.clip.startMs) {
      entries.push({
        type: "clip_moved",
        clipId: id,
        trackId: a.track.id,
        beforeMs: b.clip.startMs,
        afterMs: a.clip.startMs,
        deltaMs: a.clip.startMs - b.clip.startMs,
      });
      clipsMoved += 1;
      touched = true;
    }

    if ((b.clip.assetId ?? null) !== (a.clip.assetId ?? null)) {
      entries.push({
        type: "asset_replaced",
        clipId: id,
        trackId: a.track.id,
        before: b.clip.assetId ?? null,
        after: a.clip.assetId ?? null,
      });
      assetsReplaced += 1;
      touched = true;
    }

    // Text and captions are the same field on different tracks, and they are
    // reported separately because they mean different things: a caption edit is
    // a transcription correction, a text edit is a design decision.
    const beforeText = b.clip.text?.text ?? "";
    const afterText = a.clip.text?.text ?? "";
    if (beforeText !== afterText) {
      const kind = a.track.kind === "caption" ? "caption_changed" : "text_changed";
      entries.push({
        type: kind,
        clipId: id,
        trackId: a.track.id,
        before: beforeText,
        after: afterText,
      } as DiffEntry);
      if (kind === "caption_changed") captionEdits += 1;
      else textEdits += 1;
      touched = true;
    }

    for (const property of ["x", "y", "scale", "rotation", "opacity"] as const) {
      const fallback = property === "scale" || property === "opacity" ? 1 : 0;
      if (
        changedNumber(
          b.clip.transform?.[property],
          a.clip.transform?.[property],
          fallback,
        )
      ) {
        entries.push({
          type: "transform_changed",
          clipId: id,
          trackId: a.track.id,
          property,
          before: b.clip.transform?.[property] ?? fallback,
          after: a.clip.transform?.[property] ?? fallback,
        });
        transformEdits += 1;
        touched = true;
      }
    }

    if ((b.clip.transform?.fit ?? "cover") !== (a.clip.transform?.fit ?? "cover")) {
      entries.push({
        type: "transform_changed",
        clipId: id,
        trackId: a.track.id,
        property: "fit",
        before: b.clip.transform?.fit ?? "cover",
        after: a.clip.transform?.fit ?? "cover",
      });
      transformEdits += 1;
      touched = true;
    }

    for (const property of ["volume", "fadeInMs", "fadeOutMs"] as const) {
      const fallback = property === "volume" ? 1 : 0;
      if (
        changedNumber(b.clip.audio?.[property], a.clip.audio?.[property], fallback)
      ) {
        entries.push({
          type: "audio_changed",
          clipId: id,
          trackId: a.track.id,
          property,
          before: b.clip.audio?.[property] ?? fallback,
          after: a.clip.audio?.[property] ?? fallback,
        });
        audioEdits += 1;
        touched = true;
      }
    }

    if ((b.clip.audio?.muted ?? false) !== (a.clip.audio?.muted ?? false)) {
      entries.push({
        type: "audio_changed",
        clipId: id,
        trackId: a.track.id,
        property: "muted",
        before: b.clip.audio?.muted ?? false,
        after: a.clip.audio?.muted ?? false,
      });
      audioEdits += 1;
      touched = true;
    }

    if (changedNumber(b.clip.transitionInMs, a.clip.transitionInMs, 0)) {
      entries.push({
        type: "transition_changed",
        clipId: id,
        trackId: a.track.id,
        beforeMs: b.clip.transitionInMs ?? 0,
        afterMs: a.clip.transitionInMs ?? 0,
      });
      touched = true;
    }

    if (!touched) clipsUnchanged += 1;
  }

  /* ── Track-level toggles ──────────────────────────────────────────────── */
  const beforeTracks = new Map(generated.tracks.map((t) => [t.id, t]));
  for (const track of approved.tracks) {
    const previous = beforeTracks.get(track.id);
    if (!previous) continue;
    for (const property of ["hidden", "muted", "locked"] as const) {
      if ((previous[property] ?? false) !== (track[property] ?? false)) {
        entries.push({
          type: "track_toggled",
          trackId: track.id,
          property,
          before: previous[property] ?? false,
          after: track[property] ?? false,
        });
      }
    }
  }

  /* ── Runtime ──────────────────────────────────────────────────────────── */
  const beforeDuration = projectDurationMs(generated);
  const afterDuration = projectDurationMs(approved);
  if (beforeDuration !== afterDuration) {
    entries.push({
      type: "project_duration_changed",
      beforeMs: beforeDuration,
      afterMs: afterDuration,
      deltaMs: afterDuration - beforeDuration,
    });
  }

  /* ── Opening shot ─────────────────────────────────────────────────────── */
  const openBefore = openingVisual(generated);
  const openAfter = openingVisual(approved);
  const openingVisualReplaced = Boolean(
    openBefore &&
      (!openAfter ||
        openAfter.clip.id !== openBefore.clip.id ||
        (openAfter.clip.assetId ?? null) !== (openBefore.clip.assetId ?? null)),
  );

  const clipsInDraft = before.size;

  const summary: DiffSummary = {
    // Track toggles and the runtime entry are real changes and are counted, so
    // "14 human edits captured" matches the length of the list you can read.
    totalChanges: entries.length,
    clipsAdded,
    clipsRemoved,
    clipsShortened,
    clipsLengthened,
    clipsMoved,
    assetsReplaced,
    textEdits,
    captionEdits,
    transformEdits,
    audioEdits,
    clipsUnchanged,
    clipsInDraft,
    durationDeltaMs: afterDuration - beforeDuration,
    openingVisualReplaced,
  };

  return { entries, summary };
}

/** One line per change, for an operator reading a session back. */
export function describeDiffEntry(entry: DiffEntry): string {
  switch (entry.type) {
    case "clip_duration_changed": {
      const verb = entry.deltaMs < 0 ? "shortened" : "lengthened";
      return `${entry.clipId} ${verb} by ${Math.abs(entry.deltaMs)}ms (${entry.beforeMs} → ${entry.afterMs})`;
    }
    case "clip_moved": {
      const verb = entry.deltaMs < 0 ? "earlier" : "later";
      return `${entry.clipId} moved ${Math.abs(entry.deltaMs)}ms ${verb}`;
    }
    case "clip_added":
      return `${entry.clipId} added to ${entry.trackId} (${entry.durationMs}ms)`;
    case "clip_removed":
      return `${entry.clipId} removed from ${entry.trackId}`;
    case "clip_moved_track":
      return `${entry.clipId} moved from ${entry.beforeTrackId} to ${entry.afterTrackId}`;
    case "asset_replaced":
      return `${entry.clipId} asset ${entry.before ?? "none"} → ${entry.after ?? "none"}`;
    case "text_changed":
      return `${entry.clipId} text edited`;
    case "caption_changed":
      return `${entry.clipId} caption edited`;
    case "transform_changed":
      return `${entry.clipId} ${entry.property} ${entry.before} → ${entry.after}`;
    case "audio_changed":
      return `${entry.clipId} ${entry.property} ${entry.before} → ${entry.after}`;
    case "transition_changed":
      return `${entry.clipId} dissolve ${entry.beforeMs}ms → ${entry.afterMs}ms`;
    case "track_toggled":
      return `${entry.trackId} ${entry.property} ${entry.before} → ${entry.after}`;
    case "project_duration_changed": {
      const verb = entry.deltaMs < 0 ? "shorter" : "longer";
      return `runtime ${Math.abs(entry.deltaMs)}ms ${verb}`;
    }
    default:
      return "unknown change";
  }
}
