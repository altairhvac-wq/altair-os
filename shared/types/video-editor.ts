/**
 * The editor's project model — one canonical source of truth for the timeline.
 *
 * ==================== TIME IS THE STATE, PIXELS ARE A VIEW ====================
 * Every timed object carries `startMs` and `durationMs`. Nothing in this module
 * knows what a pixel is. The editor renders a clip at `startMs * pxPerMs` and
 * reads a drag back through the inverse, so the project is identical whatever
 * the zoom level, and a resize cannot alter the edit.
 *
 * The prototype this replaces stacked clips as vertical cards and stored order
 * rather than time, which is why it could describe a sequence but never an
 * edit: two things could not be simultaneous, nothing could be trimmed, and
 * "where am I" had no answer. Horizontal time is not a styling choice.
 *
 * ==================== IT COMPILES DOWN, IT DOES NOT REPLACE ====================
 * This model is a superset of what `production/slide-system` renders today. The
 * adapter in `shared/lib/video-editor/compile.ts` lowers it to the existing
 * episode + visual-plan pair, and reports what it had to drop. Anything the
 * renderer cannot express is allowed to exist here — it just has to survive the
 * round trip honestly rather than silently.
 */

/** Master frame. 16:9 today; the model carries it so 9:16 is a project field. */
export const EDITOR_DEFAULT_FRAME = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

/**
 * Track kinds, in the order they stack top to bottom in the timeline.
 *
 * Order is compositing order for the visual kinds — later in this list paints
 * ON TOP — so the array is the z-order and there is no second place to change
 * it. Audio kinds carry no z-order and sit below the visual ones because that
 * is where an editor puts them.
 */
export const EDITOR_TRACK_KINDS = [
  "video",
  "overlay",
  "graphics",
  "text",
  "caption",
  "voice",
  "music",
  "sfx",
] as const;

export type EditorTrackKind = (typeof EDITOR_TRACK_KINDS)[number];

const AUDIO_KINDS = new Set<EditorTrackKind>(["voice", "music", "sfx"]);

export function isAudioTrackKind(kind: EditorTrackKind): boolean {
  return AUDIO_KINDS.has(kind);
}

/** Visual kinds paint; audio kinds do not. Used for compositing and preview. */
export function isVisualTrackKind(kind: EditorTrackKind): boolean {
  return !AUDIO_KINDS.has(kind);
}

/**
 * Clip kinds. `slide` and `codeAnimation` exist because the production pipeline
 * already renders both, and an editor that could not represent them would be
 * an editor for a different product.
 */
export const EDITOR_CLIP_KINDS = [
  "slide",
  "image",
  "video",
  "codeAnimation",
  "text",
  "caption",
  "audio",
] as const;

export type EditorClipKind = (typeof EDITOR_CLIP_KINDS)[number];

/** Which clip kinds a track will accept. Enforced on drop and on move. */
const TRACK_ACCEPTS: Record<EditorTrackKind, readonly EditorClipKind[]> = {
  video: ["slide", "image", "video", "codeAnimation"],
  overlay: ["slide", "image", "video", "codeAnimation"],
  graphics: ["slide", "image", "codeAnimation"],
  text: ["text"],
  caption: ["caption"],
  voice: ["audio"],
  music: ["audio"],
  sfx: ["audio"],
};

export function trackAccepts(
  kind: EditorTrackKind,
  clipKind: EditorClipKind,
): boolean {
  return TRACK_ACCEPTS[kind].includes(clipKind);
}

/**
 * Per-clip visual transform. Every field optional: an absent transform means
 * "fill the frame", which is what the existing slide renderer does, so a
 * compiled project with no transforms is byte-identical to today's output.
 */
export type EditorTransform = {
  readonly x?: number;
  readonly y?: number;
  readonly scale?: number;
  readonly rotation?: number;
  readonly opacity?: number;
  readonly fit?: "cover" | "contain";
};

export type EditorTextStyle = {
  readonly text?: string;
  readonly fontSize?: number;
  readonly fontWeight?: number;
  readonly align?: "left" | "center" | "right";
  readonly color?: string;
  readonly background?: string;
  readonly stroke?: string;
};

export type EditorAudioStyle = {
  readonly volume?: number;
  readonly fadeInMs?: number;
  readonly fadeOutMs?: number;
  readonly muted?: boolean;
};

export type EditorClip = {
  readonly id: string;
  readonly kind: EditorClipKind;
  /** Library-relative asset id, or a slide id from the visual plan. */
  readonly assetId?: string;
  /** Beat id this clip came from, when it round-tripped out of an episode. */
  readonly beatId?: string;
  readonly label: string;
  readonly startMs: number;
  readonly durationMs: number;
  /** Offset into the SOURCE media. Only meaningful for video/audio. */
  readonly trimInMs?: number;
  readonly transform?: EditorTransform;
  readonly text?: EditorTextStyle;
  readonly audio?: EditorAudioStyle;
  /** Cross-dissolve INTO this clip. 0 or absent is a hard cut. */
  readonly transitionInMs?: number;
};

export type EditorTrack = {
  readonly id: string;
  readonly kind: EditorTrackKind;
  readonly name: string;
  readonly locked?: boolean;
  readonly muted?: boolean;
  readonly hidden?: boolean;
  readonly clips: readonly EditorClip[];
};

export type EditorProject = {
  readonly id: string;
  readonly title: string;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly tracks: readonly EditorTrack[];
  /** Schema version, so a stored project from an older build is detectable. */
  readonly version: 1;
};

/* ══════════════════════════════════════════════════════════════════════════
 * Timeline math. Pure, total, and the only place time becomes pixels.
 * ══════════════════════════════════════════════════════════════════════════ */

/** End of a clip, exclusive. */
export function clipEndMs(clip: EditorClip): number {
  return clip.startMs + clip.durationMs;
}

/**
 * Project duration = the furthest clip end across every track, including
 * hidden and muted ones.
 *
 * Hidden tracks count deliberately. Hiding a track is a VIEW action; if it
 * shortened the project, toggling an eye icon would silently truncate a
 * render, and the operator would have no way to see what went missing.
 */
export function projectDurationMs(project: EditorProject): number {
  let end = 0;
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      const clipEnd = clipEndMs(clip);
      if (clipEnd > end) end = clipEnd;
    }
  }
  return end;
}

export function findClip(
  project: EditorProject,
  clipId: string,
): { track: EditorTrack; clip: EditorClip } | null {
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      if (clip.id === clipId) return { track, clip };
    }
  }
  return null;
}

/** Clips overlap when they share any instant. Touching end-to-start does not. */
export function clipsOverlap(a: EditorClip, b: EditorClip): boolean {
  return a.startMs < clipEndMs(b) && b.startMs < clipEndMs(a);
}

/**
 * The topmost visual clip at a given time, per the z-order in
 * EDITOR_TRACK_KINDS. This is what the preview paints last.
 */
export function visualClipsAt(
  project: EditorProject,
  timeMs: number,
): { track: EditorTrack; clip: EditorClip }[] {
  const hits: { track: EditorTrack; clip: EditorClip }[] = [];
  for (const track of project.tracks) {
    if (track.hidden || !isVisualTrackKind(track.kind)) continue;
    for (const clip of track.clips) {
      if (timeMs >= clip.startMs && timeMs < clipEndMs(clip)) {
        hits.push({ track, clip });
      }
    }
  }
  return hits.sort(
    (a, b) =>
      EDITOR_TRACK_KINDS.indexOf(a.track.kind) -
      EDITOR_TRACK_KINDS.indexOf(b.track.kind),
  );
}

/** Audible clips at a time, for the preview's audio scheduling. */
export function audioClipsAt(
  project: EditorProject,
  timeMs: number,
): { track: EditorTrack; clip: EditorClip }[] {
  const hits: { track: EditorTrack; clip: EditorClip }[] = [];
  for (const track of project.tracks) {
    if (track.muted || !isAudioTrackKind(track.kind)) continue;
    for (const clip of track.clips) {
      if (timeMs >= clip.startMs && timeMs < clipEndMs(clip)) {
        hits.push({ track, clip });
      }
    }
  }
  return hits;
}

/* ── Zoom ─────────────────────────────────────────────────────────────────── */

/**
 * Zoom is pixels-per-second, clamped to a range where a clip stays both
 * grabbable and visible: below ~2 px/s a five-second clip is 10px wide and
 * cannot be trimmed; above ~400 px/s a two-minute episode is 48,000px and
 * scrolling stops being navigation.
 */
export const EDITOR_MIN_PX_PER_SEC = 2;
export const EDITOR_MAX_PX_PER_SEC = 400;
export const EDITOR_DEFAULT_PX_PER_SEC = 60;

export function clampPxPerSec(value: number): number {
  if (!Number.isFinite(value)) return EDITOR_DEFAULT_PX_PER_SEC;
  return Math.min(
    EDITOR_MAX_PX_PER_SEC,
    Math.max(EDITOR_MIN_PX_PER_SEC, value),
  );
}

export function msToPx(ms: number, pxPerSec: number): number {
  return (ms / 1000) * pxPerSec;
}

export function pxToMs(px: number, pxPerSec: number): number {
  return (px / pxPerSec) * 1000;
}

/* ── Snapping ─────────────────────────────────────────────────────────────── */

/**
 * Candidate snap targets: zero, the playhead, and every clip edge on every
 * track except the clip being dragged.
 *
 * Cross-track edges are included on purpose — aligning a caption to the cut it
 * belongs to is the single most common alignment in this kind of edit, and it
 * is a cross-track operation.
 */
export function snapTargetsMs(
  project: EditorProject,
  opts: { readonly excludeClipId?: string; readonly playheadMs?: number },
): number[] {
  const targets = new Set<number>([0]);
  if (typeof opts.playheadMs === "number") targets.add(opts.playheadMs);
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      if (clip.id === opts.excludeClipId) continue;
      targets.add(clip.startMs);
      targets.add(clipEndMs(clip));
    }
  }
  return [...targets].sort((a, b) => a - b);
}

/**
 * Snap `valueMs` to the nearest target within `toleranceMs`, else return it
 * unchanged. Tolerance is supplied in MILLISECONDS by the caller, which
 * converts from a fixed pixel threshold — so the snap feels the same at every
 * zoom level instead of becoming unusable when zoomed in.
 */
export function snapMs(
  valueMs: number,
  targets: readonly number[],
  toleranceMs: number,
): number {
  let best = valueMs;
  let bestDistance = toleranceMs;
  for (const target of targets) {
    const distance = Math.abs(target - valueMs);
    if (distance <= bestDistance) {
      best = target;
      bestDistance = distance;
    }
  }
  return best;
}

/* ── Edit operations ──────────────────────────────────────────────────────── */

/** Nothing may start before zero, and nothing may have non-positive length. */
export const EDITOR_MIN_CLIP_MS = 100;

export function normalizeClip(clip: EditorClip): EditorClip {
  const startMs = Math.max(0, Math.round(clip.startMs));
  const durationMs = Math.max(EDITOR_MIN_CLIP_MS, Math.round(clip.durationMs));
  if (startMs === clip.startMs && durationMs === clip.durationMs) return clip;
  return { ...clip, startMs, durationMs };
}

/**
 * Split a clip at an absolute project time.
 *
 * Returns null when the cut lands outside the clip, or closer to an edge than
 * EDITOR_MIN_CLIP_MS — splitting into a 4ms sliver produces a clip that cannot
 * be selected or trimmed, which reads as data loss rather than an edit.
 *
 * The right-hand half advances `trimInMs` so that splitting a video or an audio
 * clip keeps both halves pointing at the correct source material. Getting this
 * wrong is invisible until playback, which is why it is here and not in a
 * component.
 */
export function splitClipAt(
  clip: EditorClip,
  atMs: number,
  makeId: () => string,
): readonly [EditorClip, EditorClip] | null {
  const offset = atMs - clip.startMs;
  if (offset < EDITOR_MIN_CLIP_MS) return null;
  if (clip.durationMs - offset < EDITOR_MIN_CLIP_MS) return null;

  const left: EditorClip = { ...clip, durationMs: offset };
  const right: EditorClip = {
    ...clip,
    id: makeId(),
    startMs: clip.startMs + offset,
    durationMs: clip.durationMs - offset,
    trimInMs: (clip.trimInMs ?? 0) + offset,
    // A dissolve belongs to the head of the original clip; the new right-hand
    // piece begins mid-shot and must not re-run it.
    transitionInMs: undefined,
  };
  return [left, right];
}

/**
 * Trim one edge. The left edge moves start and duration together and pulls
 * `trimInMs` with it, so the visible frame under the cursor does not jump —
 * that jump is the classic tell of a trim implemented as "just change start".
 */
export function trimClip(
  clip: EditorClip,
  edge: "start" | "end",
  newEdgeMs: number,
): EditorClip {
  if (edge === "end") {
    const durationMs = Math.max(
      EDITOR_MIN_CLIP_MS,
      Math.round(newEdgeMs - clip.startMs),
    );
    return { ...clip, durationMs };
  }
  const maxStart = clipEndMs(clip) - EDITOR_MIN_CLIP_MS;
  const startMs = Math.max(0, Math.min(Math.round(newEdgeMs), maxStart));
  const delta = startMs - clip.startMs;
  return {
    ...clip,
    startMs,
    durationMs: clip.durationMs - delta,
    trimInMs: Math.max(0, (clip.trimInMs ?? 0) + delta),
  };
}

/* ── Track helpers ────────────────────────────────────────────────────────── */

/** Clips sorted by start. The timeline renders in this order. */
export function sortedClips(track: EditorTrack): readonly EditorClip[] {
  return [...track.clips].sort((a, b) => a.startMs - b.startMs);
}

export function replaceClip(
  project: EditorProject,
  clipId: string,
  next: EditorClip | null,
): EditorProject {
  return {
    ...project,
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: next
        ? track.clips.map((c) => (c.id === clipId ? next : c))
        : track.clips.filter((c) => c.id !== clipId),
    })),
  };
}

export function addClip(
  project: EditorProject,
  trackId: string,
  clip: EditorClip,
): EditorProject {
  return {
    ...project,
    tracks: project.tracks.map((track) =>
      track.id === trackId
        ? { ...track, clips: [...track.clips, normalizeClip(clip)] }
        : track,
    ),
  };
}

/** Move a clip to another track, preserving its timing. Rejects bad kinds. */
export function moveClipToTrack(
  project: EditorProject,
  clipId: string,
  targetTrackId: string,
): EditorProject {
  const found = findClip(project, clipId);
  const target = project.tracks.find((t) => t.id === targetTrackId);
  if (!found || !target) return project;
  if (target.locked) return project;
  if (!trackAccepts(target.kind, found.clip.kind)) return project;
  if (found.track.id === targetTrackId) return project;

  return {
    ...project,
    tracks: project.tracks.map((track) => {
      if (track.id === found.track.id) {
        return { ...track, clips: track.clips.filter((c) => c.id !== clipId) };
      }
      if (track.id === targetTrackId) {
        return { ...track, clips: [...track.clips, found.clip] };
      }
      return track;
    }),
  };
}

/* ── Formatting ───────────────────────────────────────────────────────────── */

/** `mm:ss.cc` — centiseconds, because frame-accurate reads need sub-second. */
export function formatTimecode(ms: number): string {
  const safe = Math.max(0, Math.round(ms));
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const centis = Math.floor((safe % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

/** `mm:ss` for the ruler, where centiseconds would be noise. */
export function formatRulerLabel(ms: number): string {
  const safe = Math.max(0, Math.round(ms));
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Ruler tick spacing that stays legible at any zoom: pick the smallest step
 * from a fixed ladder that still leaves ~64px between labels. A ruler computed
 * as "every 5 seconds" turns into unreadable stripes the moment you zoom in.
 */
const TICK_LADDER_MS = [
  100, 250, 500, 1000, 2000, 5000, 10_000, 15_000, 30_000, 60_000, 120_000,
  300_000, 600_000,
];

export function rulerStepMs(pxPerSec: number, minLabelPx = 64): number {
  for (const step of TICK_LADDER_MS) {
    if (msToPx(step, pxPerSec) >= minLabelPx) return step;
  }
  return TICK_LADDER_MS[TICK_LADDER_MS.length - 1];
}
