/**
 * Twin-screw compressor cutaway — side view, along the rotor axis.
 *
 * Every other machine in this series is drawn looking down a shaft, because
 * their gas goes around. A screw's gas goes ALONG, so this one is drawn from
 * the side with the suction end at the left and the discharge end at the right,
 * and the Short's camera tracks in that direction.
 *
 * Drawing a helix in 2D: a lobe crest at axial fraction u sits at
 *   phi = TAU * (turns * u + lobeIndex / lobes)
 * and appears at y = cy + Rr*cos(phi), with sin(phi) telling us whether that
 * piece of the crest is on the near side of the rotor or the far side. Only the
 * near half is drawn bright; the far half is drawn dim and behind the gas. That
 * one depth test is what stops the rotors reading as flat zigzags.
 */
import { C, rgba, clamp, lerp, refrigerantColor, refrigerantGlow } from "./style.mjs";
import { cutFace, bolt, makeGrain, rimLight, hash, rr } from "./draw.mjs";
import { GEO } from "../mechanisms/screw.mjs";

const TAU = Math.PI * 2;

/** Machine-space layout. x runs suction (left) to discharge (right). */
export const L = {
  // Deliberately stubbier than a real screw compressor. A true rotor is long
  // and thin, which in a 9:16 frame leaves two thirds of the picture empty.
  // Fatter rotors over a shorter length keep the axial story — gas travelling
  // left to right — while actually filling a phone.
  x0: -460,
  x1: 460,
  maleY: -175,
  femaleY: 190,
  maleR: 190,
  femaleR: 165,
  /** Helix turns across the full rotor length. Fewer crests, less chain-link. */
  turns: 1.15,
};
L.len = L.x1 - L.x0;

let grain = null;

export function drawScrew(ctx, st) {
  if (!grain) grain = makeGrain(384, 384, 83);

  drawHousing(ctx);
  // Far-side crests, then gas, then near-side crests: the gas sits INSIDE.
  drawRotor(ctx, st, "female", false);
  drawRotor(ctx, st, "male", false);
  drawPockets(ctx, st);
  drawRotor(ctx, st, "female", true);
  drawRotor(ctx, st, "male", true);
  drawPorts(ctx, st);
  drawHousingCut(ctx);
}

/* ---------------------------------------------------------------- housing */

function drawHousing(ctx) {
  const top = L.maleY - L.maleR - 76;
  const bot = L.femaleY + L.femaleR + 76;
  ctx.save();
  ctx.beginPath();
  rr(ctx, L.x0 - 96, top, L.len + 192, bot - top, 74);
  const g = ctx.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, "#101A24");
  g.addColorStop(0.18, "#34465A");
  g.addColorStop(0.46, "#54697E");
  g.addColorStop(0.74, "#26333F");
  g.addColorStop(1, "#0C131A");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  ctx.globalAlpha = 0.4;
  ctx.drawImage(grain, L.x0 - 96, top, L.len + 192, bot - top);
  ctx.restore();

  const shell = new Path2D();
  rr(shell, L.x0 - 96, top, L.len + 192, bot - top, 74);
  rimLight(ctx, shell, 0.45, 0.18);
  for (const x of [L.x0 - 48, 0, L.x1 + 48]) {
    bolt(ctx, x, top + 36, 13);
    bolt(ctx, x, bot - 36, 13);
  }

  // The bore the rotors run in: two overlapping cylinders, seen sectioned.
  ctx.save();
  ctx.beginPath();
  rr(ctx, L.x0 - 26, L.maleY - L.maleR - 14, L.len + 52, (L.femaleY + L.femaleR + 14) - (L.maleY - L.maleR - 14), 58);
  ctx.fillStyle = "#050A11";
  ctx.fill();
  const amb = ctx.createLinearGradient(0, L.maleY - L.maleR, 0, L.femaleY + L.femaleR);
  amb.addColorStop(0, "rgba(40,80,118,0.26)");
  amb.addColorStop(0.5, "rgba(14,30,48,0.1)");
  amb.addColorStop(1, "rgba(4,9,15,0.5)");
  ctx.fillStyle = amb;
  ctx.fill();
  ctx.restore();
}

/* ----------------------------------------------------------------- rotors */

function rotorSpec(which) {
  return which === "male"
    ? { cy: L.maleY, R: L.maleR, lobes: GEO.maleLobes, dir: 1 }
    : { cy: L.femaleY, R: L.femaleR, lobes: GEO.femaleFlutes, dir: -1 };
}

/**
 * One rotor's helical crests.
 *
 * `near` selects which half of each helix to draw. The far half is dim and is
 * painted before the gas; the near half is bright and is painted after it, so
 * the gas genuinely sits between the lobes instead of on top of them.
 */
function drawRotor(ctx, st, which, near) {
  const { cy, R, lobes, dir } = rotorSpec(which);
  const phase = st.revs * TAU * dir;

  // Rotor core: the shaft body the crests stand on.
  if (!near) {
    ctx.save();
    ctx.beginPath();
    rr(ctx, L.x0, cy - R * 0.46, L.len, R * 0.92, R * 0.46);
    const cg = ctx.createLinearGradient(0, cy - R * 0.46, 0, cy + R * 0.46);
    cg.addColorStop(0, "#16202B");
    cg.addColorStop(0.3, "#7F91A2");
    cg.addColorStop(0.52, "#465566");
    cg.addColorStop(1, "#0D141C");
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.lineCap = "round";
  const steps = 128;
  for (let j = 0; j < lobes; j++) {
    let started = false;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const phi = TAU * (L.turns * u * dir + j / lobes) + phase;
      const s = Math.sin(phi);
      const onThisSide = near ? s > 0 : s <= 0;
      if (!onThisSide) {
        started = false;
        continue;
      }
      const x = L.x0 + u * L.len;
      const y = cy + Math.cos(phi) * R;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    }
    ctx.lineWidth = near ? 26 : 20;
    ctx.strokeStyle = near ? "rgba(6,11,17,0.85)" : "rgba(4,8,13,0.8)";
    ctx.stroke();
    ctx.lineWidth = near ? 18 : 13;
    const lg = ctx.createLinearGradient(0, cy - R, 0, cy + R);
    if (near) {
      lg.addColorStop(0, "#9FB3C5");
      lg.addColorStop(0.4, "#E6F0FA");
      lg.addColorStop(0.75, "#7E90A2");
      lg.addColorStop(1, "#26323E");
    } else {
      lg.addColorStop(0, "#2A3745");
      lg.addColorStop(0.5, "#435364");
      lg.addColorStop(1, "#141C25");
    }
    ctx.strokeStyle = lg;
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------------------------------------------------------------- pockets */

/**
 * The trapped gas, one blob per pocket in flight.
 *
 * A pocket lives between two lobe crests, so it is drawn as a rounded band that
 * spans the gap between the rotors at its axial position. Its width shrinks
 * with its volume and its colour comes from its own state, which means the
 * four pockets on screen are at four different stages of compression at once —
 * exactly what a screw looks like.
 */
function drawPockets(ctx, st) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const pk of st.pockets) {
    const col = refrigerantColor(pk.tempC);
    const glow = refrigerantGlow(pk.tempC);
    const cx = L.x0 + pk.axial * L.len;
    const halfW = lerp(30, 104, pk.volumeFrac);
    const top = L.maleY - L.maleR * 0.5;
    const bot = L.femaleY + L.femaleR * 0.5;

    const g = ctx.createLinearGradient(cx - halfW, 0, cx + halfW, 0);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.5, rgba(col, 0.5));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    rr(ctx, cx - halfW, top, halfW * 2, bot - top, halfW * 0.7);
    ctx.fill();

    const n = Math.round(lerp(14, 40, pk.volumeFrac));
    for (let i = 0; i < n; i++) {
      const s1 = hash(i * 4.1 + pk.axial * 97);
      const s2 = hash(i * 7.9 + pk.axial * 53 + 11);
      const x = cx + (s1 - 0.5) * halfW * 1.7;
      const y = lerp(top + 10, bot - 10, s2);
      const r = lerp(5, 14, s2) * (0.7 + 0.5 * pk.volumeFrac);
      const pg = ctx.createRadialGradient(x, y, 0, x, y, r);
      pg.addColorStop(0, rgba(glow, 0.85));
      pg.addColorStop(0.4, rgba(col, 0.45));
      pg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ ports */

function drawPorts(ctx, st) {
  const top = L.maleY - L.maleR - 76;
  const bot = L.femaleY + L.femaleR + 76;

  // Suction: the whole left end is open to the suction chamber.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const sg = ctx.createLinearGradient(L.x0 - 96, 0, L.x0 + 130, 0);
  sg.addColorStop(0, rgba(C.cool, 0.34));
  sg.addColorStop(1, rgba(C.cool, 0));
  ctx.fillStyle = sg;
  ctx.fillRect(L.x0 - 96, top, 226, bot - top);

  // Discharge: a fixed opening at the axial position the geometry dictates.
  const px = L.x0 + GEO.portAt * L.len;
  const dg = ctx.createLinearGradient(px, 0, L.x1 + 96, 0);
  dg.addColorStop(0, rgba(C.hot, 0));
  dg.addColorStop(1, rgba(C.hot, st.discharging ? 0.46 : 0.2));
  ctx.fillStyle = dg;
  ctx.fillRect(px, top, L.x1 + 96 - px, bot - top);
  ctx.restore();

  // The port edge is a hard line, because on a screw it is machined and fixed.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(px, top + 12);
  ctx.lineTo(px, bot - 12);
  ctx.strokeStyle = rgba(C.hotBright, 0.5);
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

/** Sliced housing faces. Inner contour only, same convention as the rest. */
function drawHousingCut(ctx) {
  const p = new Path2D();
  rr(p, L.x0 - 26, L.maleY - L.maleR - 14, L.len + 52, (L.femaleY + L.femaleR + 14) - (L.maleY - L.maleR - 14), 58);
  cutFace(ctx, p, 9);
  void clamp;
}

export const screwMechanism = { id: "screw", draw: drawScrew, gas() {} };
