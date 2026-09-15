/**
 * Scroll compressor cutaway — plan view, looking down the shaft.
 *
 * A scroll is the one compressor whose story is only legible from above, so
 * this is the one mechanism in the system that is not a side section. Same
 * palette, same instruments, same particle language: the family resemblance
 * comes from the style tokens, not from the camera angle.
 */
import { C, rgba, clamp, lerp, refrigerantColor, refrigerantGlow } from "./style.mjs";
import { steelSide, bolt, makeGrain, rimLight, hash } from "./draw.mjs";
import { GEO, involute, orbitOffset, pocketVolume } from "../mechanisms/scroll.mjs";

const TAU = Math.PI * 2;
const SCALE = 1.2; // involute units -> pixels; outer wrap lands near r=430
let grain = null;

/** One wrap as a closed polygon: out along one flank, back along the other. */
function wrapPath(flip, offset) {
  const p = new Path2D();
  const steps = 240;
  const pt = (phi, phi0) => {
    const v = involute(phi, phi0);
    const s = flip ? -1 : 1;
    return { x: s * v.x * SCALE + offset.x, y: s * v.y * SCALE + offset.y };
  };
  for (let i = 0; i <= steps; i++) {
    const phi = lerp(GEO.phiStart, GEO.phiEnd, i / steps);
    const q = pt(phi, 0);
    if (i === 0) p.moveTo(q.x, q.y);
    else p.lineTo(q.x, q.y);
  }
  for (let i = steps; i >= 0; i--) {
    const phi = lerp(GEO.phiStart, GEO.phiEnd, i / steps);
    const q = pt(phi, GEO.alpha);
    p.lineTo(q.x, q.y);
  }
  p.closePath();
  return p;
}

export function drawScroll(ctx, st) {
  if (!grain) grain = makeGrain(384, 384, 41);
  const off = orbitOffset(st.theta);
  const o = { x: off.x * SCALE, y: off.y * SCALE };

  drawHousing(ctx);
  drawGas(ctx, st, o);
  // Fixed scroll first, orbiting on top: the one in front is the one that moves.
  drawWrap(ctx, wrapPath(false, { x: 0, y: 0 }), false);
  drawWrap(ctx, wrapPath(true, o), true);
  drawDischargePort(ctx, st);
  drawShaft(ctx, st, o);
}

function drawHousing(ctx) {
  const R = GEO.rb * GEO.phiEnd * SCALE + 66;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R + 46, 0, TAU);
  ctx.fillStyle = "#0B141D";
  ctx.fill();
  ctx.clip();
  ctx.globalAlpha = 0.4;
  ctx.drawImage(grain, -R, -R, R * 2, R * 2);
  ctx.restore();

  // Machined base plate the wraps stand on.
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  const g = ctx.createLinearGradient(-R, -R, R, R);
  g.addColorStop(0, "#1D2C3A");
  g.addColorStop(0.42, "#3E5468");
  g.addColorStop(0.7, "#22313F");
  g.addColorStop(1, "#0C141C");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(4,9,15,0.9)";
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();

  // Suction annulus: where gas arrives, all the way round the outside.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.beginPath();
  ctx.arc(0, 0, R - 24, 0, TAU);
  ctx.strokeStyle = rgba(C.cool, 0.18);
  ctx.lineWidth = 44;
  ctx.stroke();
  ctx.restore();

  const ring = new Path2D();
  ring.arc(0, 0, R + 46, 0, TAU);
  rimLight(ctx, ring, 0.4, 0.16);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.4;
    bolt(ctx, Math.cos(a) * (R + 24), Math.sin(a) * (R + 24), 13);
  }
}

/**
 * One involute wrap.
 *
 * A single flat fill made these read as paper spirals. A wrap is a tall milled
 * rib: it has a lit top land, a shaded flank, and it casts onto the plate. The
 * moving one is lighter and throws a longer shadow, which is what lets the eye
 * pick out WHICH scroll is orbiting without being told.
 */
function drawWrap(ctx, path, moving) {
  ctx.save();
  // Contact shadow on the base plate first.
  ctx.save();
  ctx.translate(moving ? 9 : 4, moving ? 13 : 6);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.filter = "blur(9px)";
  ctx.fill(path);
  ctx.restore();

  // Flank: darker, and angled across the wrap rather than down the frame.
  const g = ctx.createLinearGradient(-360, -360, 360, 360);
  if (moving) {
    g.addColorStop(0, "#26333F");
    g.addColorStop(0.28, "#B9CAD9");
    g.addColorStop(0.52, "#6E8091");
    g.addColorStop(0.78, "#9DB0C1");
    g.addColorStop(1, "#1B242E");
  } else {
    g.addColorStop(0, "#151E27");
    g.addColorStop(0.3, "#7E8F9F");
    g.addColorStop(0.55, "#48586A");
    g.addColorStop(0.8, "#6A7B8C");
    g.addColorStop(1, "#0E151C");
  }
  ctx.fillStyle = g;
  ctx.fill(path);

  // Top land: a thin inset highlight along the crown of the rib.
  ctx.save();
  ctx.clip(path);
  ctx.strokeStyle = moving ? "rgba(240,250,255,0.5)" : "rgba(200,220,238,0.26)";
  ctx.lineWidth = 7;
  ctx.stroke(path);
  ctx.restore();

  ctx.strokeStyle = "rgba(3,8,13,0.9)";
  ctx.lineWidth = 2.5;
  ctx.stroke(path);
  ctx.restore();
  rimLight(ctx, path, moving ? 0.6 : 0.3, moving ? 0.24 : 0.12);
}

/**
 * Gas in the pockets.
 *
 * A scroll pocket is a CRESCENT — a closed area bounded by two involutes — and
 * the first version drew it as a string of dots along a single curve, which
 * read as a dotted line rather than as trapped gas. This builds the real
 * crescent polygon, fills it with the refrigerant colour for its own state, and
 * only then scatters particles INSIDE it.
 *
 * Two crescents per pocket index, because the wraps seal in two places, so a
 * scroll always has a symmetric pair at the same stage of compression.
 */
/*
 * The channel between one turn of the fixed wrap and the next spans
 * phi0 = alpha .. 2*pi. The orbiting wrap runs down the middle of it and
 * occupies roughly alpha wide about the centre, so the two pockets are the
 * bands either side of that. Wider limits than these let the gas paint over
 * the wraps, which is what the first attempt did.
 */
const ORBIT_MID = (GEO.alpha + TAU) / 2;
/** One sub-channel: between the fixed wrap's inner flank and the orbiting wrap. */
const BAND = [GEO.alpha + 0.18, ORBIT_MID - GEO.alpha * 0.58];
/**
 * The two pockets of a pair sit half a turn apart, not side by side.
 *
 * Adding pi to phi walks half a turn around the spiral AND one half-channel
 * outward, which is exactly where the conjugate pocket lives — the wraps seal
 * in two places roughly 180 degrees apart. Drawing the second pocket as a
 * different radial band at the SAME phi put both crescents in one sector,
 * which is wrong and looks it.
 */
const PHASES = [0, Math.PI];

/** The closed crescent between two involute flanks over a phi range. */
function crescent(phiLo, phiHi, c0, c1) {
  const p = new Path2D();
  const steps = 44;
  for (let i = 0; i <= steps; i++) {
    const phi = lerp(phiLo, phiHi, i / steps);
    const v = involute(phi, c0);
    const x = v.x * SCALE;
    const y = v.y * SCALE;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  for (let i = steps; i >= 0; i--) {
    const phi = lerp(phiLo, phiHi, i / steps);
    const v = involute(phi, c1);
    p.lineTo(v.x * SCALE, v.y * SCALE);
  }
  p.closePath();
  return p;
}

function drawGas(ctx, st, o) {
  void o;
  ctx.save();
  for (const pk of st.pockets) {
    const col = refrigerantColor(pk.tempC);
    const glow = refrigerantGlow(pk.tempC);
    // A pocket late in its journey subtends less angle as well as less area.
    const span = lerp(0.9, 2.5, pk.volumeFrac);
    const phiHi = pk.phi;
    const phiLo = Math.max(GEO.phiStart + 0.3, pk.phi - span);
    if (phiHi - phiLo < 0.12) continue;

    const [c0, c1] = BAND;
    for (const shift of PHASES) {
      const lo = phiLo + shift;
      const hi = phiHi + shift;
      if (hi > GEO.phiEnd - 0.2) continue;
      const path = crescent(lo, hi, c0, c1);

      // The gas body.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.5 + 0.32 * (1 - pk.volumeFrac);
      // Bright at the sealed leading edge, fading toward the trailing edge,
      // which is still open to the suction side and should not end in a wall.
      const lead = involute(hi, (c0 + c1) / 2);
      const trail = involute(lo, (c0 + c1) / 2);
      const fg = ctx.createLinearGradient(
        trail.x * SCALE, trail.y * SCALE, lead.x * SCALE, lead.y * SCALE,
      );
      fg.addColorStop(0, rgba(col, 0.12));
      fg.addColorStop(0.45, rgba(col, 0.44));
      fg.addColorStop(1, rgba(col, 0.6));
      ctx.fillStyle = fg;
      ctx.fill(path);
      ctx.restore();

      // Particles, clipped to the crescent so none escape the pocket.
      ctx.save();
      ctx.clip(path);
      ctx.globalCompositeOperation = "lighter";
      const n = Math.round(lerp(16, 46, pk.volumeFrac));
      for (let i = 0; i < n; i++) {
        const s1 = hash(i * 3.7 + pk.phi * 11);
        const s2 = hash(i * 8.3 + pk.phi * 5 + 40);
        const phi = lerp(lo, hi, s1);
        const c = lerp(c0, c1, s2);
        const v = involute(phi, c);
        const x = v.x * SCALE;
        const y = v.y * SCALE;
        const r = lerp(5, 14, s2) * (0.7 + 0.5 * pk.volumeFrac);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(glow, 0.85));
        g.addColorStop(0.4, rgba(col, 0.45));
        g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      // Sealing line at the leading edge: where the wraps actually touch.
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const a = involute(hi, c0);
      const b = involute(hi, c1);
      ctx.beginPath();
      ctx.moveTo(a.x * SCALE, a.y * SCALE);
      ctx.lineTo(b.x * SCALE, b.y * SCALE);
      ctx.strokeStyle = rgba(glow, 0.5);
      ctx.lineWidth = 3;
      ctx.shadowColor = rgba(glow, 0.9);
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawDischargePort(ctx, st) {
  const r = 42;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = "#04080D";
  ctx.fill();
  ctx.strokeStyle = "rgba(170,196,220,0.4)";
  ctx.lineWidth = 3;
  ctx.stroke();
  if (st.discharging) {
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.4);
    g.addColorStop(0, rgba(C.hotBright, 0.85));
    g.addColorStop(0.4, rgba(C.hot, 0.4));
    g.addColorStop(1, rgba(C.hot, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** The eccentric that drives the orbit — and proves the wrap is not spinning. */
function drawShaft(ctx, st, o) {
  ctx.save();
  // Orbit trace: a faint circle the drive pin runs around.
  ctx.beginPath();
  ctx.arc(0, 0, GEO.orbit * SCALE, 0, TAU);
  ctx.strokeStyle = rgba(C.accent, 0.3);
  ctx.setLineDash([7, 9]);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);
  // Drive pin.
  ctx.beginPath();
  ctx.arc(o.x, o.y, 17, 0, TAU);
  ctx.fillStyle = steelSide(ctx, o.x - 17, 34, "#E8F2FB", "#7B8C9C", "#161F29");
  ctx.fill();
  ctx.strokeStyle = "rgba(3,7,11,0.9)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  void clamp;
}

export const scrollMechanism = {
  id: "scroll",
  draw: drawScroll,
  gas() {
    // Scroll gas is drawn inside drawScroll, between the wraps, because it has
    // to be occluded by the wrap that is in front of it.
  },
};
export { pocketVolume };
