/**
 * Refrigerant made visible.
 *
 * The particles are procedural: a particle's position is a pure function of its
 * index, the flow phase it is riding, and the chamber it lives in. Nothing is
 * integrated frame to frame, so frame 431 renders identically whether it is
 * reached by playing from 0 or by asking for it directly. That is what makes a
 * failed render resumable and a frame extraction trustworthy.
 *
 * The one rule that matters: chamber particles are placed in NORMALISED
 * chamber space. When the piston rises the chamber rectangle shrinks and the
 * same particles are carried into a smaller space — the packing is a
 * consequence of the geometry, not a separate animation.
 */
import { rgba, clamp, lerp, refrigerantColor, refrigerantGlow } from "./style.mjs";
import { hash } from "./draw.mjs";
import { chamberRect, M } from "./machine.mjs";

const CHAMBER_MAX = 176;

/** Mass in the cylinder relative to a full charge at bottom dead centre. */
export function massFraction(st) {
  if (st.phase === "suction") {
    // Fills linearly-ish with swept volume as the piston descends.
    return clamp(0.12 + 0.88 * (st.pistonFrac / 1.0), 0.12, 1);
  }
  if (st.phase === "compression") return 1;
  if (st.phase === "discharge") {
    // Emptying: what is left is proportional to the volume still enclosed.
    return clamp(st.volumeFrac / 0.34, 0.08, 1);
  }
  return clamp(st.volumeFrac * 0.9, 0.05, 0.3); // re-expansion: clearance gas only
}

export function drawChamberGas(ctx, st, t) {
  const r = chamberRect(st.pistonFrac);
  const n = Math.round(massFraction(st) * CHAMBER_MAX);
  const col = refrigerantColor(st.tempC);
  const glow = refrigerantGlow(st.tempC);
  // Squeezed gas is more agitated: shorter wander, faster jitter, brighter core.
  const agitation = clamp(0.35 + (1 - st.volumeFrac) * 1.5, 0.35, 1.9);

  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";

  for (let i = 0; i < CHAMBER_MAX; i++) {
    const a = clamp(n - i, 0, 1);
    if (a <= 0.01) continue;
    const s1 = hash(i * 3.11);
    const s2 = hash(i * 7.77 + 5);
    const s3 = hash(i * 13.3 + 11);
    const u = s1 + Math.sin(t * (0.9 + s2 * 1.5) * agitation + s1 * 31) * 0.11 * (0.4 + s3);
    const v = s2 + Math.cos(t * (0.8 + s1 * 1.4) * agitation + s2 * 19) * 0.12 * (0.4 + s1);
    const x = r.x + ((u % 1) + 1) % 1 * r.w;
    const y = r.y + ((v % 1) + 1) % 1 * r.h;
    const rad = lerp(3.6, 9.5, s3) * (0.72 + 0.5 * st.volumeFrac);
    puff(ctx, x, y, rad, col, glow, a * (0.55 + 0.45 * s1));
  }
  ctx.restore();
}

/** One soft glowing blob with a hot core. Cheap, and it reads as gas. */
function puff(ctx, x, y, r, col, glow, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(glow, 0.85 * alpha));
  g.addColorStop(0.35, rgba(col, 0.5 * alpha));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Vapour travelling along the suction line and down through the open suction
 * valve. `phase` is the accumulated flow distance, so the stream stalls when
 * the valve shuts instead of sliding on regardless.
 */
export function drawSuctionStream(ctx, st, phase, t) {
  const y = M.headTop + 104;
  const x0 = -1160;
  const x1 = -M.boreHalf - M.wall - 70;
  const span = x1 - x0;
  const col = refrigerantColor(15);
  const glow = refrigerantGlow(15);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 46; i++) {
    const s1 = hash(i * 5.3 + 2);
    const s2 = hash(i * 9.1 + 6);
    const p = (((phase * (0.5 + s1 * 0.7) + s2) % 1) + 1) % 1;
    const x = x0 + p * span;
    const yy = y + (s2 - 0.5) * 84 + Math.sin(t * 1.6 + s1 * 20) * 9;
    puff(ctx, x, yy, lerp(4, 10, s1), col, glow, 0.5 + 0.4 * s2);
  }
  ctx.restore();

  // Across the head port into the valve pocket. Without this the stream stops
  // at the flange and the gas appears to reach the cylinder by teleport.
  if (st.suctionLift > 0.05) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 22; i++) {
      const s1 = hash(i * 8.9 + 91);
      const p = (((phase * 1.15 + s1) % 1) + 1) % 1;
      const x = lerp(x1, -M.valveX, p);
      const yy = y + (s1 - 0.5) * 62;
      puff(ctx, x, yy, lerp(4, 9, s1), col, glow, st.suctionLift * (0.4 + 0.5 * s1));
    }
    ctx.restore();
  }

  // Through the valve and into the cylinder.
  if (st.suctionLift > 0.05) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const vx = -M.valveX;
    for (let i = 0; i < 16; i++) {
      const s1 = hash(i * 4.7 + 40);
      const p = (((phase * 1.6 + s1) % 1) + 1) % 1;
      const x = vx + (s1 - 0.5) * 118;
      const yy = lerp(M.deck - 40, M.deck + 96, p);
      puff(ctx, x, yy, lerp(4, 9, s1), col, glow, (1 - Math.abs(p - 0.5) * 1.2) * st.suctionLift);
    }
    ctx.restore();
  }
}

/** Hot vapour leaving through the discharge valve and up the copper elbow. */
export function drawDischargeStream(ctx, st, phase, t) {
  if (st.dischargeLift < 0.04 && phase <= 0) return;
  const y = M.headTop + 104;
  const x0 = M.boreHalf + M.wall + 54;
  const col = refrigerantColor(85);
  const glow = refrigerantGlow(85);
  const a = clamp(st.dischargeLift * 1.3, 0, 1);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // Out of the valve, across the gallery, round the elbow, up the riser.
  for (let i = 0; i < 54; i++) {
    const s1 = hash(i * 6.1 + 70);
    const s2 = hash(i * 11.7 + 3);
    const p = (((phase * (0.55 + s1 * 0.6) + s2) % 1) + 1) % 1;
    const pt = elbowPoint(p, x0, y, s2);
    puff(ctx, pt.x, pt.y + Math.sin(t * 2 + s1 * 18) * 5, lerp(4, 11, s1), col, glow, a * (0.5 + 0.5 * s2));
  }
  ctx.restore();
}

/** Parametric path: valve gap -> gallery -> elbow -> riser. */
function elbowPoint(p, x0, y, jitter) {
  const off = (jitter - 0.5) * 84;
  if (p < 0.22) {
    const k = p / 0.22;
    return { x: lerp(M.valveX, x0 - 40, k) + off * 0.4, y: lerp(M.deck - 30, y, k) };
  }
  if (p < 0.55) {
    const k = (p - 0.22) / 0.33;
    return { x: lerp(x0 - 40, x0 + 182, k), y: y + off };
  }
  const k = (p - 0.55) / 0.45;
  const cx = x0 + 370 + off;
  const bend = Math.min(k / 0.45, 1);
  const bx = lerp(x0 + 182, cx, Math.sin((bend * Math.PI) / 2));
  const by = k < 0.45 ? y + off - (1 - Math.cos((bend * Math.PI) / 2)) * 196 : y + off - 196 - (k - 0.45) * 760;
  return { x: bx, y: by };
}
