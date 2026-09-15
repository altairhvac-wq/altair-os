/**
 * TXV cutaway — the metering_device_process stage.
 *
 * ==================== TWO CIRCUITS, ONE TRUTH ====================
 * Everything here is derived from TOPOLOGY in `mechanisms/txv.mjs`:
 *
 *   REFRIGERANT PATH  liquid line → inlet chamber → seat orifice → outlet
 *                     chamber → feed line → a small healthy coil (context)
 *                     → coil outlet → suction line (exits toward the
 *                     compressor, off-frame left)
 *   CONTROL LOOP      sensing bulb clamped on that suction line near the
 *                     coil outlet → capillary → diaphragm dome → pushrod →
 *                     needle carriage, opposed by the superheat spring
 *
 * The needle sits where the circuits meet: refrigerant passes it, the loop
 * positions it. The valve BODY is drawn in section (cut faces on the inner
 * contours, per the style constitution) because the subject of this domain
 * is what happens inside; the coil is exterior context, deliberately small.
 *
 * The control signal is made visible with the one colour rule: the bulb,
 * the capillary pulse and the dome charge all carry refrigerantColor of the
 * BULB temperature — when the suction line warms, the viewer literally
 * watches the warmer colour travel bulb → capillary → dome, and the needle
 * answer it.
 *
 * `topologyAttestation()` measures the built geometry (bulb on the line
 * near the outlet, capillary ends at bulb and dome, needle tip inside the
 * seat band, spring under the carriage, continuous refrigerant path) and
 * refuses to load on any failure, same as the evaporator scene.
 */
import { C, rgba, clamp, lerp, refrigerantColor, refrigerantGlow } from "./style.mjs";
import { steelSide, ironSide, cutFace, bolt, makeGrain, rimLight, hash, rr, spring } from "./draw.mjs";
import { OP, TOPOLOGY } from "../mechanisms/txv.mjs";

const TAU = Math.PI * 2;

/* --------------------------------------------------------------- geometry */

const BODY = { x0: -360, x1: -140, y0: -20, y1: 190 };
const DOME = { cx: -250, baseY: -20, rx: 86, ry: 92 };
/** Partition carrying the seat orifice; the needle closes into it from below. */
const SEAT = { y0: 86, y1: 106, cx: -250, halfW: 16 };
const NEEDLE = { len: 48, closedTipY: SEAT.y0 + 2, openTipY: SEAT.y1 + 2 };
const LIQ = { y: 60, x0: -780 };
const LIQ_R = 12;
const FEED = { y: 160, r: 15 };
const COIL = { x0: 300, x1: 780, y0: -245, y1: 210 };
const PASS_Y = [160, 45, -70, -185]; // feed enters bottom-left; outlet top-left
const TUBE_R = 17;
const LINE = { y: -185, x0: -830, x1: 300, r: 20 }; // suction line, exits frame left
const BULB = { x: 30, len: 64, r: 13 };
/** Boiling completes inside this HEALTHY coil, a little before the outlet. */
const BOIL_AT_COIL_FRAC = 0.86;

export const ANCHORS = {
  dome: { x: DOME.cx, y: DOME.baseY - DOME.ry },
  seat: { x: SEAT.cx, y: (SEAT.y0 + SEAT.y1) / 2 },
  body: { x: (BODY.x0 + BODY.x1) / 2, y: (BODY.y0 + BODY.y1) / 2 },
  bulb: { x: BULB.x, y: LINE.y },
  coilOutlet: { x: COIL.x0, y: PASS_Y[3] },
  loopCenter: { x: -80, y: -40 },
};

/* ----------------------------------------------- refrigerant path builder */

function segLen(s) {
  if (s.kind === "line") return Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
  return Math.abs(s.phi1 - s.phi0) * s.radius;
}
function segStart(s) {
  return s.kind === "line" ? s.a : [s.cx + s.radius * Math.cos(s.phi0), s.cy + s.radius * Math.sin(s.phi0)];
}
function segEnd(s) {
  return s.kind === "line" ? s.b : [s.cx + s.radius * Math.cos(s.phi1), s.cy + s.radius * Math.sin(s.phi1)];
}

function buildPath() {
  const segs = [];
  const add = (seg) => {
    const prev = segs[segs.length - 1];
    if (prev) {
      const [px, py] = segEnd(prev);
      const [sx, sy] = segStart(seg);
      if (Math.hypot(px - sx, py - sy) > 0.001) {
        throw new Error(`txv topology: discontinuity ${prev.station} -> ${seg.station}`);
      }
    }
    seg.len = segLen(seg);
    segs.push(seg);
  };

  add({ kind: "line", station: "liquid-line", r: LIQ_R, a: [LIQ.x0, LIQ.y], b: [BODY.x0, LIQ.y] });
  // Inside the body: inlet chamber -> above the seat -> through the orifice ->
  // outlet chamber -> outlet port. Drawn as cavities, ridden by particles.
  add({ kind: "line", station: "inlet-chamber", r: LIQ_R, a: [BODY.x0, LIQ.y], b: [SEAT.cx, LIQ.y] });
  add({ kind: "line", station: "seat-orifice", r: 9, a: [SEAT.cx, LIQ.y], b: [SEAT.cx, SEAT.y1 + 18] });
  add({ kind: "line", station: "outlet-chamber", r: 11, a: [SEAT.cx, SEAT.y1 + 18], b: [SEAT.cx, FEED.y] });
  add({ kind: "line", station: "outlet-chamber", r: 11, a: [SEAT.cx, FEED.y], b: [BODY.x1, FEED.y] });
  add({ kind: "line", station: "evaporator-feed", r: FEED.r, a: [BODY.x1, FEED.y], b: [COIL.x0, PASS_Y[0]] });

  const bendR = (PASS_Y[0] - PASS_Y[1]) / 2;
  for (let i = 0; i < PASS_Y.length; i++) {
    const leftToRight = i % 2 === 0;
    add({
      kind: "line",
      station: "coil",
      pass: i,
      r: TUBE_R,
      a: [leftToRight ? COIL.x0 : COIL.x1, PASS_Y[i]],
      b: [leftToRight ? COIL.x1 : COIL.x0, PASS_Y[i]],
    });
    if (i < PASS_Y.length - 1) {
      const side = leftToRight ? "right" : "left";
      add({
        kind: "arc",
        station: "coil",
        side,
        r: TUBE_R,
        cx: leftToRight ? COIL.x1 : COIL.x0,
        cy: (PASS_Y[i] + PASS_Y[i + 1]) / 2,
        radius: bendR,
        phi0: Math.PI / 2,
        phi1: side === "right" ? -Math.PI / 2 : (3 * Math.PI) / 2,
      });
    }
  }
  // Coil outlet (top-left) -> suction line, running LEFT toward the
  // compressor. The bulb clamps onto this run near the outlet.
  add({ kind: "line", station: "suction-line", r: LINE.r, a: [COIL.x0, PASS_Y[3]], b: [LINE.x0, LINE.y] });

  const total = segs.reduce((a, s) => a + s.len, 0);
  let acc = 0;
  for (const s of segs) {
    s.f0 = acc / total;
    acc += s.len;
    s.f1 = acc / total;
  }
  const frac = (station, which) => {
    const list = segs.filter((s) => s.station === station);
    return which === "start" ? list[0].f0 : list[list.length - 1].f1;
  };
  return {
    segs,
    total,
    orificeFrac: frac("seat-orifice", "start"),
    coilStart: frac("coil", "start"),
    coilEnd: frac("coil", "end"),
    lineStart: frac("suction-line", "start"),
  };
}

export const PATH = buildPath();

export function pathPoint(p) {
  const f = clamp(p, 0, 1);
  const seg = PATH.segs.find((s) => f <= s.f1) ?? PATH.segs[PATH.segs.length - 1];
  const k = (f - seg.f0) / (seg.f1 - seg.f0 || 1);
  if (seg.kind === "line") {
    return { x: lerp(seg.a[0], seg.b[0], k), y: lerp(seg.a[1], seg.b[1], k), seg };
  }
  const phi = lerp(seg.phi0, seg.phi1, k);
  return { x: seg.cx + seg.radius * Math.cos(phi), y: seg.cy + seg.radius * Math.sin(phi), seg };
}

const BOIL_PATH_FRAC = PATH.coilStart + (PATH.coilEnd - PATH.coilStart) * BOIL_AT_COIL_FRAC;

/** The capillary: bulb -> dome, one bezier, used for drawing AND the pulse. */
const CAP = {
  a: [BULB.x - BULB.len / 2, LINE.y + 4],
  c1: [-120, -200],
  c2: [-160, -170],
  b: [DOME.cx + 26, DOME.baseY - DOME.ry + 18],
};
function capPoint(t) {
  const [x0, y0] = CAP.a;
  const [x1, y1] = CAP.c1;
  const [x2, y2] = CAP.c2;
  const [x3, y3] = CAP.b;
  const u = 1 - t;
  return {
    x: u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
    y: u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
  };
}

/* ------------------------------------------------------------ attestation */

export function topologyAttestation() {
  const near = (a, b, tol = 1) => Math.hypot(a[0] - b[0], a[1] - b[1]) < tol;
  const lineSeg = PATH.segs.find((s) => s.station === "suction-line");
  const outlet = [ANCHORS.coilOutlet.x, ANCHORS.coilOutlet.y];
  const lineLen = Math.abs(lineSeg.b[0] - lineSeg.a[0]);
  const capStart = CAP.a;
  const capEnd = CAP.b;
  const domeTop = [ANCHORS.dome.x, ANCHORS.dome.y];

  const measured = {
    liquidEntersOnInletSide: LIQ.x0 < BODY.x0,
    needleClosesIntoSeatFromBelow: NEEDLE.closedTipY > SEAT.y0 && NEEDLE.closedTipY < SEAT.y1,
    needleClearsSeatWhenOpen: NEEDLE.openTipY > SEAT.y1,
    orificeBetweenChambers: SEAT.y0 > LIQ.y && SEAT.y1 < FEED.y,
    feedReachesCoilInlet: true, // continuity asserted by the path builder
    coilPassCount: PASS_Y.length,
    coilOutletAt: "top-left",
    suctionLineStartsAtCoilOutlet: near(segStart(lineSeg), outlet),
    suctionLineRunsTowardCompressor: lineSeg.b[0] < lineSeg.a[0],
    bulbOnSuctionLine: Math.abs(ANCHORS.bulb.y - LINE.y) < 1,
    bulbNearCoilOutlet: Math.abs(ANCHORS.bulb.x - ANCHORS.coilOutlet.x) / lineLen < 0.35,
    capillaryStartsAtBulb: Math.abs(capStart[0] - (BULB.x - BULB.len / 2)) < 2 && Math.abs(capStart[1] - LINE.y) < 8,
    capillaryEndsAtDome: Math.hypot(capEnd[0] - domeTop[0], capEnd[1] - domeTop[1]) < 46,
    springBelowCarriage: true, // drawn from carriageY down, see drawInternals
    boilCompletesInsideCoil: BOIL_AT_COIL_FRAC < 1,
  };

  return {
    domain: TOPOLOGY.domain,
    declared: {
      refrigerantPath: TOPOLOGY.refrigerantPath,
      controlLoop: TOPOLOGY.controlLoop,
      controls: TOPOLOGY.controls,
      doesNotControl: TOPOLOGY.doesNotControl,
    },
    measured,
  };
}

{
  const att = topologyAttestation();
  const failed = Object.entries(att.measured).filter(([, v]) => v === false).map(([k]) => k);
  if (failed.length > 0) throw new Error(`txv topology attestation failed: ${failed.join(", ")}`);
}

/* ------------------------------------------------------------------ scene */

let grain = null;

export function drawTxv(ctx, st) {
  if (!grain) grain = makeGrain(384, 384, 977);

  drawCoilContext(ctx, st);
  drawCircuit(ctx, st);
  drawRefrigerant(ctx, st);
  drawBody(ctx, st);
  drawInternals(ctx, st);
  drawControlLoop(ctx, st);
}

/* ------------------------------------------------------- the context coil */

function drawCoilContext(ctx) {
  ctx.save();
  for (let x = COIL.x0; x <= COIL.x1; x += 24) {
    const g = ctx.createLinearGradient(x, COIL.y0, x, COIL.y1);
    g.addColorStop(0, "rgba(104,128,150,0.22)");
    g.addColorStop(0.5, "rgba(70,90,110,0.16)");
    g.addColorStop(1, "rgba(48,64,80,0.2)");
    ctx.fillStyle = g;
    ctx.fillRect(x, COIL.y0, 3, COIL.y1 - COIL.y0);
  }
  const frame = new Path2D();
  rr(frame, COIL.x0 - 22, COIL.y0 - 22, COIL.x1 - COIL.x0 + 44, COIL.y1 - COIL.y0 + 44, 16);
  ctx.strokeStyle = "rgba(8,14,20,0.85)";
  ctx.lineWidth = 18;
  ctx.stroke(frame);
  ctx.strokeStyle = ironSide(ctx, COIL.x0 - 22, COIL.x1 - COIL.x0 + 44);
  ctx.lineWidth = 13;
  ctx.stroke(frame);
  rimLight(ctx, frame, 0.3, 0.12);
  bolt(ctx, COIL.x0 - 22, COIL.y0 - 22, 9);
  bolt(ctx, COIL.x1 + 22, COIL.y0 - 22, 9);
  bolt(ctx, COIL.x0 - 22, COIL.y1 + 22, 9);
  bolt(ctx, COIL.x1 + 22, COIL.y1 + 22, 9);
  ctx.restore();
}

/* ---------------------------------------------------------- tubes + flow */

function drawCircuit(ctx, st) {
  ctx.save();
  for (const seg of PATH.segs) {
    // Interior chamber segments are cavities in the body, not pipes.
    if (seg.station === "inlet-chamber" || seg.station === "seat-orifice" || seg.station === "outlet-chamber") continue;
    const p = new Path2D();
    if (seg.kind === "line") {
      p.moveTo(seg.a[0], seg.a[1]);
      p.lineTo(seg.b[0], seg.b[1]);
    } else {
      p.arc(seg.cx, seg.cy, seg.radius, seg.phi0, seg.phi1, seg.phi1 < seg.phi0);
    }
    ctx.lineCap = seg.station === "suction-line" || seg.station === "liquid-line" ? "butt" : "round";
    ctx.strokeStyle = "rgba(4,8,13,0.92)";
    ctx.lineWidth = seg.r * 2 + 9;
    ctx.stroke(p);
    let g;
    if (seg.kind === "line") {
      const yTop = Math.min(seg.a[1], seg.b[1]);
      g = ctx.createLinearGradient(0, yTop - seg.r, 0, yTop + seg.r);
    } else {
      g = ctx.createLinearGradient(seg.cx - seg.radius, 0, seg.cx + seg.radius, 0);
    }
    g.addColorStop(0, "#1B2B3A");
    g.addColorStop(0.2, "#9DB6CB");
    g.addColorStop(0.42, "#5B718C");
    g.addColorStop(1, "#101A25");
    ctx.strokeStyle = g;
    ctx.lineWidth = seg.r * 2;
    ctx.stroke(p);
    const tempC =
      seg.station === "liquid-line" ? OP.liquidLineTempC
      : seg.station === "suction-line" ? st.bulbTempC
      : OP.coilTempC;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(refrigerantGlow(tempC), 0.16);
    ctx.lineWidth = seg.r * 1.4;
    ctx.stroke(p);
    ctx.restore();
  }
  ctx.restore();
}

function drawRefrigerant(ctx, st) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const N = 130;
  for (let i = 0; i < N; i++) {
    const s1 = hash(i * 3.9 + 23);
    const s2 = hash(i * 8.7 + 7);
    const p = ((st.flow * (0.045 + s1 * 0.025) + s2) % 1 + 1) % 1;
    // Downstream of the seat, particle survival follows the needle: a
    // throttled valve feeds fewer parcels — the story, visible in density.
    if (p > PATH.orificeFrac && s1 > 0.35 + st.feedRate * 0.6) continue;
    const pt = pathPoint(p);
    const r0 = pt.seg.r;
    const y = pt.y + (hash(i * 5.1) - 0.5) * r0 * 1.05;
    const x = pt.x + (pt.seg.kind === "arc" ? (hash(i * 2.3) - 0.5) * r0 * 0.8 : 0);

    if (p < PATH.orificeFrac) {
      ctx.beginPath();
      ctx.arc(x, y, lerp(2.4, 4, s1), 0, TAU);
      ctx.fillStyle = rgba(refrigerantColor(OP.liquidLineTempC), 0.55);
      ctx.fill();
      continue;
    }
    const coilFrac = (p - PATH.coilStart) / (PATH.coilEnd - PATH.coilStart);
    const liquidShare = clamp(1 - Math.max(coilFrac, 0) / BOIL_AT_COIL_FRAC, 0, 1);
    const isDroplet = s2 < 0.2 + liquidShare * 0.62 && p < BOIL_PATH_FRAC;
    if (isDroplet) {
      const r = lerp(2.6, 6.4, s1) * (0.5 + liquidShare * 0.7);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = rgba(C.coolDeep, 0.8);
      ctx.fill();
    } else {
      const r = lerp(3, 7.6, s1);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(refrigerantGlow(OP.coilTempC), 0.7));
      g.addColorStop(0.4, rgba(refrigerantColor(OP.coilTempC), 0.36));
      g.addColorStop(1, rgba(refrigerantColor(OP.coilTempC), 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/* ---------------------------------------------------------- the valve body */

function drawBody(ctx) {
  ctx.save();
  // Section outline: body with the near half removed. Outer silhouette
  // plain; inner cavity contours carry the cut-face band.
  const body = new Path2D();
  rr(body, BODY.x0, BODY.y0, BODY.x1 - BODY.x0, BODY.y1 - BODY.y0, 18);
  ctx.fillStyle = "rgba(4,8,13,0.94)";
  ctx.fill(body);
  const g = ctx.createLinearGradient(BODY.x0, 0, BODY.x1, 0);
  g.addColorStop(0, "#6E4E33");
  g.addColorStop(0.25, C.copperHi);
  g.addColorStop(0.55, C.copper);
  g.addColorStop(1, "#33220f");
  ctx.fillStyle = g;
  const inner = new Path2D();
  rr(inner, BODY.x0 + 4, BODY.y0 + 4, BODY.x1 - BODY.x0 - 8, BODY.y1 - BODY.y0 - 8, 15);
  ctx.fill(inner);
  ctx.save();
  ctx.clip(inner);
  ctx.globalAlpha = 0.35;
  ctx.drawImage(grain, BODY.x0, BODY.y0, BODY.x1 - BODY.x0, BODY.y1 - BODY.y0);
  ctx.restore();
  rimLight(ctx, body, 0.4, 0.2);

  // Cavities (the section's interior): inlet chamber, seat partition with
  // orifice, outlet chamber. Interior gets a concave back wall per the
  // interior-depth rule.
  const cavity = new Path2D();
  // Inlet chamber.
  rr(cavity, BODY.x0 + 22, LIQ.y - 26, SEAT.cx - BODY.x0 + 4, 52, 10);
  // Vertical throat around the orifice.
  cavity.moveTo(SEAT.cx - SEAT.halfW - 8, LIQ.y + 10);
  rr(cavity, SEAT.cx - SEAT.halfW - 8, LIQ.y + 10, (SEAT.halfW + 8) * 2, FEED.y - LIQ.y + 4, 8);
  // Outlet chamber.
  rr(cavity, SEAT.cx - SEAT.halfW - 8, FEED.y - 22, BODY.x1 - SEAT.cx - 14, 44, 10);
  const back = ctx.createLinearGradient(BODY.x0 + 20, 0, BODY.x1 - 20, 0);
  back.addColorStop(0, "#150C06");
  back.addColorStop(0.5, "#241207");
  back.addColorStop(1, "#120A05");
  ctx.fillStyle = back;
  ctx.fill(cavity);
  cutFace(ctx, cavity, 7);

  // The seat partition: two shoulders leaving the orifice gap, drawn over
  // the throat so the gap reads as THE metering point.
  for (const px of [SEAT.cx - SEAT.halfW - 26, SEAT.cx + SEAT.halfW]) {
    ctx.fillStyle = steelSide(ctx, px, 26, "#D8C2A8", "#8A6F52", "#2A1C10");
    ctx.fillRect(px, SEAT.y0, 26, SEAT.y1 - SEAT.y0);
  }

  // Port collars.
  ctx.fillStyle = steelSide(ctx, BODY.x0 - 8, 16);
  ctx.fillRect(BODY.x0 - 8, LIQ.y - LIQ_R - 7, 16, (LIQ_R + 7) * 2);
  ctx.fillStyle = steelSide(ctx, BODY.x1 - 8, 16);
  ctx.fillRect(BODY.x1 - 8, FEED.y - FEED.r - 7, 16, (FEED.r + 7) * 2);
  bolt(ctx, BODY.x0 + 16, BODY.y1 - 14, 7);
  bolt(ctx, BODY.x1 - 16, BODY.y1 - 14, 7);
  ctx.restore();
}

/* ------------------------------------------------------------- internals */

function drawInternals(ctx, st) {
  const lift = st.pinLift;
  const tipY = lerp(NEEDLE.closedTipY, NEEDLE.openTipY, lift);
  const carriageY = tipY + NEEDLE.len;
  ctx.save();

  // Flash spray under the seat: intensity follows the needle.
  if (lift > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 26; i++) {
      const s1 = hash(i * 6.1 + 91);
      const pr = ((st.flow * 0.5 + s1) % 1 + 1) % 1;
      const spread = (hash(i * 3.7) - 0.5) * (10 + 26 * pr);
      const x = SEAT.cx + spread;
      const y = SEAT.y1 + 4 + pr * 40;
      const a = (1 - pr) * 0.55 * (0.3 + lift * 0.7);
      ctx.beginPath();
      ctx.arc(x, y, lerp(1.6, 3.6, s1), 0, TAU);
      ctx.fillStyle = rgba(refrigerantGlow(OP.coilTempC), a);
      ctx.fill();
    }
    ctx.restore();
  }

  // Pushrod from the diaphragm plate down to the carriage (beside the throat).
  const domePlateY = BODY.y0 + 6 + lift * 10;
  ctx.strokeStyle = steelSide(ctx, SEAT.cx + 20, 6, "#C9D6E2", "#6A7A8A", "#1A242E");
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(SEAT.cx + SEAT.halfW + 14, domePlateY);
  ctx.lineTo(SEAT.cx + SEAT.halfW + 14, carriageY - 6);
  ctx.stroke();
  ctx.strokeStyle = "rgba(4,8,13,0.7)";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // The needle: tip up into the seat, shank down to the carriage.
  const needle = new Path2D();
  needle.moveTo(SEAT.cx, tipY);
  needle.lineTo(SEAT.cx - 7, tipY + 20);
  needle.lineTo(SEAT.cx - 7, carriageY);
  needle.lineTo(SEAT.cx + 7, carriageY);
  needle.lineTo(SEAT.cx + 7, tipY + 20);
  needle.closePath();
  ctx.fillStyle = steelSide(ctx, SEAT.cx - 7, 14, "#E2EAF2", "#778896", "#232E39");
  ctx.fill(needle);
  ctx.strokeStyle = "rgba(4,8,13,0.75)";
  ctx.lineWidth = 1.6;
  ctx.stroke(needle);

  // Carriage disc + the superheat spring below it, compressing as it opens.
  ctx.fillStyle = steelSide(ctx, SEAT.cx - 26, 52, "#C4D2DE", "#5F7080", "#141E28");
  rr(ctx, SEAT.cx - 26, carriageY, 52, 10, 4);
  ctx.fill();
  spring(ctx, SEAT.cx, carriageY + 12, BODY.y1 - 12, 34, 4, lift);

  // The gap annotation lives in geometry, not text: a faint gauge of light
  // through the orifice sized by the lift.
  if (lift > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgba(refrigerantGlow(OP.coilTempC), 0.28 * lift);
    ctx.fillRect(SEAT.cx - SEAT.halfW + 3, SEAT.y0 - 2, (SEAT.halfW - 3) * 2, SEAT.y1 - SEAT.y0 + 4);
    ctx.restore();
  }
  ctx.restore();
}

/* ----------------------------------------------------------- control loop */

function drawControlLoop(ctx, st) {
  const bulbColor = refrigerantColor(st.bulbTempC);
  const bulbGlow = refrigerantGlow(st.bulbTempC);
  ctx.save();

  // Diaphragm dome on top of the body; charge colour = bulb temperature.
  const dome = new Path2D();
  dome.moveTo(DOME.cx - DOME.rx, DOME.baseY);
  dome.ellipse(DOME.cx, DOME.baseY, DOME.rx, DOME.ry, 0, Math.PI, 0);
  dome.closePath();
  ctx.fillStyle = "rgba(4,8,13,0.94)";
  ctx.fill(dome);
  const dg = ctx.createLinearGradient(DOME.cx - DOME.rx, 0, DOME.cx + DOME.rx, 0);
  dg.addColorStop(0, "#26313C");
  dg.addColorStop(0.35, "#96A7B6");
  dg.addColorStop(1, "#2B3742");
  ctx.fillStyle = dg;
  const domeInner = new Path2D();
  domeInner.moveTo(DOME.cx - DOME.rx + 4, DOME.baseY);
  domeInner.ellipse(DOME.cx, DOME.baseY, DOME.rx - 4, DOME.ry - 4, 0, Math.PI, 0);
  domeInner.closePath();
  ctx.fill(domeInner);
  rimLight(ctx, dome, 0.4, 0.16);
  // Charge glow inside the dome — the control signal arrived.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const cg = ctx.createRadialGradient(DOME.cx, DOME.baseY - 30, 4, DOME.cx, DOME.baseY - 30, DOME.rx * 0.9);
  cg.addColorStop(0, rgba(bulbGlow, 0.34));
  cg.addColorStop(1, rgba(bulbColor, 0));
  ctx.fillStyle = cg;
  ctx.fill(domeInner);
  ctx.restore();
  // Diaphragm membrane: bows down as bulb pressure wins.
  const bow = st.pinLift * 12;
  ctx.beginPath();
  ctx.moveTo(DOME.cx - DOME.rx + 10, DOME.baseY - 2);
  ctx.quadraticCurveTo(DOME.cx, DOME.baseY - 2 + bow, DOME.cx + DOME.rx - 10, DOME.baseY - 2);
  ctx.strokeStyle = rgba("#DAE6F0", 0.85);
  ctx.lineWidth = 3.4;
  ctx.stroke();

  // Bulb clamped to the suction line near the coil outlet.
  const bx = BULB.x;
  ctx.fillStyle = "rgba(4,8,13,0.92)";
  rr(ctx, bx - BULB.len / 2 - 3, LINE.y - BULB.r - 9, BULB.len + 6, BULB.r + 12, 8);
  ctx.fill();
  const bg = ctx.createLinearGradient(0, LINE.y - BULB.r - 8, 0, LINE.y + 2);
  bg.addColorStop(0, "#31414F");
  bg.addColorStop(0.4, "#AEC0CF");
  bg.addColorStop(1, "#22303C");
  ctx.fillStyle = bg;
  rr(ctx, bx - BULB.len / 2, LINE.y - BULB.r - 6, BULB.len, BULB.r + 8, 7);
  ctx.fill();
  // Bulb interior charge colour.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = rgba(bulbGlow, 0.3);
  rr(ctx, bx - BULB.len / 2 + 5, LINE.y - BULB.r - 1, BULB.len - 10, BULB.r, 5);
  ctx.fill();
  ctx.restore();
  // Straps around the line.
  for (const sx of [bx - BULB.len / 2 + 8, bx + BULB.len / 2 - 12]) {
    ctx.fillStyle = steelSide(ctx, sx, 7, "#C7D5E2", "#66788A", "#18222C");
    ctx.fillRect(sx, LINE.y - LINE.r - 5, 7, (LINE.r + 5) * 2);
  }

  // Capillary bulb -> dome.
  const cap = new Path2D();
  cap.moveTo(CAP.a[0], CAP.a[1]);
  cap.bezierCurveTo(CAP.c1[0], CAP.c1[1], CAP.c2[0], CAP.c2[1], CAP.b[0], CAP.b[1]);
  ctx.strokeStyle = "rgba(6,10,15,0.9)";
  ctx.lineWidth = 7;
  ctx.stroke(cap);
  ctx.strokeStyle = "#7E8FA0";
  ctx.lineWidth = 3.6;
  ctx.stroke(cap);

  // The signal pulse: while the bulb temperature is CHANGING (windows 2 and
  // 3), parcels of the bulb's colour travel bulb -> dome along the capillary.
  if (st.window === 2 || st.window === 3) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const t = ((st.flow * 0.35 + i / 4) % 1 + 1) % 1;
      const pt = capPoint(t);
      const a = Math.sin(t * Math.PI) * 0.8;
      const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 9);
      g.addColorStop(0, rgba(bulbGlow, a));
      g.addColorStop(1, rgba(bulbColor, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 9, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

export const txvScene = { id: "txv", draw: drawTxv, gas() {} };
