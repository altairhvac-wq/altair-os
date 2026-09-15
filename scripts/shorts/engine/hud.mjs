/**
 * The overlay language: gauges, callouts, phase chips, hook type.
 *
 * Everything here is drawn in SCREEN space, never in machine space. Overlays
 * that ride the camera are the fastest way to make an explainer feel cheap;
 * the machine moves, the instrumentation does not.
 */
import { C, F, rgba, clamp, lerp, mix, ease } from "./style.mjs";
import { rr, textShadowed, bloom } from "./draw.mjs";

/* ------------------------------------------------------------------ gauges */

/**
 * A round instrument with a cool-to-hot track. `t` is 0..1 along the scale.
 * The needle is drawn with a real pivot and a counterweight tail because the
 * eye recognises those even at thumbnail size.
 */
export function gauge(ctx, x, y, r, opts) {
  const { label, unit, value, t, hot = false, alpha = 1, state } = opts;
  const A0 = Math.PI * 0.75;
  const A1 = Math.PI * 2.25;
  const k = clamp(t, 0, 1);

  ctx.save();
  ctx.globalAlpha = alpha;

  // Bezel.
  ctx.beginPath();
  ctx.arc(x, y, r + 12, 0, Math.PI * 2);
  const bg = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  bg.addColorStop(0, "rgba(18,38,58,0.96)");
  bg.addColorStop(1, "rgba(8,18,30,0.96)");
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = hot ? C.hudLineHot : C.hudLine;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Track.
  ctx.beginPath();
  ctx.arc(x, y, r, A0, A1);
  ctx.strokeStyle = "rgba(12,26,40,0.95)";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.stroke();

  // Scale, coloured cool to hot along its length.
  const steps = 40;
  for (let i = 0; i < steps; i++) {
    const a0 = lerp(A0, A1, i / steps);
    const a1 = lerp(A0, A1, (i + 1) / steps);
    ctx.beginPath();
    ctx.arc(x, y, r, a0, a1 + 0.005);
    ctx.strokeStyle = rgba(i / steps < 0.55 ? C.cool : C.hot, 0.16 + (i / steps) * 0.12);
    ctx.lineWidth = 10;
    ctx.stroke();
  }

  // Filled portion up to the current value.
  const fillA = lerp(A0, A1, k);
  ctx.beginPath();
  ctx.arc(x, y, r, A0, fillA);
  ctx.strokeStyle = mix(C.cool, C.hot, k);
  ctx.lineWidth = 10;
  ctx.stroke();
  bloom(ctx, mix(C.coolBright, C.hotBright, k), 22, 0.55, (c) => {
    c.beginPath();
    c.arc(x, y, r, A0, fillA);
    c.strokeStyle = mix(C.coolBright, C.hotBright, k);
    c.lineWidth = 5;
    c.stroke();
  });

  // Ticks.
  for (let i = 0; i <= 10; i++) {
    const a = lerp(A0, A1, i / 10);
    const major = i % 5 === 0;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (r - 16), y + Math.sin(a) * (r - 16));
    ctx.lineTo(x + Math.cos(a) * (r - (major ? 30 : 24)), y + Math.sin(a) * (r - (major ? 30 : 24)));
    ctx.strokeStyle = rgba(C.text, major ? 0.55 : 0.24);
    ctx.lineWidth = major ? 3 : 2;
    ctx.stroke();
  }

  // Needle.
  const na = lerp(A0, A1, k);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(na);
  ctx.beginPath();
  ctx.moveTo(-r * 0.24, 4);
  ctx.lineTo(-r * 0.24, -4);
  ctx.lineTo(r - 26, -2.4);
  ctx.lineTo(r - 26, 2.4);
  ctx.closePath();
  ctx.fillStyle = mix("#EAF3FB", C.hotBright, k);
  ctx.shadowColor = rgba(mix(C.coolBright, C.hotBright, k), 0.9);
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fillStyle = "#1A2E43";
  ctx.fill();
  ctx.strokeStyle = rgba(C.text, 0.5);
  ctx.lineWidth = 2;
  ctx.stroke();

  // Titles and digital readout. The title gets a plate of its own: over a
  // bright machined surface, a shadowed word alone is not enough.
  ctx.font = F.label(27);
  const lw = ctx.measureText(label).width + 34;
  rr(ctx, x - lw / 2, y - r - 58, lw, 40, 10);
  ctx.fillStyle = "rgba(5,13,22,0.9)";
  ctx.fill();
  ctx.strokeStyle = rgba(hot ? C.hot : C.accent, 0.28);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  textShadowed(ctx, label, x, y - r - 38, F.label(27), C.textDim, "center", "middle");
  textShadowed(ctx, unit, x, y + r * 0.44, F.micro(22), rgba(C.textDim, 0.75), "center", "middle");

  const bw = r * 1.9;
  rr(ctx, x - bw / 2, y + r + 24, bw, 62, 12);
  ctx.fillStyle = "rgba(6,16,26,0.92)";
  ctx.fill();
  ctx.strokeStyle = hot ? C.hudLineHot : C.hudLine;
  ctx.lineWidth = 2;
  ctx.stroke();
  textShadowed(ctx, value, x, y + r + 56, F.mono(38), mix(C.text, C.hotBright, k * 0.8), "center", "middle");

  if (state) {
    textShadowed(
      ctx,
      state.text,
      x,
      y + r + 112,
      F.label(26),
      state.hot ? C.hot : C.accent,
      "center",
      "middle",
    );
  }
  ctx.restore();
}

/* ---------------------------------------------------------------- callouts */

/**
 * A label tied to a point on the machine by a leader line. `anchor` is in
 * screen space — the caller projects it through the camera, so the label stays
 * glued to the part as the camera moves.
 */
export function callout(ctx, opts) {
  const {
    x,
    y,
    anchor,
    title,
    sub,
    tone = "cool",
    align = "left",
    alpha = 1,
    reveal = 1,
  } = opts;
  if (alpha <= 0.01) return;
  const line = tone === "hot" ? C.hudLineHot : C.hudLine;
  const ink = tone === "hot" ? C.hotBright : C.accent;
  const e = ease.outExpo(clamp(reveal, 0, 1));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = F.label(36);
  const tw = ctx.measureText(title).width;
  ctx.font = F.body(27);
  const sw = sub ? ctx.measureText(sub).width : 0;
  const w = Math.max(tw, sw) + 44;
  const h = sub ? 108 : 70;
  const bx = align === "left" ? x : x - w;

  // Leader line, drawn first so the panel sits on top of its own elbow.
  if (anchor) {
    const px = align === "left" ? bx : bx + w;
    const py = y + h / 2;
    const mx = lerp(px, anchor.x, 0.55);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(lerp(px, mx, e), py);
    ctx.lineTo(lerp(px, anchor.x, e), lerp(py, anchor.y, e));
    ctx.strokeStyle = rgba(ink, 0.75);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    if (e > 0.85) {
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = ink;
      ctx.shadowColor = ink;
      ctx.shadowBlur = 14;
      ctx.fill();
    }
  }

  ctx.save();
  ctx.globalAlpha = alpha * clamp(e * 1.4, 0, 1);
  rr(ctx, bx, y, w * clamp(e * 1.15, 0.05, 1), h, 14);
  ctx.fillStyle = "rgba(7,20,33,0.93)";
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Accent spine.
  ctx.fillStyle = ink;
  ctx.fillRect(bx, y + 10, 4, (h - 20) * e);
  ctx.restore();

  if (e > 0.4) {
    const ta = clamp((e - 0.4) / 0.45, 0, 1) * alpha;
    ctx.globalAlpha = ta;
    textShadowed(ctx, title, bx + 24, y + (sub ? 40 : 36), F.label(36), C.text, "left", "middle");
    if (sub) textShadowed(ctx, sub, bx + 24, y + 78, F.body(27), tone === "hot" ? C.hotBright : C.textDim, "left", "middle");
  }
  ctx.restore();
}

/** Small state chip, e.g. "SUCTION VALVE — OPEN". */
export function chip(ctx, x, y, text, tone, alpha = 1, align = "left") {
  if (alpha <= 0.01) return;
  const ink = tone === "hot" ? C.hotBright : tone === "off" ? "#6F8299" : C.accent;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = F.micro(26);
  const w = ctx.measureText(text).width + 40;
  const bx = align === "left" ? x : x - w;
  rr(ctx, bx, y, w, 48, 24);
  ctx.fillStyle = "rgba(6,17,28,0.9)";
  ctx.fill();
  ctx.strokeStyle = rgba(ink, 0.6);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(bx + 22, y + 24, 7, 0, Math.PI * 2);
  ctx.fillStyle = ink;
  ctx.shadowColor = ink;
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = tone === "off" ? "#93AEC6" : C.text;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, bx + 40, y + 25);
  ctx.restore();
}

/* -------------------------------------------------------------- title type */

/**
 * The hook. Two lines maximum, big, with a per-word rise so it arrives with
 * energy instead of fading in like a lower third.
 */
export function hookText(ctx, lines, x, y, reveal, alpha = 1, size = 74) {
  ctx.save();
  ctx.globalAlpha = alpha;
  lines.forEach((ln, i) => {
    const t = clamp((reveal - i * 0.12) / 0.6, 0, 1);
    const e = ease.outExpo(t);
    ctx.save();
    ctx.globalAlpha = alpha * t;
    ctx.translate(0, (1 - e) * 34);
    textShadowed(ctx, ln.text, x, y + i * (size + 14), F.hook(size), ln.accent ? C.accent : C.text, "left", "middle");
    ctx.restore();
  });
  ctx.restore();
}

/** The caption strip: one short line at a time, phone-legible. */
export function caption(ctx, str, cx, y, alpha, w) {
  if (alpha <= 0.01 || !str) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = F.label(40);
  const tw = ctx.measureText(str).width;
  const bw = Math.min(tw + 56, w);
  rr(ctx, cx - bw / 2, y, bw, 78, 16);
  ctx.fillStyle = "rgba(5,14,24,0.86)";
  ctx.fill();
  ctx.strokeStyle = rgba(C.accent, 0.28);
  ctx.lineWidth = 2;
  ctx.stroke();
  textShadowed(ctx, str, cx, y + 40, F.label(40), C.text, "center", "middle");
  ctx.restore();
}

/** Progress hairline. Retention aid: the viewer can see the end coming. */
export function progress(ctx, w, h, t) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(0, h - 6, w, 6);
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, C.cool);
  g.addColorStop(1, C.hot);
  ctx.fillStyle = g;
  ctx.fillRect(0, h - 6, w * clamp(t, 0, 1), 6);
  ctx.restore();
}

/** Channel mark, small and permanent, bottom left of the safe area. */
export function watermark(ctx, x, y, alpha = 0.55) {
  ctx.save();
  ctx.globalAlpha = alpha;
  textShadowed(ctx, "ALTAIR", x, y, F.hook(28), C.text, "left", "middle");
  ctx.font = F.hook(28);
  const w = ctx.measureText("ALTAIR").width;
  textShadowed(ctx, "HVAC", x + w + 10, y, F.label(28), C.accent, "left", "middle");
  ctx.restore();
}
