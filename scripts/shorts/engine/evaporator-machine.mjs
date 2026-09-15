/**
 * Evaporator + suction line cutaway — the frost Short's real stage.
 *
 * ==================== ONE PATH, EVERYTHING ON IT ====================
 * The first version of this scene drew plumbing as independent coordinates
 * and the plumbing lied: every return bend sat on the opposite side from the
 * one the particles used, the liquid feed teed into the middle of a bend, and
 * the suction line was a second pipe butted against a capped tube end. This
 * rebuild derives ONE geometric flow path from `TOPOLOGY` in
 * `mechanisms/evaporator.mjs` — liquid line → metering device → coil passes
 * (bends generated between consecutive passes, never placed) → evaporator
 * outlet → suction line → compressor inlet — and everything hangs on it:
 * the drawn tubes ARE the path segments, the particles ride the same
 * parametrization, frost occupies a slice of the same line segment, and the
 * superheat clamp sits at a fraction of it. The picture cannot disagree with
 * the flow because there is nothing else to disagree with.
 *
 * `topologyAttestation()` measures the built geometry and is embedded into
 * `scene.json`; the module refuses to load if any measured check fails, so a
 * broken topology kills the render loudly instead of shipping a wrong frame.
 *
 * Composition (machine space, y down):
 *   liquid line       y 320, x -930..-642 — thin, warm subcooled liquid
 *   TXV body          x -642..-558 — closed metering device, internals off-story
 *   finned coil block x -440..110, y -300..390 — five passes, bottom-left in,
 *                     top-right out, air rising through the fins
 *   suction line      y -240, x 110..700 — continuous with the top pass;
 *                     where the frost forms; carries the superheat clamp
 *   compressor block  x 700..1040 — SECONDARY CONTEXT ONLY: a closed housing
 *                     at the end of the line, so the viewer knows where the
 *                     gas goes without the machine stealing the scene
 *
 * Same style constitution as every other scene: refrigerantColor() for the
 * gas, rim light on silhouettes, film grain from the shared background pass.
 * Frost gets its OWN whites (icy, desaturated) so ice never reads as cold
 * refrigerant. No cut faces here — nothing in this scene is sectioned; the
 * frost story happens on the OUTSIDE of the pipe.
 */
import { C, rgba, clamp, lerp, mix, refrigerantColor, refrigerantGlow } from "./style.mjs";
import { steelSide, ironSide, bolt, makeGrain, rimLight, hash, rr } from "./draw.mjs";
import { BOIL_COMPLETE_AT, OP, TOPOLOGY } from "../mechanisms/evaporator.mjs";
import { assertCycleAgreement, drawCycleContext, drawCycleDivides } from "./cycle-overview.mjs";

const TAU = Math.PI * 2;

/* --------------------------------------------------------------- geometry */

const COIL = { x0: -440, x1: 110, y0: -300, y1: 390 };
const PASS_GAP = 140;
const TUBE_R = 24;
const LIQ_R = 12;
const LINE_R = 27;
const LINE = { y: -240, x0: 110, x1: 700 };
const TXV = { x0: -642, x1: -558, cy: 320, h: 64 };
const LIQ_X0 = -930;
const COMP = { x0: 700, x1: 1040, y0: -350, y1: -130 };
/** Superheat clamp position on the line — near the outlet, where superheat is read. */
const CLAMP_X = 300;
/** Frost span on the line at full growth: outlet side toward (not yet at) the compressor. */
const FROST = { x0: LINE.x0 + 18, x1Min: LINE.x0 + 130, x1Max: LINE.x1 - 60 };

/** Anchor points for preset framing (operator convenience, no behaviour). */
export const ANCHORS = {
  txv: { x: (TXV.x0 + TXV.x1) / 2, y: TXV.cy },
  coilCenter: { x: (COIL.x0 + COIL.x1) / 2, y: (COIL.y0 + COIL.y1) / 2 },
  outlet: { x: LINE.x0, y: LINE.y },
  clamp: { x: CLAMP_X, y: LINE.y },
  lineMid: { x: (LINE.x0 + LINE.x1) / 2, y: LINE.y },
  compressor: { x: (COMP.x0 + COMP.x1) / 2, y: (COMP.y0 + COMP.y1) / 2 },
};

/* ------------------------------------------------------- the flow path */

/**
 * Build the one path everything rides. Pass geometry is DERIVED from
 * TOPOLOGY.coil: an odd passCount with inletSide "left" necessarily exits
 * right, and each return bend is generated between consecutive pass
 * endpoints — a bend cannot sit on the wrong side because it is never
 * placed, only connected.
 */
function buildPath() {
  const { passCount, inletSide } = TOPOLOGY.coil;
  if (passCount % 2 !== 1) {
    throw new Error(
      `evaporator topology: passCount ${passCount} is even — a ${inletSide}-side inlet would exit on the same side, but the suction line leaves on the ${TOPOLOGY.coil.outletSide}.`,
    );
  }
  // Passes bottom → top, evenly spaced, ending on LINE.y so the top pass IS
  // continuous with the suction line — no seam, no second pipe.
  const passY = Array.from({ length: passCount }, (_, i) => LINE.y + (passCount - 1 - i) * PASS_GAP);

  const segs = [];
  const add = (seg) => {
    const prev = segs[segs.length - 1];
    if (prev) {
      const [px, py] = segEnd(prev);
      const [sx, sy] = segStart(seg);
      if (Math.hypot(px - sx, py - sy) > 0.001) {
        throw new Error(
          `evaporator topology: path discontinuity between '${prev.station}' and '${seg.station}' (${px},${py}) -> (${sx},${sy})`,
        );
      }
    }
    seg.len = segLength(seg);
    segs.push(seg);
  };

  add({ kind: "line", station: "liquid-line", r: LIQ_R, a: [LIQ_X0, TXV.cy], b: [TXV.x0, TXV.cy] });
  add({ kind: "line", station: "metering-device", r: LIQ_R, a: [TXV.x0, TXV.cy], b: [TXV.x1, TXV.cy] });
  // Post-TXV feed into the first pass: already two-phase, full tube diameter.
  add({ kind: "line", station: "feed", r: TUBE_R, a: [TXV.x1, TXV.cy], b: [COIL.x0, passY[0]] });

  for (let i = 0; i < passCount; i++) {
    const leftToRight = i % 2 === 0; // inletSide "left": pass 0 runs left -> right
    const y = passY[i];
    add({
      kind: "line",
      station: "coil",
      pass: i,
      r: TUBE_R,
      a: [leftToRight ? COIL.x0 : COIL.x1, y],
      b: [leftToRight ? COIL.x1 : COIL.x0, y],
    });
    if (i < passCount - 1) {
      // The bend lives on whichever side this pass ENDED — by construction.
      const side = leftToRight ? "right" : "left";
      const x = leftToRight ? COIL.x1 : COIL.x0;
      const cy = (passY[i] + passY[i + 1]) / 2;
      add({
        kind: "arc",
        station: "coil",
        bendAfterPass: i,
        side,
        r: TUBE_R,
        cx: x,
        cy,
        radius: PASS_GAP / 2,
        // Flow enters at the lower pass (angle +90°) and leaves at the upper
        // (-90°), bulging east on the right side, west on the left.
        phi0: Math.PI / 2,
        phi1: side === "right" ? -Math.PI / 2 : (3 * Math.PI) / 2,
      });
    }
  }

  add({ kind: "line", station: "suction-line", r: LINE_R, a: [COIL.x1, LINE.y], b: [LINE.x1, LINE.y] });

  const total = segs.reduce((a, s) => a + s.len, 0);
  let acc = 0;
  for (const s of segs) {
    s.f0 = acc / total;
    acc += s.len;
    s.f1 = acc / total;
  }
  const fracOf = (station, which) => {
    const list = segs.filter((s) => s.station === station);
    return which === "start" ? list[0].f0 : list[list.length - 1].f1;
  };
  return {
    segs,
    total,
    txvStart: fracOf("metering-device", "start"),
    txvEnd: fracOf("metering-device", "end"),
    coilStart: fracOf("coil", "start"),
    coilEnd: fracOf("coil", "end"),
    lineStart: fracOf("suction-line", "start"),
  };
}

function segStart(s) {
  if (s.kind === "line") return s.a;
  return [s.cx + s.radius * Math.cos(s.phi0), s.cy + s.radius * Math.sin(s.phi0)];
}
function segEnd(s) {
  if (s.kind === "line") return s.b;
  return [s.cx + s.radius * Math.cos(s.phi1), s.cy + s.radius * Math.sin(s.phi1)];
}
function segLength(s) {
  if (s.kind === "line") return Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
  return Math.abs(s.phi1 - s.phi0) * s.radius;
}

export const PATH = buildPath();

// This file predates the shared loop layout and keeps its own copy of the
// evaporator-side numbers. That is allowed; disagreeing is not. A drift here
// would put the overview's evaporator somewhere the close-up's coil is not,
// and the camera move between them would lie about where the component
// lives — so it throws at import rather than rendering a falsehood.
assertCycleAgreement("evaporator-machine", {
  evaporator: { x0: COIL.x0, x1: COIL.x1, y0: COIL.y0, y1: COIL.y1 },
  metering: { x0: TXV.x0, x1: TXV.x1, cy: TXV.cy, h: TXV.h },
  compressor: { x0: COMP.x0, x1: COMP.x1, y0: COMP.y0, y1: COMP.y1 },
  suctionLine: { y: LINE.y, x0: LINE.x0, x1: LINE.x1 },
});

/** Point on the whole flow path, p in 0..1 from liquid line to compressor inlet. */
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

/** Back-compat helper: fraction along the COIL portion only (0 inlet, 1 outlet). */
export function coilPoint(p) {
  const f = lerp(PATH.coilStart, PATH.coilEnd, clamp(p, 0, 1));
  const pt = pathPoint(f);
  return { x: pt.x, y: pt.y, pass: pt.seg.pass ?? 0 };
}

/** Where along the whole path boiling completes (BOIL_COMPLETE_AT is coil-relative). */
const BOIL_PATH_FRAC = PATH.coilStart + (PATH.coilEnd - PATH.coilStart) * BOIL_COMPLETE_AT;

/* ------------------------------------------------------------ attestation */

/**
 * Measure the built geometry against the declared topology. Embedded into
 * scene.json by metadata.mjs (via the plug), re-checked by agent-side
 * Technical QA, and enforced at import: a false check refuses to load.
 */
export function topologyAttestation() {
  const passSegs = PATH.segs.filter((s) => s.station === "coil" && s.kind === "line");
  const bendSegs = PATH.segs.filter((s) => s.station === "coil" && s.kind === "arc");
  const first = passSegs[0];
  const last = passSegs[passSegs.length - 1];
  const lineSeg = PATH.segs.find((s) => s.station === "suction-line");
  const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5;

  const measured = {
    passCount: passSegs.length,
    passCountOdd: passSegs.length % 2 === 1,
    inletSide: first.a[0] < ANCHORS.coilCenter.x ? "left" : "right",
    inletAt: first.a[1] > ANCHORS.coilCenter.y ? "bottom" : "top",
    outletSide: last.b[0] > ANCHORS.coilCenter.x ? "right" : "left",
    outletAt: last.b[1] < ANCHORS.coilCenter.y ? "top" : "bottom",
    // The path builder already asserted continuity segment by segment; these
    // record the facts a reader (or QA) cares about.
    bendsGeneratedFromPath: bendSegs.length === passSegs.length - 1,
    outletMeetsSuctionLine: near([last.b[0], last.b[1]], lineSeg.a),
    meteringDeviceUpstreamOfCoil: PATH.txvEnd <= PATH.coilStart,
    liquidFeedEntersFirstPass: PATH.txvEnd < PATH.coilStart,
    frostSegmentOnSuctionLine: FROST.x0 >= LINE.x0 && FROST.x1Max <= LINE.x1,
    frostStartsAtOutletEnd: FROST.x0 - LINE.x0 < 40,
    frostStopsShortOfCompressor: FROST.x1Max < COMP.x0,
    superheatClampOnSuctionLine: CLAMP_X > LINE.x0 && CLAMP_X < LINE.x1,
    superheatClampNearOutlet: (CLAMP_X - LINE.x0) / (LINE.x1 - LINE.x0) < 0.4,
    airflowDirection: TOPOLOGY.airflow.direction,
    boilCompletesPastOutlet: BOIL_COMPLETE_AT > 1,
  };

  return {
    domain: TOPOLOGY.domain,
    declared: {
      flowOrder: TOPOLOGY.flowOrder,
      coil: TOPOLOGY.coil,
      airflow: TOPOLOGY.airflow,
      frost: TOPOLOGY.frost,
      superheatMeasurement: TOPOLOGY.superheatMeasurement,
    },
    measured,
  };
}

// Refuse to load with a wrong topology — a failed check here becomes a page
// error, which render.mjs treats as a fatal pre-render failure (exit 1).
{
  const att = topologyAttestation();
  const failed = Object.entries(att.measured).filter(([, v]) => v === false).map(([k]) => k);
  const declaredSide = TOPOLOGY.coil;
  if (
    failed.length > 0 ||
    att.measured.inletSide !== declaredSide.inletSide ||
    att.measured.outletSide !== declaredSide.outletSide ||
    att.measured.inletAt !== declaredSide.inletAt ||
    att.measured.outletAt !== declaredSide.outletAt
  ) {
    throw new Error(
      `evaporator topology attestation failed: ${failed.join(", ") || "declared/measured side mismatch"}`,
    );
  }
}

/* ------------------------------------------------------------------ scene */

let grain = null;

export function drawEvaporator(ctx, st) {
  if (!grain) grain = makeGrain(384, 384, 131);

  // ============ THE ORIENTATION LAYER, OPT-IN ============
  // Drawn only when a Short asks for it (`st.showCycle`), so the shipped
  // frost Short — whose state carries no such flag — renders exactly as it
  // always has. A story that opens on the whole system sets it, and gets the
  // rest of the loop behind this coil at the coordinates the shared layout
  // has always implied for it.
  if (st.showCycle) {
    drawCycleContext(ctx, st, { omit: "evaporator" });
    drawCycleDivides(ctx, st);
  }

  drawFins(ctx);
  drawAirflow(ctx, st);
  drawCircuit(ctx, st);
  drawRefrigerant(ctx, st);
  drawTxvBody(ctx);
  drawOutletCoupling(ctx, st);
  if (st.heatStory) drawHeatStory(ctx, st);
  drawFrost(ctx, st);
  // The clamp sits ON the ice — a technician clamps onto the frosted pipe,
  // and the payoff's "measure the superheat" needs the instrument readable,
  // not buried.
  drawClamp(ctx, st);
  drawCompressorContext(ctx);
}

/* ------------------------------------------------------------------ fins */

function drawFins(ctx) {
  ctx.save();
  // Plate fins: many thin verticals, parallel to the rising air. Drawn dim —
  // the tubes are the story.
  for (let x = COIL.x0; x <= COIL.x1; x += 22) {
    const g = ctx.createLinearGradient(x, COIL.y0, x, COIL.y1);
    g.addColorStop(0, "rgba(120,145,168,0.34)");
    g.addColorStop(0.5, "rgba(78,99,120,0.26)");
    g.addColorStop(1, "rgba(52,70,88,0.3)");
    ctx.fillStyle = g;
    ctx.fillRect(x, COIL.y0, 3, COIL.y1 - COIL.y0);
  }
  // Coil frame.
  const frame = new Path2D();
  rr(frame, COIL.x0 - 26, COIL.y0 - 26, COIL.x1 - COIL.x0 + 52, COIL.y1 - COIL.y0 + 52, 18);
  ctx.strokeStyle = "rgba(8,14,20,0.9)";
  ctx.lineWidth = 22;
  ctx.stroke(frame);
  ctx.strokeStyle = ironSide(ctx, COIL.x0 - 26, COIL.x1 - COIL.x0 + 52);
  ctx.lineWidth = 16;
  ctx.stroke(frame);
  rimLight(ctx, frame, 0.4, 0.16);
  bolt(ctx, COIL.x0 - 26, COIL.y0 - 26, 11);
  bolt(ctx, COIL.x1 + 26, COIL.y0 - 26, 11);
  bolt(ctx, COIL.x0 - 26, COIL.y1 + 26, 11);
  bolt(ctx, COIL.x1 + 26, COIL.y1 + 26, 11);
  ctx.restore();
}

/**
 * Air rising through the fins — direction comes from TOPOLOGY.airflow, and
 * the sparse, slow chevrons ARE the low-airflow condition the narration
 * names. A healthy coil would carry twice as many, twice as fast.
 */
function drawAirflow(ctx, st) {
  const up = TOPOLOGY.airflow.direction === "up" ? 1 : -1;
  const heat = clamp(st.airHeat ?? 0, 0, 1);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // ============ AIR IS BACKGROUND, OR AIR IS THE SUBJECT ============
  // On the frost story the air is context: nine faint chevrons, exactly as
  // shipped. On the heat story the air IS the lesson — frame inspection
  // showed the shipped density reading as a few grey scratches, which is
  // nowhere near enough to carry "the heat came out of this air" — so it
  // thickens and multiplies. One function, two intensities, chosen by a
  // field the frost story does not set.
  const COUNT = heat > 0 ? 26 : 9;
  for (let i = 0; i < COUNT; i++) {
    const s1 = hash(i * 7.3 + 3);
    const p = ((st.flow * 0.11 + s1) % 1 + 1) % 1;
    const x = lerp(COIL.x0 + 26, COIL.x1 - 26, heat > 0 ? (i + 0.5) / COUNT : s1);
    const yFrom = up === 1 ? COIL.y1 + 70 : COIL.y0 - 90;
    const yTo = up === 1 ? COIL.y0 - 90 : COIL.y1 + 70;
    const y = lerp(yFrom, yTo, p);
    const a = Math.sin(p * Math.PI) * 0.4;
    ctx.beginPath();
    // Chevron apex points the way the air moves.
    ctx.moveTo(x - 16, y + 14 * up);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 16, y + 14 * up);
    // ============ AIR GIVES UP ITS HEAT, VISIBLY ============
    // `st.airHeat` (absent on the frost story, so neutral there) tints the
    // chevrons warm where the air ENTERS and cools them as they cross the
    // coil. The refrigerant warms along its path while the air cools across
    // it: two gradients at right angles, which is what makes "the heat moved
    // from the air into the refrigerant" legible without saying it twice.
    const tint = heat > 0 ? mix("#FF9A52", "#8FD8FF", clamp(p * 1.15, 0, 1) * heat) : "#9FB6C8";
    ctx.strokeStyle = rgba(tint, a * (1 + heat * 1.6));
    ctx.lineWidth = heat > 0 ? 7 : 5;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------------------------------------ the circuit */

/**
 * Every tube in the scene is a stroke of a PATH segment — passes, bends,
 * liquid line, feed and suction line all come from the same builder, so the
 * drawn plumbing IS the flow path.
 */
function drawCircuit(ctx, st) {
  ctx.save();
  for (const seg of PATH.segs) {
    const p = new Path2D();
    if (seg.kind === "line") {
      p.moveTo(seg.a[0], seg.a[1]);
      p.lineTo(seg.b[0], seg.b[1]);
    } else {
      p.arc(seg.cx, seg.cy, seg.radius, seg.phi0, seg.phi1, seg.phi1 < seg.phi0);
    }
    ctx.lineCap = seg.station === "suction-line" || seg.station === "liquid-line" ? "butt" : "round";

    // Outline shadow.
    ctx.strokeStyle = "rgba(4,8,13,0.92)";
    ctx.lineWidth = seg.r * 2 + 10;
    ctx.stroke(p);

    // Metal body. Horizontal runs shade top-to-bottom; bends shade across.
    let g;
    if (seg.kind === "line") {
      const y = Math.min(seg.a[1], seg.b[1]);
      g = ctx.createLinearGradient(0, y - seg.r, 0, y + seg.r);
    } else {
      g = ctx.createLinearGradient(seg.cx - seg.radius, 0, seg.cx + seg.radius, 0);
    }
    const chillHere = seg.station === "suction-line" ? st.chill : 0;
    g.addColorStop(0, chillMix("#1B2B3A", chillHere));
    g.addColorStop(0.2, chillMix("#9DB6CB", chillHere));
    g.addColorStop(0.42, chillMix("#5B718C", chillHere));
    g.addColorStop(1, chillMix("#101A25", chillHere));
    ctx.strokeStyle = g;
    ctx.lineWidth = seg.r * 2;
    ctx.stroke(p);

    // Interior glow: the one colour rule — temperature, nothing else. Warm
    // subcooled liquid before the TXV; cold saturated two-phase after it.
    const tempC =
      seg.station === "liquid-line" || seg.station === "metering-device"
        ? OP.liquidLineTempC
        : OP.coilTempC + (seg.pass ?? 0) * 1.2;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(refrigerantGlow(tempC), seg.station === "suction-line" ? 0.2 : 0.16);
    ctx.lineWidth = seg.r * 1.4;
    ctx.stroke(p);
    ctx.restore();
  }
  ctx.restore();
}

/* ----------------------------------------------------------- refrigerant */

/**
 * One particle system for the whole path. Upstream of the TXV: solid warm
 * liquid. Across the TXV: the flash — colour and state snap cold. Along the
 * coil: DROPLETS (filled, deep cyan, heavy) shrink and thin as boiling
 * progresses, VAPOR puffs take over. With BOIL_COMPLETE_AT past 1.0 the last
 * droplets visibly ride out of the coil into the suction line — "still
 * boiling as it leaves the coil", watchable.
 */
function drawRefrigerant(ctx, st) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const N = 150;
  for (let i = 0; i < N; i++) {
    const s1 = hash(i * 3.9 + 11);
    const s2 = hash(i * 8.7 + 5);
    const p = ((st.flow * (0.05 + s1 * 0.028) + s2) % 1 + 1) % 1;
    const pt = pathPoint(p);
    const r0 = pt.seg.r;
    const jitter = (hash(i * 5.1) - 0.5) * r0 * 1.05;
    // Jitter perpendicular-ish: horizontal runs get y jitter; bends get both.
    const x = pt.x + (pt.seg.kind === "arc" ? (hash(i * 2.3) - 0.5) * r0 * 0.8 : 0);
    const y = pt.y + jitter;

    if (p < PATH.txvEnd) {
      // Subcooled liquid: dense, small, solid, warm — no glow.
      ctx.beginPath();
      ctx.arc(x, y, lerp(2.6, 4.2, s1), 0, TAU);
      ctx.fillStyle = rgba(refrigerantColor(OP.liquidLineTempC), 0.55);
      ctx.fill();
      continue;
    }

    // Two-phase after the flash: liquid share falls along the coil, reaching
    // zero just past the outlet (the low-superheat condition).
    const coilFrac = (p - PATH.coilStart) / (PATH.coilEnd - PATH.coilStart);
    // The state may name where boiling completes (a healthy coil finishes
    // INSIDE the passes; the frost story's fault carries it past the outlet).
    // Absent, the module constant stands — so the shipped Short is unchanged.
    const boilAt = st.boilCompleteAt ?? BOIL_COMPLETE_AT;
    const boilPathFrac = PATH.coilStart + (PATH.coilEnd - PATH.coilStart) * boilAt;
    const liquidShare = clamp(1 - Math.max(coilFrac, 0) / boilAt, 0, 1);
    const isDroplet = s2 < 0.2 + liquidShare * 0.62 && p < boilPathFrac;
    if (isDroplet) {
      const r = lerp(3, 7.5, s1) * (0.5 + liquidShare * 0.7);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fillStyle = rgba(C.coolDeep, 0.8);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, TAU);
      ctx.fillStyle = rgba(C.coolBright, 0.7);
      ctx.fill();
    } else {
      const r = lerp(3.5, 9, s1);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(refrigerantGlow(OP.coilTempC), 0.75));
      g.addColorStop(0.4, rgba(refrigerantColor(OP.coilTempC), 0.4));
      g.addColorStop(1, rgba(refrigerantColor(OP.coilTempC), 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/* -------------------------------------------------------------- hardware */

/** The metering device: a closed TXV body over the path. Internals are
 *  metering_device_process's story, deliberately not told here. */
function drawTxvBody(ctx) {
  const w = TXV.x1 - TXV.x0;
  const y0 = TXV.cy - TXV.h / 2;
  ctx.save();
  // Body.
  const body = new Path2D();
  rr(body, TXV.x0, y0, w, TXV.h, 10);
  ctx.fillStyle = "rgba(4,8,13,0.92)";
  ctx.fill(body);
  const g = ctx.createLinearGradient(0, y0, 0, y0 + TXV.h);
  g.addColorStop(0, "#8A6A4A");
  g.addColorStop(0.28, C.copperHi);
  g.addColorStop(0.55, C.copper);
  g.addColorStop(1, "#3E2A1B");
  ctx.fillStyle = g;
  const inner = new Path2D();
  rr(inner, TXV.x0 + 3, y0 + 3, w - 6, TXV.h - 6, 8);
  ctx.fill(inner);
  rimLight(ctx, body, 0.35, 0.18);
  // Diaphragm cap: the TXV's signature silhouette.
  const capR = 26;
  ctx.beginPath();
  ctx.arc(TXV.x0 + w / 2, y0 - 6, capR, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = "rgba(4,8,13,0.92)";
  ctx.fill();
  const cg = ctx.createLinearGradient(TXV.x0 + w / 2 - capR, 0, TXV.x0 + w / 2 + capR, 0);
  cg.addColorStop(0, "#2C3844");
  cg.addColorStop(0.35, "#9FB0C0");
  cg.addColorStop(1, "#39485A");
  ctx.beginPath();
  ctx.arc(TXV.x0 + w / 2, y0 - 6, capR - 3, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = cg;
  ctx.fill();
  // Port collars where the liquid line enters and the feed leaves.
  for (const px of [TXV.x0, TXV.x1]) {
    ctx.fillStyle = steelSide(ctx, px - 7, 14);
    ctx.fillRect(px - 7, TXV.cy - LIQ_R - 7, 14, (LIQ_R + 7) * 2);
  }
  ctx.restore();
}

/** Braze coupling where the coil hands the gas to the suction line — the
 *  evaporator outlet, made visible so "the line begins here" reads. */
function drawOutletCoupling(ctx, st) {
  const x = LINE.x0;
  ctx.save();
  const w = 30;
  ctx.fillStyle = "rgba(4,8,13,0.92)";
  ctx.fillRect(x - w / 2 - 3, LINE.y - LINE_R - 9, w + 6, (LINE_R + 9) * 2);
  const g = ctx.createLinearGradient(0, LINE.y - LINE_R - 6, 0, LINE.y + LINE_R + 6);
  g.addColorStop(0, chillMix("#31414F", st.chill));
  g.addColorStop(0.3, chillMix("#B8C9D8", st.chill));
  g.addColorStop(0.6, chillMix("#5E7183", st.chill));
  g.addColorStop(1, chillMix("#1A2530", st.chill));
  ctx.fillStyle = g;
  ctx.fillRect(x - w / 2, LINE.y - LINE_R - 6, w, (LINE_R + 6) * 2);
  ctx.restore();
}

/**
 * The superheat measurement point: a temperature clamp strapped to the line
 * just past the outlet — where a technician actually reads line temperature
 * against suction pressure. Highlighted only in the payoff window
 * (st.measureFocus), because that is when the narration sends the eye here.
 */
function drawClamp(ctx, st) {
  const x = CLAMP_X;
  const y = LINE.y;
  ctx.save();
  // Strap.
  ctx.fillStyle = "rgba(4,8,13,0.92)";
  ctx.fillRect(x - 12, y - LINE_R - 8, 24, (LINE_R + 8) * 2);
  ctx.fillStyle = steelSide(ctx, x - 9, 18, "#C7D5E2", "#66788A", "#18222C");
  ctx.fillRect(x - 9, y - LINE_R - 6, 18, (LINE_R + 6) * 2);
  // Probe body above the pipe.
  const body = new Path2D();
  rr(body, x - 20, y - LINE_R - 52, 40, 40, 7);
  ctx.fillStyle = "rgba(4,8,13,0.92)";
  ctx.fill(body);
  const g = ctx.createLinearGradient(0, y - LINE_R - 52, 0, y - LINE_R - 12);
  g.addColorStop(0, "#3A4858");
  g.addColorStop(0.4, "#8FA2B4");
  g.addColorStop(1, "#202B36");
  ctx.fillStyle = g;
  const inner = new Path2D();
  rr(inner, x - 17, y - LINE_R - 49, 34, 34, 6);
  ctx.fill(inner);
  // Pigtail lead, falling away right — enough to read "instrument".
  ctx.beginPath();
  ctx.moveTo(x + 18, y - LINE_R - 32);
  ctx.bezierCurveTo(x + 52, y - LINE_R - 36, x + 66, y - LINE_R - 10, x + 78, y - LINE_R + 14);
  ctx.strokeStyle = "rgba(12,18,26,0.9)";
  ctx.lineWidth = 5;
  ctx.stroke();

  // Payoff highlight: a pulsing ring, additive, only when the story points
  // here. Sized and weighted to survive the pull to the wide system view.
  const f = st.measureFocus;
  if (f > 0.01) {
    const pulse = 0.78 + 0.22 * Math.sin(st.theta * 2.2);
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    ctx.arc(x, y - 16, 62 + (1 - f) * 26, 0, TAU);
    ctx.strokeStyle = rgba(C.accent, 0.75 * f * pulse);
    ctx.lineWidth = 5;
    ctx.shadowColor = C.accent;
    ctx.shadowBlur = 24 * f;
    ctx.stroke();
  }
  ctx.restore();
}

/** Cheap toward-ice tint: lerp a hex toward pale blue-white by chill. */
function chillMix(hex6, chill) {
  const r = parseInt(hex6.slice(1, 3), 16);
  const g = parseInt(hex6.slice(3, 5), 16);
  const b = parseInt(hex6.slice(5, 7), 16);
  const t = chill * 0.45;
  return `rgb(${Math.round(lerp(r, 214, t))},${Math.round(lerp(g, 234, t))},${Math.round(lerp(b, 248, t))})`;
}

/* ----------------------------------------------------------------- frost */

/**
 * Ice on the pipe. Its OWN whites — icy, desaturated, crystalline — so frost
 * never reads as refrigerant. It grows along the suction line FROM the
 * outlet end TOWARD the compressor (never detached mid-pipe), and outward
 * with frostLevel, with hash-jagged accumulation and a few sparkle points.
 */
function drawFrost(ctx, st) {
  const f = clamp(st.frostLevel, 0, 1);
  if (f <= 0.01) return;
  const x0 = FROST.x0;
  const x1 = lerp(FROST.x1Min, FROST.x1Max, f);
  ctx.save();
  // Body of the accumulation: top-biased, jagged.
  for (let layer = 0; layer < 3; layer++) {
    const thick = (LINE_R + 6 + layer * 7) * (0.4 + f * 0.6);
    ctx.beginPath();
    let started = false;
    for (let x = x0; x <= x1; x += 9) {
      const n = hash(x * 0.71 + layer * 31);
      const y = LINE.y - thick - n * 9 * f;
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    for (let x = x1; x >= x0; x -= 9) {
      const n = hash(x * 0.37 + layer * 17);
      const y = LINE.y + thick * 0.75 + n * 7 * f;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(226,240,252,${0.16 + layer * 0.1 * f})`;
    ctx.fill();
  }
  // Crystalline sparkles.
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 26; i++) {
    const s1 = hash(i * 9.3 + 7);
    if (s1 > f) continue;
    const x = lerp(x0, x1, hash(i * 4.7));
    const y = LINE.y + (hash(i * 6.1) - 0.5) * (LINE_R * 2.4);
    ctx.fillStyle = `rgba(240,250,255,${0.5 + s1 * 0.4})`;
    ctx.fillRect(x, y, 2.4, 2.4);
  }
  ctx.restore();
}

/* ------------------------------------------------- compressor as context */

/** A closed housing at the end of the line. Present, labelled-able, silent.
 *  The line enters through a neutral steel flange — cool side, so no warm
 *  cut-face language anywhere near it. */
function drawCompressorContext(ctx) {
  ctx.save();
  const p = new Path2D();
  rr(p, COMP.x0, COMP.y0, COMP.x1 - COMP.x0, COMP.y1 - COMP.y0, 26);
  ctx.fillStyle = ironSide(ctx, COMP.x0, COMP.x1 - COMP.x0);
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  ctx.globalAlpha = 0.4;
  ctx.drawImage(grain, COMP.x0, COMP.y0, COMP.x1 - COMP.x0, COMP.y1 - COMP.y0);
  ctx.restore();
  ctx.strokeStyle = "rgba(4,9,14,0.85)";
  ctx.lineWidth = 3;
  ctx.stroke(p);
  rimLight(ctx, p, 0.4, 0.16);
  // Feet + a small terminal box: enough to read "compressor", nothing more.
  ctx.fillStyle = steelSide(ctx, COMP.x0 + 30, 60, "#B9C8D6", "#61717F", "#131C25");
  ctx.fillRect(COMP.x0 + 26, COMP.y1, 54, 16);
  ctx.fillRect(COMP.x1 - 80, COMP.y1, 54, 16);
  ctx.fillStyle = "#0E161E";
  rr(ctx, COMP.x1 - 96, COMP.y0 + 28, 56, 44, 8);
  ctx.fill();
  // Suction inlet flange: two neutral collars where the line enters.
  const collar = (x, w, rext) => {
    ctx.fillStyle = "rgba(4,8,13,0.92)";
    ctx.fillRect(x - 3, LINE.y - LINE_R - rext - 3, w + 6, (LINE_R + rext + 3) * 2);
    ctx.fillStyle = steelSide(ctx, x, w, "#AFC0CE", "#5C6E7E", "#141E28");
    ctx.fillRect(x, LINE.y - LINE_R - rext, w, (LINE_R + rext) * 2);
  };
  collar(COMP.x0 - 16, 14, 10);
  collar(COMP.x0 - 2, 8, 5);
  ctx.restore();
}

export const evaporatorScene = { id: "evaporator", draw: drawEvaporator, gas() {} };


/* ------------------------------------------------- the heat-absorption story */

/**
 * Labels for the "what does the evaporator DO" story, drawn only when a
 * Short asks for that story (`st.heatStory`). The frost Short sets no such
 * flag and is untouched.
 *
 * Placement follows the lesson learned on the condenser scene: one position,
 * in clear space BELOW the coil, with a dashed leader carrying which part of
 * the path is being named. Consistency means the viewer's eye learns where
 * to look once. One zone at a time, never all of them.
 */
function drawHeatStory(ctx, st) {
  const zone = st.zoneFocus ?? 0;
  const k = clamp(st.zoneFocusK ?? 0, 0, 1);
  if (zone === 0 || k <= 0.02) return;

  const spec =
    zone === 1
      ? { at: PATH.coilStart + 0.04, title: "HEAT IN", sub: "warm room air gives up its heat to the coil" }
      : zone === 2
        ? { at: lerp(PATH.coilStart, PATH.coilEnd, 0.55), title: "LOW-PRESSURE MIXTURE", sub: "that heat boils the liquid away along the passes" }
        : { at: PATH.lineStart, title: "LOW-PRESSURE VAPOR", sub: "leaving for the compressor, carrying the heat" };

  const pt = pathPoint(spec.at);
  const e = k < 1 ? 1 - (1 - k) * (1 - k) : 1; // ease-out without importing one
  const labelX = (COIL.x0 + COIL.x1) / 2;
  const labelY = COIL.y1 + 190 + (1 - e) * 26;

  ctx.save();
  ctx.globalAlpha *= e;
  ctx.strokeStyle = rgba(C.hudLine, 0.85);
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(pt.x, pt.y + 30);
  ctx.lineTo(pt.x, labelY - 30);
  ctx.lineTo(labelX, labelY - 30);
  ctx.stroke();
  ctx.setLineDash([]);

  drawLabelText(ctx, spec.title, labelX, labelY, 44, C.text);
  drawLabelText(ctx, spec.sub, labelX, labelY + 44, 34, rgba(C.textDim, 0.95));

  // The air pair, only on the air window: warm in at the bottom, cooler out
  // at the top. Two words, at the two ends of the thing they describe.
  if (zone === 1) {
    drawLabelText(ctx, "WARM RETURN AIR", labelX, COIL.y1 + 90, 32, rgba("#FF9A52", 0.95));
    drawLabelText(ctx, "COOLER AIR OUT", labelX, COIL.y0 - 70, 32, rgba("#8FD8FF", 0.95));
  }
  ctx.restore();
}

/** Centred text with the series' own shadow treatment. */
function drawLabelText(ctx, str, x, y, px, fill) {
  ctx.save();
  ctx.font = `650 ${px}px "Segoe UI", "Inter", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.75)";
  ctx.shadowBlur = 14;
  ctx.fillStyle = fill;
  ctx.fillText(str, x, y);
  ctx.restore();
}
