/**
 * Short-form technical animation: the contract.
 *
 * Two jobs, deliberately kept in one file:
 *
 * 1. The SCENE contract — enough of a description of a rendered Short that the
 *    Altair Studio editor can one day represent it as editable clips without
 *    the renderer having to be rewritten. The render engine under
 *    `scripts/shorts/` already emits exactly these shapes.
 * 2. The METADATA record — what we keep about every Short we produce, so that
 *    once the videos are posted we can ask which visual structures actually
 *    performed. Platform numbers are a SEPARATE optional block: nothing in this
 *    repository may invent them.
 */

/** Bumped whenever the look changes in a way that would confound comparison. */
export type VisualStyleVersion = "ALT-HVAC-CUTAWAY-V1";

export type MechanismType =
  | "reciprocating"
  | "scroll"
  | "rotary"
  | "screw"
  | "centrifugal"
  // The first non-compressor stage: evaporator coil + suction line + frost
  // (the evaporator_process visual domain).
  | "evaporator"
  // TXV section + sensing-bulb control loop (metering_device_process).
  | "txv"
  // Superheat measurement tableau: clamp, port, gauge, subtracting readout
  // (diagnostic_measurement).
  | "superheat";

export type CameraMotion = "push" | "pull" | "drift" | "hold" | "track";

export type VisualMode =
  | "cutaway"
  | "particles"
  | "gauges"
  | "callouts"
  | "chips"
  | "arrows"
  | "stats";

export type HookType =
  | "question" // "What actually happens inside a compressor?"
  | "claim"
  | "misconception"
  | "demonstration";

export type TakeawayType = "principle" | "rule-of-thumb" | "diagnostic-cue";

/* ------------------------------------------------------------------ scene */

export interface ShortShot {
  id: string;
  /** Milliseconds. */
  durationMs: number;
  cameraMotion: CameraMotion;
  /** Mechanism phase the shot is showing, in the mechanism's own vocabulary. */
  mechanismPhase: string;
}

/**
 * One overlay, in the form the editor would need to place it on a track.
 * Times are absolute milliseconds from the start of the Short.
 */
export interface ShortOverlay {
  kind: "hook" | "caption" | "callout" | "chip" | "gauges" | "stat" | "arrow" | "eyebrow";
  atMs: number;
  durationMs: number;
  /** Whatever text the overlay carries, for search and caption-density maths. */
  text?: string;
  /** True when the overlay reads live mechanism state rather than fixed text. */
  boundToState?: boolean;
}

export interface NarrationLine {
  atMs: number;
  text: string;
  /** The visual event this line is riding. A line without one is decoration. */
  visual: string;
}

/**
 * A system-topology mechanism's attestation of its own geometry: what the
 * scene DECLARES about flow order and connections, and what the renderer
 * MEASURED from the geometry it actually built (every `measured` boolean must
 * be true, enforced at module load). Emitted by mechanisms that model a
 * refrigerant-circuit stage rather than a compressor interior — the
 * evaporator scene first. Technical QA verifies this block from scene.json.
 */
export interface SceneTopology {
  /** Visual domain id, e.g. "evaporator_process". */
  domain: string;
  declared: {
    /** Station ids in refrigerant flow order. */
    flowOrder: string[];
    [key: string]: unknown;
  };
  /** Geometry facts measured from the built flow path. */
  measured: Record<string, boolean | number | string>;
}

export interface ShortScene {
  shortId: string;
  title: string;
  mechanismType: MechanismType;
  visualStyleVersion: VisualStyleVersion;
  aspect: "9:16";
  width: 1080;
  height: 1920;
  fps: number;
  runtimeMs: number;
  shots: ShortShot[];
  overlays: ShortOverlay[];
  narration: NarrationLine[];
  /** Present when the mechanism models system topology (see SceneTopology). */
  topology?: SceneTopology;
}

/* --------------------------------------------------------------- metadata */

/**
 * Derived structural measurements. Every field here is COMPUTED from the scene,
 * never typed by hand, so two Shorts can be compared without trusting anyone's
 * description of them.
 */
export interface ShortStructure {
  sceneCount: number;
  numberOfCuts: number;
  averageShotLengthMs: number;
  /**
   * Average number of words visible at any instant across the runtime.
   * Not words-per-second-authored: this measures clutter, which is the thing
   * that decides whether a Short reads as a video or as a poster.
   */
  captionDensity: number;
  /** Total distinct words authored across all overlays, for reference. */
  totalOnScreenWords: number;
  cameraMotionTypes: CameraMotion[];
  visualModesUsed: VisualMode[];
  particleAnimationUsed: boolean;
  gaugeAnimationUsed: boolean;
}

/**
 * Platform performance. Absent until a real export from a real platform is
 * attached. There is no default, no zero, and no placeholder — an absent block
 * means "not measured", which is a different claim from "measured as nothing".
 */
export interface ShortPerformance {
  platform: "youtube-shorts" | "tiktok" | "instagram-reels";
  /** ISO date the numbers were pulled. */
  observedOn: string;
  views?: number;
  engagedViews?: number;
  averageViewDurationMs?: number;
  averagePercentageViewed?: number;
  rewatches?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  subscribersGained?: number;
  clicks?: number;
}

export interface ShortRecord {
  shortId: string;
  topic: string;
  hook: string;
  hookType: HookType;
  takeaway: string;
  takeawayType: TakeawayType;
  runtimeMs: number;
  visualStyleVersion: VisualStyleVersion;
  mechanismType: MechanismType;
  renderVersion: string;
  renderedAt: string;
  structure: ShortStructure;
  generationNotes: string[];
  /** Populated only from a real platform export. */
  performance?: ShortPerformance[];
}
