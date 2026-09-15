/**
 * Drawing primitives. These exist so the machine file can talk about
 * "a brushed steel cylinder" instead of about gradient stops.
 */
import { C, lerp } from "./style.mjs";

/** Rounded rect. Accepts a context or a Path2D, so the same contour can be
 *  filled once and re-used as a cut-face outline without being retyped. */
export function rr(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  if (typeof ctx.beginPath === "function") ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

/**
 * A vertical cylinder seen from the side, lit from the upper left.
 * Real turned steel has a bright specular band, a dark terminator and a weak
 * bounce highlight on the far edge; three stops is what separates metal from
 * grey plastic.
 */
export function steelSide(ctx, x, w, hi = C.steelHi, mid = C.steel, lo = C.steelLo) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0.0, lo);
  g.addColorStop(0.1, mid);
  g.addColorStop(0.26, hi);
  g.addColorStop(0.38, mid);
  g.addColorStop(0.72, lo);
  g.addColorStop(0.9, mid);
  g.addColorStop(1.0, lo);
  return g;
}

/** Cast iron: darker, flatter, with a cooler bounce on the right. */
export function ironSide(ctx, x, w) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, "#131E29");
  g.addColorStop(0.16, "#2B3B4B");
  g.addColorStop(0.42, "#586B7D");
  g.addColorStop(0.62, "#334454");
  g.addColorStop(0.88, "#1A2531");
  g.addColorStop(1, "#0C141C");
  return g;
}

/**
 * Rim light. A cool edge on the left and a warm one on the right, traced over
 * a silhouette after it is filled. This is the single cheapest thing that
 * separates a dark machine from a dark blob, because it restates the shape
 * exactly where the shape meets the background.
 */
export function rimLight(ctx, path, coolAlpha = 0.5, warmAlpha = 0.22) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  ctx.strokeStyle = `rgba(120,196,255,${coolAlpha})`;
  ctx.lineWidth = 2.4;
  ctx.stroke(path);
  ctx.strokeStyle = `rgba(255,168,110,${warmAlpha})`;
  ctx.lineWidth = 1.2;
  ctx.stroke(path);
  ctx.restore();
}

/**
 * The glowing cut face. In a sectioned engineering render the sliced material
 * reads hot orange-red; it is the single strongest signal that the viewer is
 * looking INSIDE something rather than at a flat illustration.
 */
export function cutFace(ctx, path, width = 9) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // Shadow the material sits in.
  ctx.strokeStyle = "rgba(0,0,0,0.72)";
  ctx.lineWidth = width + 9;
  ctx.stroke(path);
  // The slice itself: hot amber at the lit top, falling to dark iron-oxide.
  const g = ctx.createLinearGradient(0, -300, 0, 800);
  g.addColorStop(0, "#8A3A1E");
  g.addColorStop(0.4, "#5E220F");
  g.addColorStop(1, "#2A0F08");
  ctx.strokeStyle = g;
  ctx.lineWidth = width;
  ctx.stroke(path);
  // A single bright machined edge — thin, or it turns back into neon.
  ctx.strokeStyle = "rgba(255,186,138,0.2)";
  ctx.lineWidth = 1.2;
  ctx.stroke(path);
  ctx.restore();
}

/** Soft additive bloom around whatever the callback draws. */
export function bloom(ctx, color, blur, alpha, fn) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.globalAlpha = alpha;
  fn(ctx);
  ctx.shadowBlur = blur * 0.45;
  fn(ctx);
  ctx.restore();
}

/** A radial pool of light — used for chamber glow and pipe interiors. */
export function radial(ctx, x, y, r, inner, outer) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(r, 1));
  g.addColorStop(0, inner);
  g.addColorStop(0.55, outer);
  g.addColorStop(1, "rgba(0,0,0,0)");
  return g;
}

/** Machined bolt head seen from the side — small, but they sell the scale. */
export function bolt(ctx, x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r);
  g.addColorStop(0, "#A9B8C6");
  g.addColorStop(0.6, "#4E5C6B");
  g.addColorStop(1, "#141D26");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(10,16,22,0.85)";
  ctx.fill();
  ctx.restore();
}

/** Coil spring in side view, compressed by `squash` (0 free, 1 fully shut). */
export function spring(ctx, x, yTop, yBot, w, coils, squash) {
  const h = yBot - yTop;
  ctx.save();
  ctx.lineCap = "round";
  ctx.beginPath();
  const steps = coils * 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x + Math.sin(t * coils * Math.PI * 2) * (w / 2) * (1 + squash * 0.12);
    const py = yTop + t * h;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = "rgba(6,10,15,0.9)";
  ctx.lineWidth = 9;
  ctx.stroke();
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, "#2C3844");
  g.addColorStop(0.35, "#9FB0C0");
  g.addColorStop(1, "#39485A");
  ctx.strokeStyle = g;
  ctx.lineWidth = 5.5;
  ctx.stroke();
  ctx.restore();
}

/** Deterministic value noise, so every render of frame N is byte-identical. */
export function hash(i) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** One-time speckle texture for cast surfaces. */
export function makeGrain(w, h, seedOffset = 0) {
  const cv =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement("canvas"), { width: w, height: h });
  const g = cv.getContext("2d");
  const img = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const n = hash(i + seedOffset);
    const v = n > 0.986 ? 210 : n > 0.94 ? 110 : 0;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = v > 0 ? 26 : 0;
  }
  g.putImageData(img, 0, 0);
  return cv;
}

export function text(ctx, str, x, y, font, fill, align = "left", baseline = "alphabetic") {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = fill;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(str, x, y);
  ctx.restore();
}

/** Text with a dark halo, so a label stays legible over bright machinery. */
export function textShadowed(ctx, str, x, y, font, fill, align = "left", baseline = "alphabetic") {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.shadowColor = "rgba(2,7,12,0.95)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = fill;
  ctx.fillText(str, x, y);
  ctx.shadowBlur = 6;
  ctx.fillText(str, x, y);
  ctx.restore();
}

export const fade = (t, inMs, outMs, dur) =>
  Math.min(1, Math.max(0, Math.min(t / inMs, (dur - t) / outMs, 1)));

export { lerp };
