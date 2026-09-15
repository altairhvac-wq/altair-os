/**
 * The full vapor-compression loop, as a reusable ORIENTATION LAYER.
 *
 * ==================== WHY THIS EXISTS ====================
 * Every Short in this series opened by cutting straight to a mechanism. A
 * technician recognises a TXV body or a coil pass instantly; a normal viewer
 * spends the first seconds asking "what am I looking at?" — and that is the
 * hook, spent. The fix the operator asked for is not a new style, it is a
 * new GRAMMAR: establish where we are, point at the component, then travel
 * into it.
 *
 * ==================== ONE WORLD, NOT TWO SCENES ====================
 * The obvious implementation is a separate "diagram" scene that hard-cuts
 * into the mechanism. That is exactly what this does NOT do, for the reason
 * the operator named: an overview that looks like a flat schematic and a
 * close-up that looks like a premium cutaway do not belong to the same
 * world, and the viewer feels the seam.
 *
 * So the loop is drawn in the SAME world coordinates the mechanism scenes
 * already use, in the same navy/metal/particle language, and the transition
 * from system to component is nothing but the camera moving. Spatial context
 * is preserved because it was never broken: the condenser the viewer saw at
 * the top right of the loop is the same condenser, at the same coordinates,
 * that fills the frame four seconds later.
 *
 * ==================== THE LAYOUT IS THE CONTRACT ====================
 * `CYCLE` below is the single source of truth for where every component
 * lives. `engine/evaporator-machine.mjs` was built before this module and
 * carries its own copy of the evaporator-side numbers; rather than rewrite a
 * proven, shipped scene, `assertCycleAgreement()` MEASURES that file's
 * geometry against this one at import time and throws on drift. Two files
 * may hold the numbers; they may not disagree.
 *
 * A scene draws the loop minus its own subject (`omit`), then draws its own
 * detailed cutaway at those same coordinates:
 *
 *   drawCycleContext(ctx, st, { omit: "condenser" });
 *   drawMyDetailedCondenser(ctx, st);
 *
 * and aims the camera with `focusCycleComponent("condenser")`.
 */
import { C, F, clamp, inv, lerp, mix, rgba, refrigerantColor, refrigerantGlow } from "./style.mjs";
import { rr, rimLight, bloom, text } from "./draw.mjs";

const TAU = Math.PI * 2;

/* ========================================================================= *
 *                        HIGH SIDE READS AS HIGH SIDE
 * ========================================================================= *
 * The series ramp (`refrigerantColor`) spans 10..90°C with VIOLET at its
 * midpoint, which is right for a compressor Short travelling the whole
 * range — and wrong for the high side, where a 46°C condensing temperature
 * landed exactly on that violet and made the hottest part of the system
 * read cool. Frame inspection caught it.
 *
 * So the high side gets its own narrow ramp: bright amber where the vapor
 * arrives, deep burnt orange where the subcooled liquid leaves. The
 * GRADIENT still carries the physics (it cools along the coil); the FAMILY
 * carries the pressure divide the operator's colour language promises —
 * orange/red is high side, cyan/blue is low side, always.
 */
export function highSideTint(tempC) {
  return mix("#B8532A", C.hotBright, inv(38, 90, tempC));
}
export function highSideGlow(tempC) {
  return mix(C.hot, "#FFE6B4", inv(38, 90, tempC));
}

/* ========================================================================= *
 *                               THE LAYOUT
 * ========================================================================= */

/**
 * Component boxes and connecting runs, in world coordinates. The evaporator,
 * metering device, compressor and suction line repeat the numbers
 * `evaporator-machine.mjs` has used since the frost Short shipped — that is
 * deliberate and asserted, not coincidence. The condenser and the two runs
 * that close the loop (discharge up the right, liquid back along the top and
 * down the left) are new, and were placed so the loop reads as a rectangle
 * at a glance: low side bottom-left, high side top-right.
 */
export const CYCLE = {
  evaporator: { x0: -440, x1: 110, y0: -300, y1: 390 },
  metering: { x0: -642, x1: -558, cy: 320, h: 64 },
  compressor: { x0: 700, x1: 1040, y0: -350, y1: -130 },
  condenser: { x0: 340, x1: 1180, y0: -1200, y1: -820 },
  /** Low-side return: evaporator outlet -> compressor inlet. */
  suctionLine: { y: -240, x0: 110, x1: 700 },
  /** High-side hot gas: compressor -> condenser inlet, up the right edge. */
  dischargeLine: { fromX: 1040, fromY: -240, cornerX: 1300, toY: -1200, toX: 1180 },
  /** High-side liquid: condenser outlet -> along the top -> down -> metering. */
  liquidLine: { fromX: 340, fromY: -820, cornerX: -930, toY: 320, toX: -642 },
};

/** Modeled example operating point for the LOOP labels. Never universal. */
export const CYCLE_OP = {
  suctionVaporC: 12,
  dischargeVaporC: 85, // the series discharge anchor; see mechanisms/condenser.mjs
  liquidC: 40,
};

/**
 * Semantic statement of the loop — what connects to what, in flow order.
 * Mechanism scenes that open on this overview embed it in scene.json beside
 * their own topology, so agent-side Technical QA can check that the overview
 * and the close-up agree about the circuit (a condenser outlet feeding the
 * liquid line in the overview must feed the liquid line in the cutaway too).
 */
export const CYCLE_TOPOLOGY = {
  domain: "full_cycle_overview",
  flowOrder: [
    "compressor",
    "discharge-line",
    "condenser",
    "liquid-line",
    "metering-device",
    "evaporator",
    "suction-line",
    "compressor",
  ],
  pressureDivide: {
    highSideBeginsAt: "compressor",
    highSideEndsAt: "metering-device",
    lowSideBeginsAt: "metering-device",
    lowSideEndsAt: "compressor",
  },
  stations: {
    compressor: { from: "suction-line", to: "discharge-line", refrigerant: "low-pressure vapor in, high-pressure hot vapor out" },
    "discharge-line": { from: "compressor", to: "condenser", refrigerant: "high-pressure superheated vapor, hot" },
    condenser: { from: "discharge-line", to: "liquid-line", refrigerant: "rejects heat: vapor -> liquid, leaves subcooled" },
    "liquid-line": { from: "condenser", to: "metering-device", refrigerant: "high-pressure liquid, warm" },
    "metering-device": { from: "liquid-line", to: "evaporator", refrigerant: "pressure drops; cold two-phase leaves" },
    evaporator: { from: "metering-device", to: "suction-line", refrigerant: "absorbs heat: liquid boils to vapor" },
    "suction-line": { from: "evaporator", to: "compressor", refrigerant: "low-pressure cold vapor" },
  },
};

/** Component centres, for camera aiming and label placement. */
export const CYCLE_ANCHORS = {
  compressor: { x: (CYCLE.compressor.x0 + CYCLE.compressor.x1) / 2, y: (CYCLE.compressor.y0 + CYCLE.compressor.y1) / 2 },
  condenser: { x: (CYCLE.condenser.x0 + CYCLE.condenser.x1) / 2, y: (CYCLE.condenser.y0 + CYCLE.condenser.y1) / 2 },
  metering: { x: (CYCLE.metering.x0 + CYCLE.metering.x1) / 2, y: CYCLE.metering.cy },
  evaporator: { x: (CYCLE.evaporator.x0 + CYCLE.evaporator.x1) / 2, y: (CYCLE.evaporator.y0 + CYCLE.evaporator.y1) / 2 },
};

/**
 * The conceptual API the brief asked for: aim the camera at a component, or
 * at the whole loop. Returns a framing in the template's own camera shape,
 * so a preset phase can use it directly and a Short can travel between two
 * of them by naming both.
 *
 * `wide` is tuned so the full 2230-unit loop clears the 1080-wide canvas
 * with margin — the orientation shot, where nothing is emphasised and the
 * viewer simply reads "air-conditioning system".
 */
export function focusCycleComponent(name) {
  switch (name) {
    case "wide":
      return { fx: 185, fy: -405, z: 0.45 };
    case "condenser":
      return { fx: CYCLE_ANCHORS.condenser.x, fy: CYCLE_ANCHORS.condenser.y, z: 0.95 };
    case "compressor":
      return { fx: CYCLE_ANCHORS.compressor.x, fy: CYCLE_ANCHORS.compressor.y, z: 1.0 };
    case "metering":
      return { fx: CYCLE_ANCHORS.metering.x, fy: CYCLE_ANCHORS.metering.y, z: 1.35 };
    case "evaporator":
      return { fx: CYCLE_ANCHORS.evaporator.x, fy: CYCLE_ANCHORS.evaporator.y, z: 0.78 };
    default:
      throw new Error(`focusCycleComponent: unknown component '${name}'`);
  }
}

/**
 * Guard against the two copies of the evaporator-side numbers drifting. The
 * caller passes what its own constants say; a mismatch throws at import,
 * exactly like `topologyAttestation` refuses a scene whose geometry does not
 * match its declared topology.
 */
export function assertCycleAgreement(label, boxes) {
  for (const [key, box] of Object.entries(boxes)) {
    const mine = CYCLE[key];
    if (!mine) throw new Error(`assertCycleAgreement: no cycle layout named '${key}'`);
    for (const [field, value] of Object.entries(box)) {
      if (mine[field] !== value) {
        throw new Error(
          `${label}: cycle layout drift — ${key}.${field} is ${value} here but ${mine[field]} in ` +
            "engine/cycle-overview.mjs. The overview and the close-up would disagree about where " +
            "the component lives, and the camera move between them would lie.",
        );
      }
    }
  }
}

/* ========================================================================= *
 *                              THE DRAWING
 * ========================================================================= */

/** Emphasis for one component: 1 = full attention, 0 = dimmed context. */
function emphasisFor(st, name) {
  const focus = st.cycleFocus ?? null;
  const strength = clamp(st.cycleFocusStrength ?? 0, 0, 1);
  if (!focus || strength <= 0) return 1;
  return focus === name ? 1 : lerp(1, 0.26, strength);
}

/** A connecting run drawn as a pipe: dark casing, state-coloured core. */
function pipe(ctx, pts, radius, tempC, alpha, tint) {
  const core = tint ? tint(tempC) : refrigerantColor(tempC);
  const shine = tint ? highSideGlow(tempC) : refrigerantGlow(tempC);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);

  ctx.strokeStyle = C.ironLo;
  ctx.lineWidth = radius * 2 + 10;
  ctx.stroke();

  ctx.strokeStyle = C.steelMid;
  ctx.lineWidth = radius * 2;
  ctx.stroke();

  ctx.strokeStyle = rgba(core, 0.5);
  ctx.lineWidth = radius * 1.1;
  ctx.stroke();

  ctx.strokeStyle = rgba(shine, 0.32);
  ctx.lineWidth = radius * 0.42;
  ctx.stroke();
  ctx.restore();
}

/** Parcels chasing along a run, so the loop reads as flowing, not plumbed. */
function runParticles(ctx, pts, tempC, flow, alpha, count = 5, tint) {
  const shine = tint ? highSideGlow(tempC) : refrigerantGlow(tempC);
  // Cumulative lengths so a parcel moves at constant speed around corners.
  const lens = [];
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    lens.push(d);
    total += d;
  }
  ctx.save();
  ctx.globalAlpha *= alpha;
  for (let n = 0; n < count; n += 1) {
    const f = ((flow * 0.09 + n / count) % 1 + 1) % 1;
    let want = f * total;
    let i = 0;
    while (i < lens.length - 1 && want > lens[i]) {
      want -= lens[i];
      i += 1;
    }
    const k = lens[i] ? want / lens[i] : 0;
    const x = lerp(pts[i][0], pts[i + 1][0], k);
    const y = lerp(pts[i][1], pts[i + 1][1], k);
    bloom(ctx, shine, 16, 0.5, () => {
      ctx.fillStyle = shine;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, TAU);
      ctx.fill();
    });
  }
  ctx.restore();
}

/** A simplified component body — metal, rim light, and a name plate. */
function bodyBox(ctx, box, label, alpha, accent, labelDx = 0) {
  const w = box.x1 - box.x0;
  const h = box.y1 - box.y0;
  ctx.save();
  ctx.globalAlpha *= alpha;

  const g = ctx.createLinearGradient(0, box.y0, 0, box.y1);
  g.addColorStop(0, C.ironHi);
  g.addColorStop(0.5, C.iron);
  g.addColorStop(1, C.ironLo);
  ctx.fillStyle = g;
  rr(ctx, box.x0, box.y0, w, h, 18);
  ctx.fill();

  const path = new Path2D();
  path.rect(box.x0, box.y0, w, h);
  rimLight(ctx, path, 0.45, 0.16);

  if (accent > 0) {
    ctx.save();
    ctx.globalAlpha *= accent;
    ctx.strokeStyle = rgba(C.accent, 0.9);
    ctx.lineWidth = 5;
    rr(ctx, box.x0 - 12, box.y0 - 12, w + 24, h + 24, 24);
    ctx.stroke();
    ctx.restore();
  }

  // Names belong to the ORIENTATION moment. Once a component is dimmed as
  // context, its name would still be sitting in the caption band while the
  // narration talks about something else — so a dimmed body goes quiet.
  if (label && alpha > 0.6) {
    text(ctx, label, (box.x0 + box.x1) / 2 + labelDx, box.y1 + 66, F.micro(54), rgba(C.textDim, 0.92), "center");
  }
  ctx.restore();
}

/** Coil hatching inside a component box, so a heat exchanger reads as one. */
function coilHatch(ctx, box, rows, tempFrom, tempTo, alpha, tint) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineCap = "round";
  const h = box.y1 - box.y0;
  for (let i = 0; i < rows; i += 1) {
    const y = box.y0 + (h * (i + 0.5)) / rows;
    const t = i / Math.max(rows - 1, 1);
    const tC = lerp(tempFrom, tempTo, t);
    ctx.strokeStyle = rgba(tint ? tint(tC) : refrigerantColor(tC), 0.55);
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(box.x0 + 26, y);
    ctx.lineTo(box.x1 - 26, y);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draw the loop.
 *
 * `st.cycleFocus` names the component under attention and
 * `st.cycleFocusStrength` ramps the dimming of the others, so shot 2's
 * "THIS is the condenser" is a state transition rather than a second scene.
 * `opts.omit` suppresses the simplified body for a component the calling
 * scene draws in full detail at the same coordinates.
 */
export function drawCycleContext(ctx, st, opts = {}) {
  const omit = opts.omit ?? null;
  const flow = st.flow ?? 0;
  const alpha = clamp(st.cycleAlpha ?? 1, 0, 1);
  if (alpha <= 0.01) return;

  const D = CYCLE.dischargeLine;
  const L = CYCLE.liquidLine;
  const S = CYCLE.suctionLine;

  const dischargePts = [
    [D.fromX, D.fromY],
    [D.cornerX, D.fromY],
    [D.cornerX, D.toY],
    [D.toX, D.toY],
  ];
  const liquidPts = [
    [L.fromX, L.fromY],
    [L.cornerX, L.fromY],
    [L.cornerX, L.toY],
    [L.toX, L.toY],
  ];
  const suctionPts = [
    [S.x1, S.y],
    [S.x0, S.y],
  ];

  ctx.save();
  ctx.globalAlpha *= alpha;

  // ---- the runs, coloured by the state they actually carry --------------
  const dischargeA = Math.min(emphasisFor(st, "condenser"), emphasisFor(st, "compressor"));
  const liquidA = Math.min(emphasisFor(st, "condenser"), emphasisFor(st, "metering"));
  const suctionA = Math.min(emphasisFor(st, "evaporator"), emphasisFor(st, "compressor"));

  pipe(ctx, dischargePts, 20, CYCLE_OP.dischargeVaporC, dischargeA, highSideTint);
  pipe(ctx, liquidPts, 16, CYCLE_OP.liquidC, liquidA, highSideTint);
  // The suction run belongs to the evaporator scene's own geometry; drawn
  // here only when that scene is not drawing it itself.
  if (omit !== "evaporator") pipe(ctx, suctionPts, 22, CYCLE_OP.suctionVaporC, suctionA);

  runParticles(ctx, dischargePts, CYCLE_OP.dischargeVaporC, flow, dischargeA, 4, highSideTint);
  runParticles(ctx, liquidPts, CYCLE_OP.liquidC, flow, liquidA, 5, highSideTint);
  if (omit !== "evaporator") runParticles(ctx, suctionPts, CYCLE_OP.suctionVaporC, flow, suctionA, 3);

  // ---- the bodies --------------------------------------------------------
  const focus = st.cycleFocus ?? null;
  const strength = clamp(st.cycleFocusStrength ?? 0, 0, 1);
  const accentFor = (name) => (focus === name ? strength : 0);

  if (omit !== "compressor") {
    bodyBox(ctx, CYCLE.compressor, "COMPRESSOR", emphasisFor(st, "compressor"), accentFor("compressor"));
  }
  if (omit !== "condenser") {
    bodyBox(ctx, CYCLE.condenser, "CONDENSER", emphasisFor(st, "condenser"), accentFor("condenser"));
    coilHatch(ctx, CYCLE.condenser, 5, CYCLE_OP.dischargeVaporC, CYCLE_OP.liquidC, emphasisFor(st, "condenser"), highSideTint);
  }
  if (omit !== "evaporator") {
    bodyBox(ctx, CYCLE.evaporator, "EVAPORATOR", emphasisFor(st, "evaporator"), accentFor("evaporator"));
    coilHatch(ctx, CYCLE.evaporator, 5, 10, CYCLE_OP.suctionVaporC, emphasisFor(st, "evaporator"));
  }
  if (omit !== "metering") {
    const m = CYCLE.metering;
    bodyBox(
      ctx,
      { x0: m.x0, x1: m.x1, y0: m.cy - m.h / 2, y1: m.cy + m.h / 2 },
      "METERING DEVICE",
      emphasisFor(st, "metering"),
      accentFor("metering"),
      -120,
    );
  }

  ctx.restore();
}

/**
 * The two-word pressure story, drawn only on the orientation shots. Kept
 * separate from `drawCycleContext` so a close-up never carries it.
 */
export function drawCycleDivides(ctx, st) {
  const a = clamp(st.cycleDivideAlpha ?? 0, 0, 1);
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= a;
  text(ctx, "HIGH SIDE", 760, -1800, F.micro(64), rgba(C.hot, 0.9), "center");
  text(ctx, "LOW SIDE", -165, 660, F.micro(64), rgba(C.coolBright, 0.9), "center");
  ctx.restore();
}
