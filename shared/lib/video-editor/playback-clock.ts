/**
 * The editor's one playback clock.
 *
 * ==================== WHY THIS EXISTS — THE BUG IT REPLACES ====================
 * Playback used to advance by accumulating frame deltas onto a React ref:
 *
 *     next = playheadRef.current + delta;  dispatch({ type: "seek", ms: next })
 *
 * with `playheadRef` synced from reducer state in a passive `useEffect`. Passive
 * effects flush AFTER paint, so whenever a commit landed late in a frame the
 * next animation frame read the ref before the effect had updated it, and added
 * its delta to a value one frame old. The playhead stepped BACKWARDS by a frame,
 * every other frame, and ran at half speed; after a long frame it jumped forward
 * by the long delta and then back again. Narration plays at wall speed, so the
 * half-speed clock drifted past the audio tolerance every ~300ms and the audio
 * was reseeked — the audible skipping. Measured on compressor-01 before this
 * change: clock rate 0.51, 988 backward steps and 1083 audio reseeks in 40s.
 *
 * Selecting a clip and opening the photo library (the only way to add a
 * photograph) made every frame's render roughly twice as expensive, which is why
 * the operator first noticed it right after adding a picture.
 *
 * ==================== THE RULE NOW ====================
 * Time is DERIVED, never accumulated:
 *
 *     time = anchorMedia + (now() − anchorWall) × rate
 *
 * `now()` is monotonic, so during uninterrupted playback time is monotonic by
 * construction — there is no stale value that could be read, because there is
 * no running total. The anchors move only on an explicit transport action
 * (play, pause, seek, rate change), and those are the only ways time can go
 * backwards.
 *
 * The clock owns its own animation-frame loop and emits ONE time per frame to
 * every subscriber, so the playhead, the timecode, the canvas and the audio all
 * see the same instant in the same frame. None of them can set time; they read
 * it. React is not on this path at all.
 *
 * Pure TypeScript with an injectable `now` and frame scheduler, so the Node
 * verify suite drives it with a fake clock.
 */

export type FrameListener = (timeMs: number) => void;

/**
 * Coarse transport state, for `useSyncExternalStore`. It deliberately does NOT
 * contain the time: a snapshot that changed every frame would re-render every
 * subscriber every frame, which is the exact failure this module removes.
 */
export type PlaybackSnapshot = {
  readonly playing: boolean;
  readonly rate: number;
  readonly durationMs: number;
};

export const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;

type FrameScheduler = {
  readonly request: (cb: () => void) => number;
  readonly cancel: (handle: number) => void;
};

function defaultScheduler(): FrameScheduler {
  if (typeof requestAnimationFrame === "function") {
    return {
      request: (cb) => requestAnimationFrame(() => cb()),
      cancel: (h) => cancelAnimationFrame(h),
    };
  }
  return {
    request: (cb) => setTimeout(cb, 16) as unknown as number,
    cancel: (h) => clearTimeout(h),
  };
}

function defaultNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export class PlaybackClock {
  private readonly now: () => number;
  private readonly scheduler: FrameScheduler;
  private anchorWall = 0;
  private anchorMedia = 0;
  private playing = false;
  private rate = 1;
  private durationMs: number;
  private frameHandle: number | null = null;
  private readonly frameListeners = new Set<FrameListener>();
  private readonly stateListeners = new Set<() => void>();
  private snapshot: PlaybackSnapshot;
  /** Last value handed to frame listeners — for diagnostics and tests. */
  private lastEmitted = 0;

  constructor(opts: {
    readonly durationMs: number;
    readonly now?: () => number;
    readonly scheduler?: FrameScheduler;
  }) {
    this.durationMs = Math.max(0, opts.durationMs);
    this.now = opts.now ?? defaultNow;
    this.scheduler = opts.scheduler ?? defaultScheduler();
    this.snapshot = { playing: false, rate: 1, durationMs: this.durationMs };
  }

  /* ── Reading ─────────────────────────────────────────────────────────── */

  /** The authoritative editor time, in ms. */
  getTime(): number {
    if (!this.playing) return this.anchorMedia;
    const t = this.anchorMedia + (this.now() - this.anchorWall) * this.rate;
    return t > this.durationMs ? this.durationMs : t;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  getRate(): number {
    return this.rate;
  }

  getDuration(): number {
    return this.durationMs;
  }

  getLastEmitted(): number {
    return this.lastEmitted;
  }

  /** Stable identity — safe to hand to `useSyncExternalStore`. */
  readonly getSnapshot = (): PlaybackSnapshot => this.snapshot;

  /* ── Subscriptions ───────────────────────────────────────────────────── */

  /** Called once per animation frame while playing, and once per transport action. */
  readonly subscribeFrame = (listener: FrameListener): (() => void) => {
    this.frameListeners.add(listener);
    return () => {
      this.frameListeners.delete(listener);
    };
  };

  /** Called when playing / rate / duration change. Never per frame. */
  readonly subscribeState = (listener: () => void): (() => void) => {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  };

  /* ── Transport ───────────────────────────────────────────────────────── */

  play(): void {
    if (this.playing || this.durationMs <= 0) return;
    // Pressing play at the end starts again from the top, as every player does.
    if (this.anchorMedia >= this.durationMs - 1) this.anchorMedia = 0;
    this.anchorWall = this.now();
    this.playing = true;
    this.publishState();
    this.emit(this.anchorMedia);
    this.startLoop();
  }

  pause(): void {
    if (!this.playing) return;
    this.anchorMedia = this.getTime();
    this.playing = false;
    this.stopLoop();
    this.publishState();
    this.emit(this.anchorMedia);
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  /**
   * Reposition. Keeps playing if it was playing — scrubbing during playback
   * continues from the new point, which is what an operator reviewing a cut
   * expects.
   */
  seek(ms: number): void {
    const target = this.clamp(ms);
    this.anchorMedia = target;
    this.anchorWall = this.now();
    this.emit(target);
  }

  /** Step by a signed amount, pausing first — a frame step during playback is a stop. */
  step(deltaMs: number): void {
    if (this.playing) this.pause();
    this.seek(this.anchorMedia + deltaMs);
  }

  setRate(rate: number): void {
    const next = Number.isFinite(rate) && rate > 0 ? rate : 1;
    if (next === this.rate) return;
    // Re-anchor at the current instant so the change of speed is not also a
    // jump in position.
    if (this.playing) {
      this.anchorMedia = this.getTime();
      this.anchorWall = this.now();
    }
    this.rate = next;
    this.publishState();
  }

  /** The project got longer or shorter. Never moves time unless it must. */
  setDuration(ms: number): void {
    const next = Math.max(0, ms);
    if (next === this.durationMs) return;
    this.durationMs = next;
    if (!this.playing && this.anchorMedia > next) {
      this.anchorMedia = next;
      this.emit(next);
    }
    this.publishState();
  }

  /**
   * One frame. Exposed for tests; the clock calls it itself while playing.
   * Reaching the end parks the playhead there and stops.
   */
  tick(): void {
    if (!this.playing) return;
    const t = this.getTime();
    if (t >= this.durationMs) {
      this.anchorMedia = this.durationMs;
      this.playing = false;
      this.stopLoop();
      this.publishState();
      this.emit(this.durationMs);
      return;
    }
    this.emit(t);
  }

  /** Stop the loop and drop every listener. For unmount. */
  dispose(): void {
    this.stopLoop();
    this.playing = false;
    this.frameListeners.clear();
    this.stateListeners.clear();
  }

  /* ── Internals ───────────────────────────────────────────────────────── */

  private clamp(ms: number): number {
    if (!Number.isFinite(ms)) return 0;
    return Math.max(0, Math.min(ms, this.durationMs));
  }

  private startLoop(): void {
    if (this.frameHandle !== null) return;
    const loop = () => {
      this.frameHandle = null;
      if (!this.playing) return;
      this.tick();
      if (this.playing) this.frameHandle = this.scheduler.request(loop);
    };
    this.frameHandle = this.scheduler.request(loop);
  }

  private stopLoop(): void {
    if (this.frameHandle === null) return;
    this.scheduler.cancel(this.frameHandle);
    this.frameHandle = null;
  }

  private emit(t: number): void {
    this.lastEmitted = t;
    for (const listener of this.frameListeners) {
      // One broken subscriber must not stop the clock for the others — a
      // failing waveform should not also silence the narration.
      try {
        listener(t);
      } catch (error) {
        if (typeof console !== "undefined") console.error("[playback-clock] listener failed", error);
      }
    }
  }

  private publishState(): void {
    this.snapshot = {
      playing: this.playing,
      rate: this.rate,
      durationMs: this.durationMs,
    };
    for (const listener of this.stateListeners) listener();
  }
}
