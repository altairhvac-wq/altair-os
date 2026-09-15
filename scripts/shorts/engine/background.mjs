/**
 * The room the machine sits in.
 *
 * Three depth layers — far haze, blurred plant silhouettes, near vignette —
 * because the difference between "a render" and "a slide" is almost entirely
 * whether anything exists behind the subject.
 */
import { C, rgba } from "./style.mjs";
import { hash } from "./draw.mjs";

let plate = null;

export function drawBackground(ctx, w, h, camX, camY, t) {
  if (!plate) plate = buildPlate(w, h);

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, C.bgTop);
  g.addColorStop(0.55, C.bgBottom);
  g.addColorStop(1, C.bgDeep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Parallax: the plate moves a fraction of the camera, which is what sells
  // depth on a phone far more than any amount of blur does.
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.drawImage(plate, camX * 0.12 - 40, camY * 0.08 - 30);
  ctx.restore();

  // Slow volumetric shaft from the upper left.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.16 + Math.sin(t * 0.35) * 0.03;
  const s = ctx.createLinearGradient(0, 0, w * 0.9, h * 0.75);
  s.addColorStop(0, rgba(C.accent, 0.5));
  s.addColorStop(0.4, rgba(C.accent, 0.08));
  s.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = s;
  ctx.beginPath();
  ctx.moveTo(-200, -100);
  ctx.lineTo(w * 0.62, -100);
  ctx.lineTo(w * 1.15, h * 0.95);
  ctx.lineTo(w * 0.1, h * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Painted once: grid, out-of-focus pipework, vessels. */
function buildPlate(w, h) {
  const W = w + 120;
  const H = h + 120;
  const cv =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(W, H)
      : Object.assign(document.createElement("canvas"), { width: W, height: H });
  const c = cv.getContext("2d");

  // Engineering grid, fading toward the bottom.
  c.strokeStyle = C.grid;
  c.lineWidth = 1;
  for (let x = 0; x < W; x += 60) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, H);
    c.stroke();
  }
  for (let y = 0; y < H; y += 60) {
    c.globalAlpha = 1 - (y / H) * 0.6;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(W, y);
    c.stroke();
  }
  c.globalAlpha = 1;

  // Blurred plant: vertical pipe runs and a couple of vessels.
  c.save();
  c.filter = "blur(14px)";
  for (let i = 0; i < 14; i++) {
    const s1 = hash(i * 2.7 + 1);
    const s2 = hash(i * 5.9 + 4);
    const x = s1 * W;
    const wd = 26 + s2 * 78;
    const gg = c.createLinearGradient(x, 0, x + wd, 0);
    gg.addColorStop(0, "rgba(12,26,42,0.9)");
    gg.addColorStop(0.4, "rgba(38,70,102,0.75)");
    gg.addColorStop(1, "rgba(8,18,30,0.9)");
    c.fillStyle = gg;
    c.fillRect(x, s2 * 260 - 120, wd, H * (0.45 + s1 * 0.6));
  }
  for (let i = 0; i < 6; i++) {
    const s1 = hash(i * 8.3 + 20);
    const s2 = hash(i * 3.4 + 9);
    c.beginPath();
    c.ellipse(s1 * W, s2 * H, 90 + s2 * 140, 160 + s1 * 200, 0, 0, Math.PI * 2);
    c.fillStyle = "rgba(16,34,54,0.55)";
    c.fill();
  }
  c.restore();

  // A few cool rim lights so the silhouettes are not pure mud.
  c.save();
  c.filter = "blur(22px)";
  c.globalCompositeOperation = "lighter";
  for (let i = 0; i < 9; i++) {
    const s1 = hash(i * 12.1 + 31);
    const s2 = hash(i * 4.4 + 17);
    c.fillStyle = rgba(i % 3 === 0 ? C.hot : C.accent, 0.1 + s2 * 0.1);
    c.beginPath();
    c.arc(s1 * W, s2 * H, 40 + s2 * 90, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();

  return cv;
}

/** Corner darkening, applied after everything else. */
export function drawVignette(ctx, w, h) {
  ctx.save();
  const g = ctx.createRadialGradient(w / 2, h * 0.46, h * 0.22, w / 2, h * 0.5, h * 0.78);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.6, "rgba(0,0,0,0.28)");
  g.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Very light film grain — kills banding in the big dark gradients. */
let grainTile = null;
export function drawFilmGrain(ctx, w, h, frame) {
  if (!grainTile) {
    const S = 256;
    const cv =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(S, S)
        : Object.assign(document.createElement("canvas"), { width: S, height: S });
    const g = cv.getContext("2d");
    const img = g.createImageData(S, S);
    for (let i = 0; i < S * S; i++) {
      const v = Math.round(hash(i * 1.7) * 255);
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 12;
    }
    g.putImageData(img, 0, 0);
    grainTile = cv;
  }
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.5;
  const ox = (frame * 37) % 256;
  const oy = (frame * 61) % 256;
  const p = ctx.createPattern(grainTile, "repeat");
  ctx.translate(-ox, -oy);
  ctx.fillStyle = p;
  ctx.fillRect(0, 0, w + 256, h + 256);
  ctx.restore();
}
