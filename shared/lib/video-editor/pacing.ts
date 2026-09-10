/**
 * The production pacing rule, in one place.
 *
 * ==================== THIS IS A MIRROR, NOT A DESIGN ====================
 * Every number here is copied from `render-episode.mjs:63-83` in
 * AltairDemoTool, which is the code that actually decides how long a beat is
 * on screen. It is mirrored rather than imported because that file is a Node
 * script on the production laptop and this is a browser bundle — but a mirror
 * that drifts is worse than no mirror, so the source lines are named and
 * `verify-agent-learning-loop.mjs` asserts the constants still match.
 *
 * ==================== WHY A GENERATED DRAFT NEEDS IT ====================
 * A `content.video_plan` beat carries narration, a visual direction and a
 * caption — and no duration. Duration is not the Director's to choose: it
 * falls out of how long the line takes to say plus a tail. So a draft opened in
 * Studio has to apply the same rule, or the operator would be editing a
 * timeline whose shape the renderer is about to disagree with.
 *
 * ==================== ESTIMATES ARE LABELLED ====================
 * For a plan with no rendered audio the speech length is ESTIMATED from word
 * count. `DRAFT_ESTIMATE_WPM` is the median measured across the two rendered
 * HVAC episodes, not a guess — but it is still an estimate, and the draft says
 * so rather than presenting estimated timings as measured ones.
 */

/** render-episode.mjs: `let tail = 700`. */
export const BASE_TAIL_MS = 700;
/** render-episode.mjs: `if (wpm > 230) tail += 900; else if (wpm > 200) tail += 500;` */
export const FAST_WPM_THRESHOLD = 230;
export const FAST_WPM_BONUS_MS = 900;
export const BRISK_WPM_THRESHOLD = 200;
export const BRISK_WPM_BONUS_MS = 500;
/** render-episode.mjs: `if (beat.id.endsWith('-title')) tail += 400`. */
export const SECTION_CARD_BONUS_MS = 400;
/** render-episode.mjs: `if (beat.id === LAST_BEAT_ID) tail += 2400`. */
export const FINAL_BEAT_BONUS_MS = 2400;
/** render-episode.mjs: 700ms lead-in, on the FIRST beat only. */
export const LEAD_IN_MS = 700;
/** render-episode.mjs: `TRANSITION_MS = 260`. */
export const TRANSITION_MS = 260;

/**
 * Measured median across the rendered HVAC episodes (EP01: 19 beats, EP04: 17).
 * Piper at the lessac-medium voice lands between roughly 150 and 220 wpm
 * depending on sentence shape; 185 is the middle of what was actually observed.
 */
export const DRAFT_ESTIMATE_WPM = 185;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

/** Estimated speech length for a line nobody has narrated yet. */
export function estimateSpeechMs(
  text: string,
  wpm: number = DRAFT_ESTIMATE_WPM,
): number {
  const words = countWords(text);
  if (words === 0) return 0;
  return Math.round((words / wpm) * 60_000);
}

/**
 * The tail after a line stops, exactly as the renderer computes it.
 *
 * `wpm` is the line's OWN rate, which for an estimate is whatever rate was
 * assumed — so an estimated beat never trips the fast-speech bonuses, and that
 * is correct: the bonuses exist to give a listener room after a rushed line,
 * and nothing has been rushed yet.
 */
export function tailMs(opts: {
  readonly wpm: number;
  readonly isSectionCard?: boolean;
  readonly isFinalBeat?: boolean;
}): number {
  let tail = BASE_TAIL_MS;
  if (opts.wpm > FAST_WPM_THRESHOLD) tail += FAST_WPM_BONUS_MS;
  else if (opts.wpm > BRISK_WPM_THRESHOLD) tail += BRISK_WPM_BONUS_MS;
  if (opts.isSectionCard) tail += SECTION_CARD_BONUS_MS;
  if (opts.isFinalBeat) tail += FINAL_BEAT_BONUS_MS;
  return tail;
}

export type PacedBeat = {
  readonly leadInMs: number;
  readonly speechMs: number;
  readonly tailMs: number;
  readonly totalMs: number;
  readonly words: number;
  readonly wpm: number;
  /** False when speech length was estimated rather than measured. */
  readonly measured: boolean;
};

/** Applies the full rule to one beat. */
export function paceBeat(opts: {
  readonly narration: string;
  readonly isFirstBeat: boolean;
  readonly isFinalBeat: boolean;
  readonly isSectionCard?: boolean;
  /** Supply when the line has actually been narrated. */
  readonly measuredSpeechMs?: number;
  readonly wpm?: number;
}): PacedBeat {
  const words = countWords(opts.narration);
  const measured = typeof opts.measuredSpeechMs === "number";
  const speechMs = measured
    ? (opts.measuredSpeechMs as number)
    : estimateSpeechMs(opts.narration, opts.wpm ?? DRAFT_ESTIMATE_WPM);
  const wpm =
    speechMs > 0 ? Math.round(words / (speechMs / 60_000)) : DRAFT_ESTIMATE_WPM;

  const leadInMs = opts.isFirstBeat ? LEAD_IN_MS : 0;
  const tail = tailMs({
    wpm,
    isSectionCard: opts.isSectionCard,
    isFinalBeat: opts.isFinalBeat,
  });

  return {
    leadInMs,
    speechMs,
    tailMs: tail,
    totalMs: leadInMs + speechMs + tail,
    words,
    wpm,
    measured,
  };
}

/**
 * What the master will actually run to, after crossfades eat one transition
 * per cut. Surfacing this on a draft stops an operator from planning to a
 * timeline length the render will not produce.
 */
export function expectedMasterMs(rawMs: number, entryCount: number): number {
  if (entryCount <= 1) return rawMs;
  return rawMs - (entryCount - 1) * TRANSITION_MS;
}
