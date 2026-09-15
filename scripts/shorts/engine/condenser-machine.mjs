/**
 * The condenser_process renderer: outdoor coil, fan, air, and the three
 * zones along one flow path.
 *
 * ==================== GEOMETRY IS DERIVED, NOT DRAWN ====================
 * Same rule the evaporator scene learned the hard way: build ONE path from
 * the declared topology and hang everything on it. Passes, return bends,
 * particles, droplets, zone shading and zone labels all read the same
 * `PATH`, so a label cannot sit over the wrong tubing and a bend cannot land
 * on the side the flow did not end on. `topologyAttestation()` measures the
 * built result against `mechanisms/condenser.mjs` and throws at import if
 * they disagree.
 *
 * ==================== THE CONDENSER IS WHERE HEAT LEAVES ====================
 * The visual thesis, in one sentence: refrigerant colour cools ALONG the
 * coil while the air colour warms ACROSS it. Those two gradients run
 * perpendicular to each other on screen, which is what makes "the heat moved
 * from one to the other" legible without narration claiming it twice.
 *
 * Droplets appear PROGRESSIVELY, never at the inlet — `vaporFractionAt` is
 * the only source for how much liquid exists at a point, and it holds vapor
 * at 1.0 through the whole desuperheating zone.
 */
import { C, F, clamp, ease, lerp, mix, rgba, refrigerantColor, refrigerantGlow } from "./style.mjs";
import { rr, rimLight, bloom, cutFace, makeGrain, text, textShadowed } from "./draw.mjs";
import {
  CYCLE,
  assertCycleAgreement,
  drawCycleContext,
  drawCycleDivides,
  highSideGlow,
  highSideTint,
} from "./cycle-overview.mjs";
import { OP, SUBCOOL_K, TOPOLOGY, ZONES, tempAt, vaporFractionAt } from "../mechanisms/condenser.mjs";

const TAU = Math.PI * 2;

/* ---------------------------------------------------------------- layout */

const COIL = CYCLE.condenser;
const PASS_GAP = (COIL.y1 - COIL.y0) / (TOPOLOGY.coil.passCount - 1);
const TUBE_R = 22;
const FAN = { cy: COIL.y0 - 190, r: 235 };

export const ANCHORS = {
  coilCenter: { x: (COIL.x0 + COIL.x1) / 2, y: (COIL.y0 + COIL.y1) / 2 },
  inlet: { x: COIL.x1, y: COIL.y0 },
  outlet: { x: COIL.x0, y: COIL.y1 },
  fan: { x: (COIL.x0 + COIL.x1) / 2, y: FAN.cy },
  desuperheat: { x: COIL.x1 - 150, y: COIL.y0 },
  subcool: { x: COIL.x0 + 150, y: COIL.y1 },
};

/* ------------------------------------------------------- the flow path */

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

/**
 * Passes run top → bottom because the refrigerant does: hot vapor enters
 * high, condensate drains downward, and the bottom passes are where
 * subcooling happens. An odd pass count with a right-side inlet necessarily
 * exits left, where the liquid line leaves — asserted, not assumed.
 */
function buildPath() {
  const { passCount, inletSide, outletSide } = TOPOLOGY.coil;
  if (passCount % 2 !== 1) {
    throw new Error(
      `condenser topology: passCount ${passCount} is even — a ${inletSide}-side inlet would exit on the same side, but the liquid line leaves on the ${outletSide}.`,
    );
  }

  const passY = Array.from({ length: passCount }, (_, i) => COIL.y0 + i * PASS_GAP);
  const segs = [];
  const add = (seg) => {
    const prev = segs[segs.length - 1];
    if (prev) {
      const [px, py] = segEnd(prev);
      const [sx, sy] = segStart(seg);
      if (Math.hypot(px - sx, py - sy) > 0.001) {
        throw new Error(
          `condenser topology: path discontinuity between '${prev.station}' and '${seg.station}' (${px},${py}) -> (${sx},${sy})`,
        );
      }
    }
    seg.len = segLength(seg);
    segs.push(seg);
  };

  for (let i = 0; i < passCount; i += 1) {
    const rightToLeft = i % 2 === 0; // inletSide "right": pass 0 runs right -> left
    const y = passY[i];
    add({
      kind: "line",
      station: "coil",
      pass: i,
      r: TUBE_R,
      a: [rightToLeft ? COIL.x1 : COIL.x0, y],
      b: [rightToLeft ? COIL.x0 : COIL.x1, y],
    });
    if (i < passCount - 1) {
      // The bend lives on whichever side this pass ENDED — by construction.
      const side = rightToLeft ? "left" : "right";
      const x = rightToLeft ? COIL.x0 : COIL.x1;
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
        // Flow arrives from the UPPER pass (angle -90°) and leaves into the
        // lower one (+90°), bulging west on the left side, east on the right.
        phi0: -Math.PI / 2,
        phi1: side === "right" ? Math.PI / 2 : (-3 * Math.PI) / 2,
      });
    }
  }

  const total = segs.reduce((a, s) => a + s.len, 0);
  let acc = 0;
  for (const s of segs) {
    s.f0 = acc / total;
    acc += s.len;
    s.f1 = acc / total;
  }
  return { segs, total };
}

export const PATH = buildPath();

/** Point on the coil path, p in 0..1 from inlet to outlet. */
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

/* ------------------------------------------------------------ attestation */

export function topologyAttestation() {
  const passSegs = PATH.segs.filter((s) => s.kind === "line");
  const bendSegs = PATH.segs.filter((s) => s.kind === "arc");
  const first = passSegs[0];
  const last = passSegs[passSegs.length - 1];
  const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.5;

  const measured = {
    passCount: passSegs.length,
    passCountOdd: passSegs.length % 2 === 1,
    inletSide: first.a[0] > ANCHORS.coilCenter.x ? "right" : "left",
    inletAt: first.a[1] < ANCHORS.coilCenter.y ? "top" : "bottom",
    outletSide: last.b[0] < ANCHORS.coilCenter.x ? "left" : "right",
    outletAt: last.b[1] > ANCHORS.coilCenter.y ? "bottom" : "top",
    bendsGeneratedFromPath: bendSegs.length === passSegs.length - 1,
    // The two hand-offs that make this scene part of ONE loop rather than a
    // coil floating in space: the discharge line must arrive exactly at the
    // inlet, and the liquid line must leave exactly from the outlet.
    inletMeetsDischargeLine: near(first.a, [CYCLE.dischargeLine.toX, CYCLE.dischargeLine.toY]),
    outletMeetsLiquidLine: near([last.b[0], last.b[1]], [CYCLE.liquidLine.fromX, CYCLE.liquidLine.fromY]),
    // The physics the scene promises, measured from the model it draws from.
    nothingCondensedAtInlet: vaporFractionAt(0) === 1,
    fullyLiquidAtOutlet: vaporFractionAt(1) === 0,
    condensesProgressively: vaporFractionAt(0.5) > 0 && vaporFractionAt(0.5) < 1,
    inletSuperheated: tempAt(0) > OP.condensingC,
    outletSubcooled: tempAt(1) < OP.condensingC,
    subcoolK: +SUBCOOL_K.toFixed(1),
    zonesInOrder:
      ZONES.desuperheat.to === ZONES.condense.from && ZONES.condense.to === ZONES.subcool.from,
    zonesCoverPath: ZONES.desuperheat.from === 0 && ZONES.subcool.to === 1,
  };

  const declared = TOPOLOGY.coil;
  const checks = {
    passCountMatches: measured.passCount === declared.passCount,
    passCountOdd: measured.passCountOdd,
    inletSideMatches: measured.inletSide === declared.inletSide,
    inletAtMatches: measured.inletAt === declared.inletAt,
    outletSideMatches: measured.outletSide === declared.outletSide,
    outletAtMatches: measured.outletAt === declared.outletAt,
    bendsGeneratedFromPath: measured.bendsGeneratedFromPath,
    inletMeetsDischargeLine: measured.inletMeetsDischargeLine,
    outletMeetsLiquidLine: measured.outletMeetsLiquidLine,
    nothingCondensedAtInlet: measured.nothingCondensedAtInlet,
    fullyLiquidAtOutlet: measured.fullyLiquidAtOutlet,
    condensesProgressively: measured.condensesProgressively,
    inletSuperheated: measured.inletSuperheated,
    outletSubcooled: measured.outletSubcooled,
    zonesInOrder: measured.zonesInOrder,
    zonesCoverPath: measured.zonesCoverPath,
  };

  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  if (failed.length > 0) {
    throw new Error(`condenser topology attestation FAILED: ${failed.join(", ")}`);
  }

  return { domain: TOPOLOGY.domain, declared, measured, checks, zones: ZONES };
}

// Both guards run at import: the layout must agree with the shared loop, and
// the built geometry must agree with the declared topology.
assertCycleAgreement("condenser-machine", { condenser: COIL });
topologyAttestation();

/* ------------------------------------------------------------------ paint */

let grain = null;

export function drawCondenser(ctx, st) {
  if (!grain) grain = makeGrain(384, 384, 217);

  // The loop first, behind everything — spatial context is the experiment.
  drawCycleContext(ctx, st, { omit: "condenser" });
  drawCycleDivides(ctx, st);

  drawCabinet(ctx, st);
  drawFins(ctx, st);
  drawAir(ctx, st);
  drawFan(ctx, st);
  drawCircuit(ctx, st);
  drawRefrigerant(ctx, st);
  drawHeatOut(ctx, st);
  drawZoneLabels(ctx, st);
}

/* ---------------------------------------------------------------- cabinet */

/** The outdoor unit's shell, so the coil is recognisably a condensing unit. */
function drawCabinet(ctx, st) {
  const pad = 46;
  ctx.save();
  ctx.globalAlpha *= 0.9;
  const g = ctx.createLinearGradient(0, COIL.y0 - pad, 0, COIL.y1 + pad);
  g.addColorStop(0, C.ironHi);
  g.addColorStop(0.45, C.iron);
  g.addColorStop(1, C.ironLo);
  ctx.fillStyle = g;
  rr(ctx, COIL.x0 - pad, COIL.y0 - pad, COIL.x1 - COIL.x0 + pad * 2, COIL.y1 - COIL.y0 + pad * 2, 26);
  ctx.fill();

  const path = new Path2D();
  path.rect(COIL.x0 - pad, COIL.y0 - pad, COIL.x1 - COIL.x0 + pad * 2, COIL.y1 - COIL.y0 + pad * 2);
  rimLight(ctx, path, 0.5, 0.3);
  // Cut face along the top: this is a cutaway, and the series says so with
  // the same warm edge every other scene uses.
  cutFace(ctx, path, 7);
  ctx.restore();
}

/* ------------------------------------------------------------------- fins */

function drawFins(ctx, st) {
  ctx.save();
  ctx.globalAlpha *= 0.5;
  ctx.strokeStyle = rgba(C.steelMid, 0.5);
  ctx.lineWidth = 3;
  for (let x = COIL.x0 + 14; x < COIL.x1; x += 26) {
    ctx.beginPath();
    ctx.moveTo(x, COIL.y0 - 30);
    ctx.lineTo(x, COIL.y1 + 30);
    ctx.stroke();
  }
  ctx.restore();
}

/* -------------------------------------------------------------------- air */

/**
 * Air crossing the coil: enters below at ambient, leaves above carrying the
 * heat. The colour shift IS the lesson, so it is driven by `st.airHeat` and
 * by height rather than being a fixed gradient — on the payoff the air is
 * still visibly leaving warm.
 */
function drawAir(ctx, st) {
  const heat = clamp(st.airHeat ?? 0, 0, 1);
  const t = st.flow ?? 0;
  ctx.save();
  ctx.globalAlpha *= 0.85;

  for (let i = 0; i < 26; i += 1) {
    const x = COIL.x0 - 20 + ((i * 37) % (COIL.x1 - COIL.x0 + 40));
    // Rise from below the cabinet, through the coil, out past the fan.
    const span = COIL.y1 + 150 - (FAN.cy - 60);
    const f = ((t * 0.16 + i * 0.093) % 1 + 1) % 1;
    const y = COIL.y1 + 150 - f * span;
    // Below the coil the air is ambient; above it, it carries rejected heat.
    const through = clamp((COIL.y1 - y) / (COIL.y1 - COIL.y0), 0, 1);
    const airC = lerp(OP.airInC, OP.airOutC, through * heat);
    const col = mix(C.steelHi, C.hotBright, clamp((airC - OP.airInC) / 14, 0, 1) * 0.9);
    const alpha = 0.14 + 0.3 * Math.sin(Math.PI * clamp(f * 1.15, 0, 1));

    ctx.strokeStyle = rgba(col, alpha * 1.5);
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 17, y + 16);
    ctx.lineTo(x, y - 2);
    ctx.lineTo(x + 17, y + 16);
    ctx.stroke();
  }
  ctx.restore();
}

/* -------------------------------------------------------------------- fan */

function drawFan(ctx, st) {
  const a = st.fanAngle ?? 0;
  const cx = ANCHORS.fan.x;
  ctx.save();
  ctx.translate(cx, FAN.cy);

  // Shroud.
  ctx.strokeStyle = rgba(C.steelMid, 0.75);
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(0, 0, FAN.r, 0, TAU);
  ctx.stroke();

  ctx.save();
  ctx.rotate(a);
  for (let i = 0; i < 5; i += 1) {
    ctx.save();
    ctx.rotate((i / 5) * TAU);
    const g = ctx.createLinearGradient(0, 0, FAN.r * 0.92, 0);
    g.addColorStop(0, C.steel);
    g.addColorStop(1, rgba(C.steelLo, 0.25));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.quadraticCurveTo(FAN.r * 0.6, -76, FAN.r * 0.92, -14);
    ctx.quadraticCurveTo(FAN.r * 0.6, 16, 0, 26);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  ctx.fillStyle = C.ironHi;
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, TAU);
  ctx.fill();
  ctx.restore();

  text(ctx, "CONDENSER FAN", cx, FAN.cy - FAN.r - 34, F.micro(34), rgba(C.textDim, 0.8), "center");
}

/* ---------------------------------------------------------------- circuit */

/** The tubing itself, coloured along the path by the three-zone temperature. */
function drawCircuit(ctx, st) {
  ctx.save();
  ctx.lineCap = "round";

  // Casing pass.
  for (const seg of PATH.segs) {
    ctx.strokeStyle = C.ironLo;
    ctx.lineWidth = TUBE_R * 2 + 10;
    strokeSeg(ctx, seg);
  }
  for (const seg of PATH.segs) {
    ctx.strokeStyle = C.steelMid;
    ctx.lineWidth = TUBE_R * 2;
    strokeSeg(ctx, seg);
  }

  // State pass: short chunks, each tinted by the temperature at its own
  // fraction — the gradient along the coil that the whole lesson rests on.
  const STEPS = 96;
  for (let i = 0; i < STEPS; i += 1) {
    const p0 = i / STEPS;
    const p1 = (i + 1) / STEPS;
    const a = pathPoint(p0);
    const b = pathPoint(p1);
    const tC = tempAt((p0 + p1) / 2);
    ctx.strokeStyle = rgba(highSideTint(tC), 0.62);
    ctx.lineWidth = TUBE_R * 1.15;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

function strokeSeg(ctx, seg) {
  ctx.beginPath();
  if (seg.kind === "line") {
    ctx.moveTo(seg.a[0], seg.a[1]);
    ctx.lineTo(seg.b[0], seg.b[1]);
  } else {
    ctx.arc(seg.cx, seg.cy, seg.radius, seg.phi0, seg.phi1, seg.phi1 < seg.phi0);
  }
  ctx.stroke();
}

/* ------------------------------------------------------------ refrigerant */

/**
 * Parcels along the coil. A parcel's APPEARANCE is decided entirely by
 * `vaporFractionAt` at its own position: sparse fast specks while it is
 * vapor, a fattening droplet as the fraction falls, a solid liquid bead once
 * it is zero. Nobody draws a droplet at the inlet because the model does not
 * put one there.
 */
function drawRefrigerant(ctx, st) {
  const t = st.flow ?? 0;
  const N = 46;
  ctx.save();
  for (let i = 0; i < N; i += 1) {
    const p = ((t * 0.07 + i / N) % 1 + 1) % 1;
    const pt = pathPoint(p);
    const vap = vaporFractionAt(p);
    const tC = tempAt(p);
    const col = highSideTint(tC);
    const glow = highSideGlow(tC);

    if (vap > 0.92) {
      // Vapor: small, bright, slightly scattered across the tube bore.
      const jitter = Math.sin(i * 12.9898 + p * 41.7) * (TUBE_R * 0.45);
      bloom(ctx, glow, 14, 0.42, () => {
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y + jitter * 0.35, 5.5, 0, TAU);
        ctx.fill();
      });
    } else {
      // Condensing → liquid: the droplet grows as the vapor fraction falls.
      const r = lerp(11, 6.5, vap);
      const sag = lerp(TUBE_R * 0.42, 0, vap); // liquid rides the tube floor
      bloom(ctx, glow, 18, 0.5, () => {
        ctx.fillStyle = mix(col, glow, 0.45);
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y + sag, r, r * lerp(0.82, 1, vap), 0, 0, TAU);
        ctx.fill();
      });
    }
  }
  ctx.restore();
}

/* -------------------------------------------------------------- heat out */

/** Heat leaving the tubes for the air: short arrows, perpendicular to flow. */
function drawHeatOut(ctx, st) {
  const s = clamp(st.heatOut ?? 0, 0, 1);
  if (s <= 0.02) return;
  const t = st.flow ?? 0;
  ctx.save();
  ctx.globalAlpha *= 0.6 * s;
  ctx.lineCap = "round";
  for (let i = 0; i < 14; i += 1) {
    const p = (i + 0.5) / 14;
    const pt = pathPoint(p);
    const k = ((t * 0.5 + i * 0.37) % 1 + 1) % 1;
    const rise = 26 + k * 44;
    const alpha = Math.sin(Math.PI * k) * 0.9;
    ctx.strokeStyle = rgba(C.hotBright, alpha);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y - 24);
    ctx.lineTo(pt.x, pt.y - 24 - rise);
    ctx.stroke();
    // Arrowhead.
    ctx.beginPath();
    ctx.moveTo(pt.x - 9, pt.y - 24 - rise + 12);
    ctx.lineTo(pt.x, pt.y - 24 - rise);
    ctx.lineTo(pt.x + 9, pt.y - 24 - rise + 12);
    ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------------------------------------ zone labels */

/**
 * One zone at a time. The brief is explicit that every label must not sit on
 * screen at once, and the state model already decides which zone the
 * narration is on — this only renders that decision.
 */
function drawZoneLabels(ctx, st) {
  const zone = st.zoneFocus ?? 0;
  const k = clamp(st.zoneFocusK ?? 0, 0, 1);
  if (zone === 0 || k <= 0.02) return;

  // ============ LABELS LIVE OFF THE HARDWARE ============
  // The first cut anchored each label a fixed offset from its own tube point
  // and frame inspection showed the result immediately: "CONDENSING" sitting
  // across three passes, unreadable over the tubing it was describing. The
  // brief is explicit — do not cover the component. So placement is now
  // relative to the CABINET: outside it, in clear space, with a leader line
  // back to the exact point on the path being named. The fan owns the air
  // above the middle of the coil, so the inlet label sits above its far
  // right, and the other two sit below the cabinet where nothing else is.
  const spec =
    zone === 1
      ? {
          at: 0.06,
          x: (COIL.x0 + COIL.x1) / 2,
          y: COIL.y1 + 180,
          title: "HOT HIGH-PRESSURE VAPOR",
          sub: "still all vapor — shedding sensible heat",
        }
      : zone === 2
        ? {
            at: 0.5,
            x: (COIL.x0 + COIL.x1) / 2,
            y: COIL.y1 + 180,
            title: "CONDENSING",
            sub: "latent heat leaves — vapor becomes liquid",
          }
        : {
            at: 0.97,
            x: (COIL.x0 + COIL.x1) / 2,
            y: COIL.y1 + 180,
            title: "SUBCOOLED LIQUID",
            sub: "below its saturation temperature",
          };

  const pt = pathPoint(spec.at);
  const e = ease.out(k);
  const above = spec.y < pt.y;
  const y = spec.y + (1 - e) * (above ? -26 : 26);

  ctx.save();
  ctx.globalAlpha *= e;

  // Leader: from the tube point, out to the label's own line.
  ctx.strokeStyle = rgba(C.hudLine, 0.85);
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(pt.x, pt.y + (above ? -30 : 30));
  ctx.lineTo(pt.x, y + (above ? 30 : -30));
  ctx.lineTo(spec.x, y + (above ? 30 : -30));
  ctx.stroke();
  ctx.setLineDash([]);

  textShadowed(ctx, spec.title, spec.x, y, F.label(44), C.text, "center");
  textShadowed(ctx, spec.sub, spec.x, y + 44, F.body(34), rgba(C.textDim, 0.95), "center");

  // The one place numbers appear, and they carry their scope with them.
  if (zone === 3) {
    textShadowed(
      ctx,
      `${OP.condensingC}°C saturation → ${OP.outletLiquidC}°C liquid  (${SUBCOOL_K}K subcooling)`,
      spec.x,
      y + 92,
      F.mono(32),
      rgba(C.hotBright, 0.95),
      "center",
    );
    textShadowed(
      ctx,
      "MODELED EXAMPLE — system dependent",
      spec.x,
      y + 130,
      F.micro(26),
      rgba(C.textDim, 0.85),
      "center",
    );
  }
  ctx.restore();
}
