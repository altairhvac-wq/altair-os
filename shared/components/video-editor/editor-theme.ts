/**
 * The editor's palette — authored once, scoped to the editor root.
 *
 * ==================== WHY THIS IS NOT IN globals.css ====================
 * `app/globals.css` states that it is the only place product colour is
 * authored, and that rule is what keeps the CRM from drifting. This surface is
 * deliberately not the CRM: a creative workspace has to be near-black so the
 * footage is the brightest thing on screen, and putting a dark creative ramp
 * into the product token file would offer the rest of the app a second palette
 * to drift toward.
 *
 * So the ramp lives here, as custom properties applied to ONE element. Every
 * component below reads `var(--ve-*)` and authors no colour of its own. Nothing
 * outside the editor root can see these, and deleting this file deletes the
 * entire palette — which is the property that makes it safe.
 *
 * The one shared value is the brand accent. It is quoted rather than imported
 * because the editor must render identically whether or not a Design Lab theme
 * is live: an operator's selection outline changing colour because someone
 * edited company branding is a bug, not a feature.
 */

/**
 * Altair brass, the single accent. Used for selection, the playhead, and the
 * primary action — and nothing else. A dark editor that accents everything
 * reads as a game UI.
 */
export const EDITOR_ACCENT = "#d4af37";

export const editorThemeVars: React.CSSProperties = {
  // ── Surfaces, darkest to lightest ──────────────────────────────────────
  /** The stage behind the video. The darkest thing on screen, by design. */
  "--ve-stage": "#0a0a0b",
  /** Application background — panels sit on this. */
  "--ve-bg": "#121316",
  /** Panel fill (tool rail, browser, inspector, timeline). */
  "--ve-panel": "#181a1e",
  /** Raised fill — inputs, clip bodies, hovered rows. */
  "--ve-raised": "#212429",
  /** Highest fill — active tool, pressed control. */
  "--ve-high": "#2c3037",

  // ── Lines ──────────────────────────────────────────────────────────────
  /** 1px structural boundary. Deliberately close to the panel fill: at this
   *  density a visible border on every element reads as a spreadsheet. */
  "--ve-line": "#26292f",
  /** A boundary that needs to be found — panel edges, ruler baseline. */
  "--ve-line-strong": "#343841",

  // ── Text ───────────────────────────────────────────────────────────────
  "--ve-text": "#e8e9ec",
  "--ve-text-dim": "#9a9ea7",
  "--ve-text-faint": "#6b6f78",

  // ── Accent ─────────────────────────────────────────────────────────────
  "--ve-accent": EDITOR_ACCENT,
  "--ve-accent-dim": "rgba(212, 175, 55, 0.35)",
  "--ve-accent-wash": "rgba(212, 175, 55, 0.10)",
  "--ve-on-accent": "#141208",

  // ── Track identity ─────────────────────────────────────────────────────
  /**
   * One hue per track family, at low saturation. This is the only place the
   * editor uses colour to carry meaning rather than state, and it is what lets
   * you read a dense timeline at a glance without labels: picture is blue,
   * words are violet, sound is green.
   */
  "--ve-clip-video": "#2f4f63",
  "--ve-clip-video-edge": "#4a7d9c",
  "--ve-clip-graphics": "#3d4a6b",
  "--ve-clip-graphics-edge": "#5f74a8",
  "--ve-clip-text": "#4a3a63",
  "--ve-clip-text-edge": "#7a5f9c",
  "--ve-clip-caption": "#3b3a52",
  "--ve-clip-caption-edge": "#635f88",
  "--ve-clip-voice": "#2f5245",
  "--ve-clip-voice-edge": "#4d8a71",
  "--ve-clip-music": "#4a4230",
  "--ve-clip-music-edge": "#8a7845",
  "--ve-clip-sfx": "#523a3a",
  "--ve-clip-sfx-edge": "#8a5f5f",
} as React.CSSProperties;

/** Per-track-kind clip fill + edge, resolved from the vars above. */
export const CLIP_COLOR_VAR: Record<string, { fill: string; edge: string }> = {
  video: { fill: "var(--ve-clip-video)", edge: "var(--ve-clip-video-edge)" },
  overlay: { fill: "var(--ve-clip-video)", edge: "var(--ve-clip-video-edge)" },
  graphics: {
    fill: "var(--ve-clip-graphics)",
    edge: "var(--ve-clip-graphics-edge)",
  },
  text: { fill: "var(--ve-clip-text)", edge: "var(--ve-clip-text-edge)" },
  caption: {
    fill: "var(--ve-clip-caption)",
    edge: "var(--ve-clip-caption-edge)",
  },
  voice: { fill: "var(--ve-clip-voice)", edge: "var(--ve-clip-voice-edge)" },
  music: { fill: "var(--ve-clip-music)", edge: "var(--ve-clip-music-edge)" },
  sfx: { fill: "var(--ve-clip-sfx)", edge: "var(--ve-clip-sfx-edge)" },
};

/** Timeline geometry. Shared so the ruler, tracks and playhead cannot disagree. */
export const TIMELINE_GEOMETRY = {
  /** Track header column. Wide enough for "VOICEOVER" plus two toggles. */
  headerWidth: 132,
  /** Ruler strip height. */
  rulerHeight: 26,
  /** Default track lane height. */
  trackHeight: 42,
  /** Audio lanes are taller — a waveform needs vertical room to be readable. */
  audioTrackHeight: 52,
  /** Grab zone on each clip edge for trimming. Below ~6px this is unhittable. */
  trimHandleWidth: 8,
  /** Snap threshold, in PIXELS — converted to ms per zoom so it feels constant. */
  snapPx: 8,
} as const;
