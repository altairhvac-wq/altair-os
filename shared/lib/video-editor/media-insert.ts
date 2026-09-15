/**
 * Putting a photograph on the timeline, safely.
 *
 * ==================== WHY THIS IS A MODULE AND NOT A CLICK HANDLER ====================
 * "Adding a picture can break the editor" was the operator's report. The way an
 * insert breaks an editor is never the picture: it is a half-applied change —
 * a clip that now names an asset that does not exist, a kind its track will not
 * accept, a new clip laid on top of another one, or a duration quietly
 * recalculated because the code that inserts also "tidies up".
 *
 * So an insert is decided BEFORE anything is dispatched. These functions take
 * the project and return either a complete, valid change or a reason they will
 * not make one. Nothing here mutates, so there is no half-applied state to roll
 * back: the caller either gets a patch it can dispatch or an error it can show.
 *
 * ==================== THE RULE THE TESTS ENFORCE ====================
 * Replacing an asset changes the asset and nothing else. Not the start, not the
 * duration, not the track, not the transition, not any other clip. The
 * compressor episode's timings were measured from real narration; an insert
 * that "helpfully" retimed a shot would silently desynchronise the film from
 * the voice that was recorded for it.
 */

import {
  EDITOR_MIN_CLIP_MS,
  clipEndMs,
  trackAccepts,
  type EditorClip,
  type EditorProject,
  type EditorTrack,
} from "@/shared/types/video-editor";

/** The catalog shape this needs — a subset of the library panel's. */
export type InsertableAsset = {
  readonly assetId: string;
  readonly thumbnailUrl: string;
  readonly variants?: readonly {
    readonly aspectRatio: string;
    readonly thumbnailUrl: string;
  }[];
};

export type InsertFailure = { readonly ok: false; readonly reason: string };

export type AssetResolution = {
  readonly ok: true;
  readonly assetId: string;
  /** The preview URL for this project's aspect ratio. */
  readonly url: string;
};

/**
 * Is this asset usable, and which file would the preview show?
 *
 * Checked before the edit rather than after, because an asset that resolves to
 * nothing produces a clip pointing at a picture that does not exist — which
 * survives the autosave, the reload and the render job, and only fails on the
 * laptop an hour later.
 */
export function resolveAsset(
  assets: readonly InsertableAsset[] | null,
  assetId: string,
  opts: { readonly portrait: boolean },
): AssetResolution | InsertFailure {
  if (!assets) {
    return { ok: false, reason: "The photo library has not finished loading." };
  }
  const asset = assets.find((a) => a.assetId === assetId);
  if (!asset) {
    return { ok: false, reason: `No asset called ${assetId} in the library.` };
  }
  const portrait = asset.variants?.find((v) => v.aspectRatio === "9:16");
  const url = opts.portrait && portrait ? portrait.thumbnailUrl : asset.thumbnailUrl;
  if (!url) {
    return {
      ok: false,
      reason: `${assetId} has no exported preview on this machine. Run the library preview export.`,
    };
  }
  return { ok: true, assetId, url };
}

/**
 * The patch that puts an asset on an existing clip.
 *
 * A card becomes a photograph the moment it is given one, so the kind changes
 * with it — leaving it `slide` would send the compiler looking for a rendered
 * card frame that no longer describes the clip. A clip on the TEXT track keeps
 * its kind, because that track accepts nothing else.
 *
 * Timing is deliberately absent from the returned patch. That absence is the
 * contract.
 */
export function assetPatchFor(
  clip: EditorClip,
  track: EditorTrack,
  assetId: string,
): { readonly ok: true; readonly patch: Partial<EditorClip> } | InsertFailure {
  if (track.locked) {
    return { ok: false, reason: `${track.name} is locked.` };
  }
  if (track.kind === "caption" || track.kind === "voice" || track.kind === "music" || track.kind === "sfx") {
    return {
      ok: false,
      reason: `A photograph cannot go on ${track.name}.`,
    };
  }
  if (clip.kind === "video") {
    // Replacing a moving asset with a still would change what the clip IS, and
    // its trimIn would then point into a picture with no timeline.
    return { ok: false, reason: "This clip is a video; swapping in a still needs a new clip." };
  }
  const becomesImage = track.kind !== "text";
  if (becomesImage && !trackAccepts(track.kind, "image")) {
    return { ok: false, reason: `${track.name} does not accept images.` };
  }
  return {
    ok: true,
    patch: becomesImage ? { assetId, kind: "image" } : { assetId },
  };
}

export type NewClipPlacement = {
  readonly ok: true;
  readonly trackId: string;
  readonly clip: EditorClip;
};

/** How long a photograph lasts when nothing says otherwise. */
export const DEFAULT_IMAGE_CLIP_MS = 4000;

/**
 * Where a NEW photograph goes when the operator adds one at the playhead.
 *
 * It lands on the OVERLAY track, above the film, for one reason: every other
 * placement changes existing timing. Dropping it on the video track either
 * overlaps the shot already there (two pictures, undefined order) or pushes
 * everything after it later, which moves every cut away from the narration
 * that was measured against it. On the overlay track it covers the film for
 * its own length and nothing else in the project moves.
 *
 * It is clipped to the gap actually available, and refused rather than
 * squeezed into a sliver.
 */
export function placeNewImageClip(
  project: EditorProject,
  opts: {
    readonly assetId: string;
    readonly label: string;
    readonly atMs: number;
    readonly id: string;
    readonly durationMs?: number;
    readonly trackId?: string;
  },
): NewClipPlacement | InsertFailure {
  const track =
    project.tracks.find((t) => t.id === opts.trackId) ??
    project.tracks.find((t) => t.kind === "overlay") ??
    null;
  if (!track) {
    return { ok: false, reason: "This project has no overlay track to add to." };
  }
  if (track.locked) return { ok: false, reason: `${track.name} is locked.` };
  if (!trackAccepts(track.kind, "image")) {
    return { ok: false, reason: `${track.name} does not accept images.` };
  }

  const startMs = Math.max(0, Math.round(opts.atMs));
  const wanted = Math.max(
    EDITOR_MIN_CLIP_MS,
    Math.round(opts.durationMs ?? DEFAULT_IMAGE_CLIP_MS),
  );

  // The first clip that begins after the playhead bounds this one.
  let limit = startMs + wanted;
  for (const existing of track.clips) {
    if (existing.startMs >= startMs && existing.startMs < limit) {
      limit = existing.startMs;
    }
    // Landing inside a clip that is already here is an overlap, not an insert.
    if (startMs >= existing.startMs && startMs < clipEndMs(existing)) {
      return {
        ok: false,
        reason: `${track.name} already has "${existing.label}" at the playhead. Move the playhead, or replace that clip's asset instead.`,
      };
    }
  }

  const durationMs = limit - startMs;
  if (durationMs < EDITOR_MIN_CLIP_MS) {
    return {
      ok: false,
      reason: `Only ${String(durationMs)}ms of room on ${track.name} at the playhead.`,
    };
  }

  return {
    ok: true,
    trackId: track.id,
    clip: {
      id: opts.id,
      kind: "image",
      assetId: opts.assetId,
      label: opts.label,
      startMs,
      durationMs,
    },
  };
}

/**
 * Everything that must still be true after an insert or a replace.
 *
 * Used by the media stress test, and cheap enough to be worth running after a
 * mutation in development: a corrupted timeline that is only visible three
 * edits later is the expensive kind.
 */
export function timelineProblems(project: EditorProject): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const trackIds = new Set<string>();

  for (const track of project.tracks) {
    if (trackIds.has(track.id)) problems.push(`duplicate track id ${track.id}`);
    trackIds.add(track.id);

    const sorted = [...track.clips].sort((a, b) => a.startMs - b.startMs);
    let previous: EditorClip | null = null;
    for (const clip of sorted) {
      if (ids.has(clip.id)) problems.push(`duplicate clip id ${clip.id}`);
      ids.add(clip.id);
      if (!Number.isFinite(clip.startMs) || !Number.isFinite(clip.durationMs)) {
        problems.push(`${clip.id} has a non-finite time`);
      }
      if (clip.durationMs <= 0) problems.push(`${clip.id} has no duration`);
      if (clip.startMs < 0) problems.push(`${clip.id} starts before zero`);
      if (!trackAccepts(track.kind, clip.kind)) {
        problems.push(`${clip.id} (${clip.kind}) is on ${track.name}, which does not accept it`);
      }
      if (previous && clip.startMs < clipEndMs(previous)) {
        problems.push(`${previous.id} and ${clip.id} overlap on ${track.name}`);
      }
      previous = clip;
    }
  }
  return problems;
}
