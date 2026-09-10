/**
 * `content.video_plan` → `EditorProject`. The handoff that makes an agent's
 * draft editable instead of a finished MP4 to argue with.
 *
 * ==================== WHY THE PLAN, NOT THE RENDER ====================
 * The alternative architecture is: agent renders an MP4, human watches it,
 * human asks for changes, agent re-renders. That loop cannot produce learning
 * evidence, because a finished video has no structure to diff — "shot three is
 * too long" is a sentence, not a measurement. Handing the PLAN to Studio keeps
 * the edit semantic all the way through: the operator moves a clip, and the
 * diff can say the clip moved 2800ms earlier.
 *
 * ==================== DURATION IS NOT THE DIRECTOR'S TO CHOOSE ====================
 * A plan beat carries narration, a visual direction and a caption — and no
 * duration, deliberately. Duration falls out of how long the line takes to say
 * plus the production tail rule, so this module applies that rule rather than
 * inventing timings. A draft whose shape the renderer would disagree with is
 * worse than no draft.
 *
 * ==================== THE SNAPSHOT IS THE POINT ====================
 * What this returns is the CONTROL CONDITION for every later measurement. It is
 * built once, handed to the editor as the session's `generatedProjectSnapshot`,
 * and never written to again.
 */

import {
  EDITOR_DEFAULT_FRAME,
  type EditorClip,
  type EditorProject,
  type EditorTrack,
} from "@/shared/types/video-editor";
import { expectedMasterMs, paceBeat, TRANSITION_MS } from "./pacing";

/** The subset of `content.video_plan` this adapter needs. */
export type VideoPlanBeat = {
  readonly narration: string;
  readonly visualDirection: string;
  readonly caption: string;
  readonly kind?: string | null;
};

export type VideoPlanArtifact = {
  readonly topic: string;
  readonly format: string;
  readonly hook: string;
  readonly objective?: string;
  readonly beats: readonly VideoPlanBeat[];
  readonly cta?: string;
  readonly targetDurationSeconds?: number;
  readonly series?: string;
};

/**
 * Recorded on every generated draft so a later evaluation can ask whether
 * learning actually improved anything.
 *
 * `preferenceKeysApplied` is what the agent SAID it used. It is not verified —
 * verifying it would mean inferring intent from output, which is exactly the
 * kind of guessing this system is built to avoid. What it gives us is a join
 * key: drafts generated with preference set v2 can be compared against drafts
 * generated without it, and the diffs do the rest.
 */
export type DraftGenerationMetadata = {
  readonly agentVersion: string;
  readonly generatedAt: string;
  readonly preferenceSetVersion?: number;
  /** Every key the agent was SHOWN. */
  readonly preferenceKeysSupplied?: readonly string[];
  /** The subset the agent reported acting on. */
  readonly preferenceKeysApplied?: readonly string[];
  readonly sourcePlanId?: string;
};

export type GeneratedDraft = {
  readonly project: EditorProject;
  readonly metadata: DraftGenerationMetadata;
  /** Caption text by clip id, mirroring the loaded-episode shape. */
  readonly captionText: Readonly<Record<string, string>>;
  readonly summary: {
    readonly beats: number;
    readonly rawMs: number;
    readonly expectedMasterMs: number;
    /** True when every duration was estimated rather than measured. */
    readonly durationsEstimated: boolean;
  };
};

/**
 * Which track a scene kind belongs on.
 *
 * `diagram_graphic` goes to GRAPHICS and `code_animation` to VIDEO because the
 * renderer treats them differently — a graphic is a still it holds, an
 * animation is footage it loops — and putting them on the same track would
 * hide a distinction the compositor acts on.
 */
function trackForKind(kind: string | null | undefined): string {
  switch (kind) {
    case "diagram_graphic":
      return "t-graphics";
    case "on_screen_text":
      return "t-text";
    case "code_animation":
    case "b_roll":
    case "screen_recording":
    case "founder_on_camera":
    case "character_dialogue":
    case "narration":
    default:
      return "t-video";
  }
}

function clipKindForScene(kind: string | null | undefined): EditorClip["kind"] {
  switch (kind) {
    case "code_animation":
      return "codeAnimation";
    case "on_screen_text":
      return "text";
    case "diagram_graphic":
      return "slide";
    default:
      return "slide";
  }
}

/** A stable, readable id. Deterministic, so two builds of one plan match. */
function beatId(index: number): string {
  return `beat-${String(index + 1).padStart(2, "0")}`;
}

export function buildDraftFromPlan(
  plan: VideoPlanArtifact,
  metadata: DraftGenerationMetadata,
  opts: { readonly width?: number; readonly height?: number; readonly fps?: number } = {},
): GeneratedDraft {
  const width = opts.width ?? EDITOR_DEFAULT_FRAME.width;
  const height = opts.height ?? EDITOR_DEFAULT_FRAME.height;
  const fps = opts.fps ?? EDITOR_DEFAULT_FRAME.fps;

  const visualByTrack = new Map<string, EditorClip[]>();
  const captionClips: EditorClip[] = [];
  const voiceClips: EditorClip[] = [];
  const captionText: Record<string, string> = {};

  let cursor = 0;
  let estimatedAny = false;

  plan.beats.forEach((beat, index) => {
    const paced = paceBeat({
      narration: beat.narration,
      isFirstBeat: index === 0,
      isFinalBeat: index === plan.beats.length - 1,
    });
    if (!paced.measured) estimatedAny = true;

    const id = beatId(index);
    const trackId = trackForKind(beat.kind);

    const visual: EditorClip = {
      id: `clip-${id}`,
      kind: clipKindForScene(beat.kind),
      beatId: id,
      // The visual direction IS the label. It is what the Director decided
      // this shot should be, and it is the thing an operator is judging when
      // they replace it.
      label: beat.visualDirection.slice(0, 60),
      startMs: cursor,
      durationMs: paced.totalMs,
    };
    const list = visualByTrack.get(trackId) ?? [];
    list.push(visual);
    visualByTrack.set(trackId, list);

    // Narration spans the whole beat; the caption spans only the spoken part,
    // starting after the lead-in. Same relationship the rendered episodes have.
    voiceClips.push({
      id: `vo-${id}`,
      kind: "audio",
      beatId: id,
      label: id,
      startMs: cursor,
      durationMs: paced.totalMs,
      audio: { volume: 1 },
    });

    if (beat.caption.trim().length > 0) {
      const captionId = `cap-${id}`;
      captionText[captionId] = beat.caption;
      captionClips.push({
        id: captionId,
        kind: "caption",
        beatId: id,
        label: beat.caption.slice(0, 40),
        startMs: cursor + paced.leadInMs,
        durationMs: Math.max(paced.speechMs, 400),
        text: { text: beat.caption },
      });
    }

    cursor += paced.totalMs;
  });

  const tracks: EditorTrack[] = [
    { id: "t-video", kind: "video", name: "VIDEO 1", clips: visualByTrack.get("t-video") ?? [] },
    { id: "t-overlay", kind: "overlay", name: "OVERLAY", clips: [] },
    { id: "t-graphics", kind: "graphics", name: "GRAPHICS", clips: visualByTrack.get("t-graphics") ?? [] },
    { id: "t-text", kind: "text", name: "TEXT", clips: visualByTrack.get("t-text") ?? [] },
    { id: "t-caption", kind: "caption", name: "CAPTIONS", clips: captionClips },
    { id: "t-voice", kind: "voice", name: "VOICEOVER", clips: voiceClips },
    { id: "t-music", kind: "music", name: "MUSIC", clips: [] },
    { id: "t-sfx", kind: "sfx", name: "SFX", clips: [] },
  ];

  const visualCount = tracks
    .filter((t) => t.kind === "video" || t.kind === "graphics" || t.kind === "text")
    .reduce((n, t) => n + t.clips.length, 0);

  return {
    project: {
      id: draftProjectId(plan, metadata),
      title: plan.topic,
      width,
      height,
      fps,
      tracks,
      version: 1,
    },
    metadata,
    captionText,
    summary: {
      beats: plan.beats.length,
      rawMs: cursor,
      expectedMasterMs: expectedMasterMs(cursor, visualCount),
      durationsEstimated: estimatedAny,
    },
  };
}

/**
 * A deterministic id from the plan and its generation stamp.
 *
 * Deterministic because the same plan built twice must be the same project —
 * otherwise a re-open would look to the session store like a different draft
 * and the evidence would split across two ids.
 */
export function draftProjectId(
  plan: VideoPlanArtifact,
  metadata: DraftGenerationMetadata,
): string {
  const slug = plan.topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const stamp = metadata.generatedAt.replace(/[^0-9]/g, "").slice(0, 14);
  return `draft-${slug}-${stamp}`;
}

/** One line for the editor's header, so the origin of a draft is never hidden. */
export function describeDraftOrigin(metadata: DraftGenerationMetadata): string {
  const bits = [`Generated by ${metadata.agentVersion}`];
  if (metadata.preferenceSetVersion !== undefined) {
    const count = metadata.preferenceKeysSupplied?.length ?? 0;
    bits.push(
      `with preference set v${metadata.preferenceSetVersion} (${count} preference${count === 1 ? "" : "s"})`,
    );
  } else {
    bits.push("with no learned preferences");
  }
  return bits.join(" ");
}

export { TRANSITION_MS };
