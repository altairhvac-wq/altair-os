/**
 * ALT-HVAC-CUTAWAY-V1 — the visual constitution for Altair HVAC Shorts.
 *
 * Every Short reads its colours, type and spacing from here. When the style
 * version changes, this file changes and the version string changes with it,
 * so a metadata record can always be traced back to the exact look it shipped.
 */
export const STYLE_VERSION = "ALT-HVAC-CUTAWAY-V1";

export const CANVAS = { w: 1080, h: 1920, fps: 30 };

/** Phone-safe area. Platform chrome eats the bottom; captions eat the top. */
export const SAFE = { left: 64, right: 64, top: 150, bottom: 300 };

export const C = {
  bgDeep: "#050F1A",
  bgTop: "#071421",
  bgBottom: "#0A1628",
  grid: "rgba(58,132,190,0.055)",

  // Refrigerant state colours. Cool -> hot is a continuous ramp, not 3 swatches.
  cool: "#2FA8FF",
  coolBright: "#79D2FF",
  coolDeep: "#0A63C8",
  warm: "#8E6BE8",
  hot: "#FF7A2F",
  hotBright: "#FFC04D",
  hotDeep: "#C42A16",

  // Machine.
  steelHi: "#D7E2EC",
  steel: "#8C9BAA",
  steelMid: "#5A6B7C",
  steelLo: "#22303E",
  ironHi: "#41505F",
  iron: "#1E2A36",
  ironLo: "#0D151D",
  copper: "#C07A45",
  copperHi: "#E8A972",

  // HUD.
  hud: "#0B1C2C",
  hudLine: "rgba(79,176,255,0.42)",
  hudLineHot: "rgba(255,122,47,0.52)",
  text: "#EAF3FB",
  textDim: "#93AEC6",
  accent: "#4FB0FF",
};

export const F = {
  /** One family, three weights. Consistency is the point. */
  hook: (px) => `800 ${px}px "Segoe UI", "Inter", system-ui, sans-serif`,
  label: (px) => `650 ${px}px "Segoe UI", "Inter", system-ui, sans-serif`,
  body: (px) => `450 ${px}px "Segoe UI", "Inter", system-ui, sans-serif`,
  mono: (px) => `700 ${px}px "Consolas", "SF Mono", ui-monospace, monospace`,
  micro: (px) => `700 ${px}px "Segoe UI", "Inter", system-ui, sans-serif`,
};

/** Easings. Nothing in this system moves linearly except the crankshaft. */
export const ease = {
  linear: (t) => t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -9 * t)),
};

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, v) => clamp((v - a) / (b - a || 1), 0, 1);
export const smooth = (a, b, v) => {
  const t = inv(a, b, v);
  return t * t * (3 - 2 * t);
};

/** Parse #rrggbb once, mix in linear-ish space. */
/** Accepts "#rrggbb" and the "rgb(r,g,b)" that mix() hands back, so a mixed
 *  colour can be fed straight into rgba() without a round trip through hex. */
const hex = (h) => {
  if (h[0] === "#") {
    return [
      parseInt(h.slice(1, 3), 16),
      parseInt(h.slice(3, 5), 16),
      parseInt(h.slice(5, 7), 16),
    ];
  }
  const m = h.match(/-?\d+(\.\d+)?/g) ?? [0, 0, 0];
  return [Number(m[0]), Number(m[1]), Number(m[2])];
};
export function mix(a, b, t) {
  const A = hex(a);
  const B = hex(b);
  const k = clamp(t, 0, 1);
  return `rgb(${Math.round(lerp(A[0], B[0], k))},${Math.round(lerp(A[1], B[1], k))},${Math.round(
    lerp(A[2], B[2], k),
  )})`;
}
export function rgba(h, a) {
  const A = hex(h);
  return `rgba(${A[0]},${A[1]},${A[2]},${a})`;
}

/**
 * The single most important function in the style: refrigerant temperature in
 * degrees C -> colour. Cool cyan, through violet as it is worked on, to orange
 * at discharge. Every particle, pipe glow and gauge needle uses this one ramp,
 * which is why the frames read as one system.
 */
export function refrigerantColor(tempC) {
  const t = inv(10, 90, tempC);
  if (t < 0.45) return mix(C.cool, C.warm, t / 0.45);
  return mix(C.warm, C.hot, (t - 0.45) / 0.55);
}
export function refrigerantGlow(tempC) {
  const t = inv(10, 90, tempC);
  if (t < 0.45) return mix(C.coolBright, "#B48CFF", t / 0.45);
  return mix("#B48CFF", C.hotBright, (t - 0.45) / 0.55);
}
