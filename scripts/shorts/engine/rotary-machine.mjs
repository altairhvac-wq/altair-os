/**
 * Rotary (rolling-piston) compressor cutaway — end view, looking down the shaft.
 *
 * The hard part of this mechanism is that BOTH chambers change at once, so the
 * frame has to carry two states without becoming unreadable. Colour does that
 * work: the growing chamber stays cool cyan the whole way because it is open to
 * the suction port, while the shrinking one climbs the shared temperature ramp.
 * A viewer can read which side is which without a single label.
 */
import { C, rgba, clamp, lerp, refrigerantColor, refrigerantGlow } from "./style.mjs";
import { steelSide, cutFace, bolt, spring, makeGrain, rimLight, hash, rr } from "./draw.mjs";
import { GEO, rollerRadiusAt } from "../mechanisms/rotary.mjs";

const TAU = Math.PI * 2;
const { R, r: RR } = GEO;

/** Ports sit either side of the vane: suction ahead of it, discharge behind. */
export const PORT = {
  suction: GEO.vane + 0.30,
  discharge: GEO.vane - 0.34,
  half: 0.17,
};

let grain = null;

export function drawRotary(ctx, st) {
  if (!grain) grain = makeGrain(384, 384, 61);

  drawHousing(ctx);
  drawChamber(ctx, st, st.vaneAngle, st.contactAngle, true);
  drawChamber(ctx, st, st.contactAngle, st.vaneAngle + TAU, false);
  drawPorts(ctx, st);
  drawRoller(ctx, st);
  drawVane(ctx, st);
  drawBoreCut(ctx);
}

/* ------------------------------------------------------------------ shell */

function drawHousing(ctx) {
  const outer = R + 118;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, outer, 0, TAU);
  ctx.arc(0, 0, R, 0, TAU, true);
  const g = ctx.createLinearGradient(-outer, -outer, outer, outer);
  g.addColorStop(0, "#131E29");
  g.addColorStop(0.2, "#33455A");
  g.addColorStop(0.45, "#5B7186");
  g.addColorStop(0.7, "#2B3A4A");
  g.addColorStop(1, "#0D141C");
  ctx.fillStyle = g;
  ctx.fill("evenodd");
  ctx.clip("evenodd");
  ctx.globalAlpha = 0.4;
  ctx.drawImage(grain, -outer, -outer, outer * 2, outer * 2);
  ctx.restore();

  const ring = new Path2D();
  ring.arc(0, 0, outer, 0, TAU);
  rimLight(ctx, ring, 0.45, 0.18);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.39;
    bolt(ctx, Math.cos(a) * (outer - 44), Math.sin(a) * (outer - 44), 14);
  }
}

/* --------------------------------------------------------------- chambers */

/** The crescent between the cylinder wall and the roller, over an angle span. */
function crescentPath(from, to, theta) {
  const p = new Path2D();
  const steps = 72;
  for (let i = 0; i <= steps; i++) {
    const psi = lerp(from, to, i / steps);
    p.lineTo(Math.cos(psi) * R, Math.sin(psi) * R);
  }
  for (let i = steps; i >= 0; i--) {
    const psi = lerp(from, to, i / steps);
    const d = rollerRadiusAt(psi, theta);
    p.lineTo(Math.cos(psi) * d, Math.sin(psi) * d);
  }
  p.closePath();
  return p;
}

/**
 * One chamber. `isSuction` picks the colour source: the growing side is held at
 * suction conditions because it is open to the port, and only the sealed side
 * climbs the ramp.
 */
function drawChamber(ctx, st, from, to, isSuction) {
  if (Math.abs(to - from) < 0.02) return;
  const tempC = isSuction ? st.suction.tempC : st.tempC;
  const col = refrigerantColor(tempC);
  const glow = refrigerantGlow(tempC);
  const path = crescentPath(from, to, st.theta);
  const frac = isSuction ? st.suctionFrac : st.compressionFrac;

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.clip();

  // Dark interior first so the gas has something to glow against.
  ctx.fillStyle = "#03070C";
  ctx.fill(path);

  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = isSuction ? 0.42 : 0.45 + 0.35 * (1 - frac);
  ctx.fillStyle = rgba(col, 0.45);
  ctx.fill(path);

  // Particles, clipped into the chamber so none escape past the vane.
  ctx.save();
  ctx.clip(path);
  const n = Math.round(isSuction ? lerp(8, 54, frac) : lerp(10, 60, frac));
  // A sealed chamber keeps its charge as it shrinks, so it packs; an open one
  // is simply filling. Same particle count logic as the cylinder Short.
  const seed = isSuction ? 0 : 500;
  for (let i = 0; i < n; i++) {
    const s1 = hash(i * 3.3 + seed);
    const s2 = hash(i * 9.1 + seed + 7);
    const psi = lerp(from, to, s1);
    const d = rollerRadiusAt(psi, st.theta);
    const rad = lerp(d + 6, R - 6, s2);
    const x = Math.cos(psi) * rad;
    const y = Math.sin(psi) * rad;
    const size = lerp(5, 13, s2) * (isSuction ? 1 : 0.7 + 0.5 * frac);
    const g = ctx.createRadialGradient(x, y, 0, x, y, size);
    g.addColorStop(0, rgba(glow, 0.85));
    g.addColorStop(0.4, rgba(col, 0.45));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

/* ------------------------------------------------------------------ ports */

/** A short pipe stub outside the housing, so a port reads as a connection. */
function stub(ctx, psi, tint) {
  const outer = R + 118;
  ctx.save();
  ctx.rotate(psi);
  ctx.translate(outer - 6, 0);
  const len = 96;
  const h = 104;
  ctx.beginPath();
  rr(ctx, 0, -h / 2, len, h, 10);
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, "#1B2B3A");
  g.addColorStop(0.22, "#9DB6CB");
  g.addColorStop(0.46, "#5B718C");
  g.addColorStop(1, "#101A25");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(4,9,14,0.8)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = rgba(tint, 0.2);
  ctx.fill();
  ctx.restore();
}

function drawPorts(ctx, st) {
  stub(ctx, PORT.suction, C.cool);
  stub(ctx, PORT.discharge, st.dischargeOpen ? C.hot : "#6A2E18");
  // Suction: simply an opening. A rotary has no suction valve.
  port(ctx, PORT.suction, C.cool, 0.34);
  // Discharge: an opening with a reed that lifts when the chamber wins.
  port(ctx, PORT.discharge, st.dischargeOpen ? C.hot : "#6A2E18", st.dischargeOpen ? 0.5 : 0.16);
  drawReed(ctx, st);
}

function port(ctx, psi, tint, alpha) {
  const a0 = psi - PORT.half;
  const a1 = psi + PORT.half;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R + 116, a0, a1);
  ctx.arc(0, 0, R - 4, a1, a0, true);
  ctx.closePath();
  ctx.fillStyle = "#04080E";
  ctx.fill();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = rgba(tint, alpha);
  ctx.fill();
  ctx.restore();
}

/** The discharge reed, drawn lifting by how far the chamber has overshot. */
function drawReed(ctx, st) {
  const psi = PORT.discharge;
  const lift = clamp(st.dischargeLift, 0, 1);
  ctx.save();
  ctx.rotate(psi);
  ctx.translate(R + 26, 0);
  ctx.rotate(-Math.PI / 2);
  const w = 96;
  const openY = -lift * 34;
  ctx.beginPath();
  rr(ctx, -w / 2, openY - 12, w, 18, 6);
  ctx.fillStyle = steelSide(ctx, -w / 2, w, "#E2EDF7", "#7F909F", "#161F29");
  ctx.fill();
  ctx.strokeStyle = "rgba(4,9,14,0.85)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/* ----------------------------------------------------------------- roller */

function drawRoller(ctx, st) {
  const cx = Math.cos(st.theta) * GEO.e;
  const cy = Math.sin(st.theta) * GEO.e;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, RR, 0, TAU);
  const g = ctx.createLinearGradient(cx - RR, cy - RR, cx + RR, cy + RR);
  g.addColorStop(0, "#16202B");
  g.addColorStop(0.24, "#8FA2B3");
  g.addColorStop(0.45, "#C9D8E5");
  g.addColorStop(0.62, "#5D6E80");
  g.addColorStop(1, "#0E151D");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(3,8,13,0.9)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  const rp = new Path2D();
  rp.arc(cx, cy, RR, 0, TAU);
  rimLight(ctx, rp, 0.5, 0.2);

  // The eccentric shaft the roller rides on, and the shaft centre line. The
  // offset between the two circles IS the eccentricity; showing both is what
  // makes "eccentric" legible rather than a word in a caption.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, RR * 0.42, 0, TAU);
  ctx.fillStyle = steelSide(ctx, cx - RR * 0.42, RR * 0.84, "#D7E4F0", "#6F8092", "#141D26");
  ctx.fill();
  ctx.strokeStyle = "rgba(3,8,13,0.85)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, TAU);
  ctx.fillStyle = "#0A1119";
  ctx.fill();
  ctx.strokeStyle = rgba(C.accent, 0.5);
  ctx.lineWidth = 2;
  ctx.stroke();
  // Eccentricity marker.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(cx, cy);
  ctx.strokeStyle = rgba(C.accent, 0.42);
  ctx.setLineDash([6, 7]);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/* ------------------------------------------------------------------- vane */

/**
 * The vane, extended exactly as far as the roller lets it.
 *
 * Its tip position comes from the model (`vaneTip`), not from a separate
 * animation, so it can never float off the roller or dig into it.
 */
function drawVane(ctx, st) {
  const psi = st.vaneAngle;
  const tip = st.vaneTip;
  const w = 44;

  ctx.save();
  ctx.rotate(psi);

  // Slot cut through the housing — stops at the outer wall rather than
  // projecting past it, which made the vane look like it had burst out.
  ctx.fillStyle = "#04080E";
  ctx.fillRect(R - 6, -w / 2 - 5, 118, w + 10);
  ctx.fillStyle = "rgba(150,184,214,0.14)";
  ctx.fillRect(R - 6, -w / 2 - 5, 118, 2);

  // Spring behind the vane. It compresses as the roller pushes the vane out,
  // which is the right way round: the spring is what keeps the tip in contact.
  const back = R + 104;
  const sx = Math.min(st.vaneTip + 126, back - 22);
  ctx.save();
  ctx.translate(sx, 0);
  ctx.rotate(Math.PI / 2);
  spring(ctx, 0, 0, Math.max(back - sx, 20), 38, 4, clamp(1 - (back - sx) / 110, 0, 1));
  ctx.restore();

  // Blade.
  ctx.beginPath();
  rr(ctx, tip, -w / 2, Math.max(R + 96 - tip, 40), w, 7);
  ctx.fillStyle = steelSide(ctx, 0, 0, "#EAF3FB", "#8C9CAB", "#1A242E");
  const vg = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
  vg.addColorStop(0, "#1B2531");
  vg.addColorStop(0.3, "#D3E1EE");
  vg.addColorStop(0.6, "#6E7F90");
  vg.addColorStop(1, "#131C25");
  ctx.fillStyle = vg;
  ctx.fill();
  ctx.strokeStyle = "rgba(4,9,14,0.85)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Tip contact highlight — the seal that separates the two chambers.
  ctx.beginPath();
  ctx.arc(tip + 3, 0, w / 2 - 4, -Math.PI / 2, Math.PI / 2);
  ctx.strokeStyle = "rgba(190,226,255,0.55)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

/** The sliced bore face. Inner contour only, same convention as the cylinder. */
function drawBoreCut(ctx) {
  const p = new Path2D();
  p.arc(0, 0, R, 0, TAU);
  cutFace(ctx, p, 9);
}

export const rotaryMechanism = { id: "rotary", draw: drawRotary, gas() {} };
