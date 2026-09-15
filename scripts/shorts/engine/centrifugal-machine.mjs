/**
 * Centrifugal compressor cutaway — plan view, looking down the shaft.
 *
 * ==================== TWO CHANNELS, NOT ONE ====================
 * Everywhere else in this series, refrigerant colour carries the whole story,
 * because temperature and pressure rise together with falling volume. Here they
 * do not: the impeller adds VELOCITY, and pressure and temperature only appear
 * later in the diffuser. One channel cannot say that.
 *
 * So this machine encodes the two quantities separately, and the split is the
 * entire design of the Short:
 *
 *   colour        temperature, exactly as every other Short — so the gas stays
 *                 CYAN all the way through the impeller despite moving fastest
 *                 there, and only turns orange in the diffuser
 *   streak length velocity — long smeared streaks at the impeller tip, short
 *                 round blobs by the outlet
 *
 * A viewer who watches the streaks shorten while the colour warms has been
 * shown the energy conversion directly.
 */
import { C, rgba, clamp, lerp, refrigerantColor, refrigerantGlow } from "./style.mjs";
import { steelSide, cutFace, bolt, makeGrain, rimLight, hash } from "./draw.mjs";
import { GEO, flowState, tipProgress } from "../mechanisms/centrifugal.mjs";

const TAU = Math.PI * 2;
/** Machine units per radius fraction. */
export const RU = 440;
export const Rk = {
  eye: GEO.eye * RU,
  tip: GEO.tip * RU,
  diff: GEO.diffuser * RU,
};

let grain = null;

export function drawCentrifugal(ctx, st) {
  if (!grain) grain = makeGrain(384, 384, 101);

  drawVolute(ctx, st);
  drawDiffuser(ctx, st);
  drawFlow(ctx, st);
  drawImpeller(ctx, st);
  drawEye(ctx, st);
  drawCut(ctx);
}

/* ----------------------------------------------------------------- volute */

function drawVolute(ctx, st) {
  const outer = Rk.diff + 116;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, outer, 0, TAU);
  ctx.arc(0, 0, Rk.diff, 0, TAU, true);
  const g = ctx.createLinearGradient(-outer, -outer, outer, outer);
  g.addColorStop(0, "#111C27");
  g.addColorStop(0.22, "#32455A");
  g.addColorStop(0.48, "#556B81");
  g.addColorStop(0.72, "#27343F");
  g.addColorStop(1, "#0C131A");
  ctx.fillStyle = g;
  ctx.fill("evenodd");
  ctx.clip("evenodd");
  ctx.globalAlpha = 0.4;
  ctx.drawImage(grain, -outer, -outer, outer * 2, outer * 2);
  ctx.restore();

  // The collector is hot: everything that reaches it has been through the
  // diffuser, so it carries the discharge colour regardless of shaft angle.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.beginPath();
  ctx.arc(0, 0, Rk.diff + 40, 0, TAU);
  ctx.strokeStyle = rgba(C.hot, 0.2);
  ctx.lineWidth = 60;
  ctx.stroke();
  ctx.restore();

  const ring = new Path2D();
  ring.arc(0, 0, outer, 0, TAU);
  rimLight(ctx, ring, 0.45, 0.2);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.38;
    bolt(ctx, Math.cos(a) * (outer - 42), Math.sin(a) * (outer - 42), 14);
  }
  void st;
}

/* --------------------------------------------------------------- diffuser */

/** Vaned diffuser: the passages that slow the flow down. */
function drawDiffuser(ctx, st) {
  void st;
  const n = 13;
  ctx.save();
  // Passage floor.
  ctx.beginPath();
  ctx.arc(0, 0, Rk.diff, 0, TAU);
  ctx.arc(0, 0, Rk.tip, 0, TAU, true);
  ctx.fillStyle = "#060C14";
  ctx.fill("evenodd");

  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU;
    ctx.beginPath();
    for (let k = 0; k <= 18; k++) {
      const t = k / 18;
      // Diffuser vanes lean the other way from the impeller's, which is what
      // makes the passage widen and the flow slow.
      const a = a0 + t * 0.46;
      const r = lerp(Rk.tip + 6, Rk.diff - 6, t);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.lineWidth = 20;
    ctx.strokeStyle = "rgba(5,10,16,0.85)";
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.lineWidth = 13;
    ctx.strokeStyle = steelSide(ctx, -Rk.diff, Rk.diff * 2, "#B8C8D8", "#5E6F80", "#131C25");
    ctx.stroke();
  }
  ctx.restore();
}

/* --------------------------------------------------------------- impeller */

function drawImpeller(ctx, st) {
  ctx.save();
  ctx.rotate(st.spin);

  for (let i = 0; i < GEO.vanes; i++) {
    const a0 = (i / GEO.vanes) * TAU;
    ctx.beginPath();
    for (let k = 0; k <= 20; k++) {
      const t = k / 20;
      // Backswept: the vane trails the direction of rotation.
      const a = a0 - t * GEO.sweep;
      const r = lerp(Rk.eye, Rk.tip, t);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.lineWidth = 26;
    ctx.strokeStyle = "rgba(4,9,15,0.9)";
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.lineWidth = 17;
    const vg = ctx.createLinearGradient(-Rk.tip, -Rk.tip, Rk.tip, Rk.tip);
    vg.addColorStop(0, "#25323F");
    vg.addColorStop(0.32, "#DCE8F4");
    vg.addColorStop(0.6, "#7B8D9F");
    vg.addColorStop(1, "#131C25");
    ctx.strokeStyle = vg;
    ctx.stroke();
  }

  // Hub.
  ctx.beginPath();
  ctx.arc(0, 0, Rk.eye - 8, 0, TAU);
  const hg = ctx.createRadialGradient(-Rk.eye * 0.4, -Rk.eye * 0.4, 4, 0, 0, Rk.eye);
  hg.addColorStop(0, "#C9D8E6");
  hg.addColorStop(0.55, "#546477");
  hg.addColorStop(1, "#0E151D");
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.restore();
}

/* -------------------------------------------------------------------- eye */

function drawEye(ctx, st) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, Rk.eye - 14, 0, TAU);
  ctx.fillStyle = "#03070D";
  ctx.fill();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Rk.eye);
  g.addColorStop(0, rgba(C.coolBright, 0.5));
  g.addColorStop(0.6, rgba(C.cool, 0.22));
  g.addColorStop(1, rgba(C.cool, 0));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(0, 0, Rk.eye - 14, 0, TAU);
  ctx.strokeStyle = rgba(C.cool, 0.4);
  ctx.lineWidth = 3;
  ctx.stroke();
  void st;
}

/* ------------------------------------------------------------------- flow */

/**
 * Where a parcel sits, given how far along the passage it is.
 * Inside the impeller it rides a vane; outside it spirals through the diffuser.
 */
function parcelAngle(p, spin, lane) {
  const laneA = (lane / GEO.vanes) * TAU;
  if (p <= tipProgress) {
    const t = p / tipProgress;
    return spin + laneA - t * GEO.sweep;
  }
  const t = (p - tipProgress) / (1 - tipProgress);
  return spin + laneA - GEO.sweep + t * 0.46;
}

/**
 * The refrigerant. Streak length carries velocity; colour carries temperature.
 * Those are two different quantities here, and that is the whole point.
 */
function drawFlow(ctx, st) {
  const PARCELS = 150;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  for (let i = 0; i < PARCELS; i++) {
    const lane = i % GEO.vanes;
    const s1 = hash(i * 5.7);
    const s2 = hash(i * 11.3 + 4);
    // Spread parcels along the passage; each one keeps its own offset.
    const p = ((st.revs * (0.6 + s1 * 0.5) + s2) % 1 + 1) % 1;
    const f = flowState(p);
    const r = f.radiusFrac * RU;
    const a = parcelAngle(p, st.spin, lane + (s1 - 0.5) * 0.7);

    const col = refrigerantColor(f.tempC);
    const glow = refrigerantGlow(f.tempC);

    // Streak: drawn backwards along the parcel's own path, length by velocity.
    const back = 0.055 * f.velocityFrac + 0.004;
    const p2 = Math.max(p - back, 0);
    const f2 = flowState(p2);
    const r2 = f2.radiusFrac * RU;
    const a2 = parcelAngle(p2, st.spin, lane + (s1 - 0.5) * 0.7);

    const x1 = Math.cos(a) * r;
    const y1 = Math.sin(a) * r;
    const x2 = Math.cos(a2) * r2;
    const y2 = Math.sin(a2) * r2;

    const g = ctx.createLinearGradient(x2, y2, x1, y1);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(1, rgba(glow, 0.85));
    ctx.strokeStyle = g;
    ctx.lineWidth = lerp(4, 11, s2) * (1 - 0.35 * f.velocityFrac);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // A soft head on the slow ones, which read as blobs rather than streaks.
    if (f.velocityFrac < 0.5) {
      const rad = lerp(5, 12, s2) * (1 - f.velocityFrac);
      const hg = ctx.createRadialGradient(x1, y1, 0, x1, y1, rad);
      hg.addColorStop(0, rgba(glow, 0.8));
      hg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(x1, y1, rad, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  void clamp;
}

/** Sliced faces: the impeller tip circle and the diffuser outer wall. */
function drawCut(ctx) {
  const p = new Path2D();
  p.arc(0, 0, Rk.tip, 0, TAU);
  p.moveTo(Rk.diff, 0);
  p.arc(0, 0, Rk.diff, 0, TAU);
  cutFace(ctx, p, 8);
}

export const centrifugalMechanism = { id: "centrifugal", draw: drawCentrifugal, gas() {} };
