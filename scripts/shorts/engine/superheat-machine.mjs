/**
 * Superheat measurement scene — the diagnostic_measurement stage.
 *
 * Composition (machine space, y down):
 *   evaporator coil   x -700..-300, y -300..240 — small exterior context,
 *                     the place the vapor just left
 *   suction line      y -160, x -300..660 — the pipe under test
 *   temperature clamp x -80 — near the outlet, where line temp is read
 *   pressure port     x 120 — schrader stub + hose down to the gauge head
 *   gauge head        analog face at (300, 210): needle = suction pressure
 *   readout           digital manifold plate at x 360..700, y -120..60:
 *                     SAT / LINE / SUPERHEAT rows that light up one teaching
 *                     beat at a time, the third row computed from the first
 *                     two (mechanisms/superheat.mjs owns the subtraction)
 *   compressor block  x 700..1000 — closed housing, context only
 *
 * The instruments are drawn as HARDWARE because in this domain the tools
 * are the subject. Their values come straight off the state — the same
 * cannot-disagree rule as the series gauges — and the plate carries a
 * "modeled example" etch so a paused frame never reads as a universal
 * number. Frost never appears here: this is the healthy-measurement scene.
 */
import { C, F, rgba, clamp, lerp, refrigerantColor, refrigerantGlow } from "./style.mjs";
import { steelSide, ironSide, bolt, makeGrain, rimLight, hash, rr, textShadowed } from "./draw.mjs";
import { OP, TOPOLOGY } from "../mechanisms/superheat.mjs";

const TAU = Math.PI * 2;

/* --------------------------------------------------------------- geometry */

const COIL = { x0: -700, x1: -300, y0: -300, y1: 240 };
const PASS_Y = [170, 60, -50, -160];
const TUBE_R = 18;
const LINE = { y: -160, x0: -300, x1: 700, r: 22 };
const CLAMP_X = -80;
const PORT_X = 120;
const GAUGE = { cx: 300, cy: 210, r: 74 };
const PLATE = { x0: 360, x1: 706, y0: -128, y1: 66 };
const COMP = { x0: 700, x1: 1000, y0: -262, y1: -58 };

export const ANCHORS = {
  outlet: { x: LINE.x0, y: LINE.y },
  clamp: { x: CLAMP_X, y: LINE.y },
  port: { x: PORT_X, y: LINE.y },
  gauge: { cx: GAUGE.cx, cy: GAUGE.cy },
  plate: { x: (PLATE.x0 + PLATE.x1) / 2, y: (PLATE.y0 + PLATE.y1) / 2 },
};

/* ------------------------------------------------------------ attestation */

export function topologyAttestation() {
  const lineLen = LINE.x1 - LINE.x0;
  const measured = {
    lineStartsAtCoilOutlet: Math.abs(PASS_Y[PASS_Y.length - 1] - LINE.y) < 1,
    clampOnSuctionLine: CLAMP_X > LINE.x0 && CLAMP_X < LINE.x1,
    clampNearOutlet: (CLAMP_X - LINE.x0) / lineLen < 0.35,
    portOnSuctionLine: PORT_X > LINE.x0 && PORT_X < LINE.x1,
    portFeedsGauge: GAUGE.cx > PORT_X && GAUGE.cy > LINE.y, // hose runs down-right to the head
    readoutDerivesSuperheat: readoutSubtractionHolds(),
    lineRunsTowardCompressor: COMP.x0 >= LINE.x1,
    frostFree: true, // the healthy-measurement scene: no frost driver exists in the model
  };
  return {
    domain: TOPOLOGY.domain,
    declared: {
      flowOrder: TOPOLOGY.flowOrder,
      instruments: TOPOLOGY.instruments,
      meaning: TOPOLOGY.meaning,
    },
    measured,
  };
}

/** Sample the state across the timeline: displayed superheat must equal the
 *  subtraction at every sample — measured, not assumed. */
function readoutSubtractionHolds() {
  // Import here would be circular at module top for the state fn's consumers;
  // the state module is import-safe and cheap.
  return SAMPLE_STATES.every((s) => Math.abs(s.superheatK - (s.lineTempC - s.satTempC)) < 0.001);
}
import { superheatState } from "../mechanisms/superheat.mjs";
const SAMPLE_STATES = Array.from({ length: 40 }, (_, i) => superheatState((i / 39) * TAU * 4.9));

{
  const att = topologyAttestation();
  const failed = Object.entries(att.measured).filter(([, v]) => v === false).map(([k]) => k);
  if (failed.length > 0) throw new Error(`superheat topology attestation failed: ${failed.join(", ")}`);
}

/* ------------------------------------------------------------------ scene */

let grain = null;

export function drawSuperheat(ctx, st) {
  if (!grain) grain = makeGrain(384, 384, 555);

  drawCoilContext(ctx, st);
  drawLine(ctx, st);
  drawCompressorContext(ctx);
  drawPort(ctx, st);
  drawClamp(ctx, st);
  drawGauge(ctx, st);
  drawPlate(ctx, st);
}

/* ------------------------------------------------------------- coil, line */

function drawCoilContext(ctx, st) {
  ctx.save();
  for (let x = COIL.x0; x <= COIL.x1; x += 24) {
    const g = ctx.createLinearGradient(x, COIL.y0, x, COIL.y1);
    g.addColorStop(0, "rgba(104,128,150,0.24)");
    g.addColorStop(0.5, "rgba(70,90,110,0.18)");
    g.addColorStop(1, "rgba(48,64,80,0.22)");
    ctx.fillStyle = g;
    ctx.fillRect(x, COIL.y0, 3, COIL.y1 - COIL.y0);
  }
  const frame = new Path2D();
  rr(frame, COIL.x0 - 24, COIL.y0 - 24, COIL.x1 - COIL.x0 + 48, COIL.y1 - COIL.y0 + 48, 16);
  ctx.strokeStyle = "rgba(8,14,20,0.88)";
  ctx.lineWidth = 20;
  ctx.stroke(frame);
  ctx.strokeStyle = ironSide(ctx, COIL.x0 - 24, COIL.x1 - COIL.x0 + 48);
  ctx.lineWidth = 14;
  ctx.stroke(frame);
  rimLight(ctx, frame, 0.32, 0.13);
  bolt(ctx, COIL.x0 - 24, COIL.y0 - 24, 10);
  bolt(ctx, COIL.x1 + 24, COIL.y0 - 24, 10);
  bolt(ctx, COIL.x0 - 24, COIL.y1 + 24, 10);
  bolt(ctx, COIL.x1 + 24, COIL.y1 + 24, 10);

  // Passes: healthy coil, vapor share rising toward the outlet at the top.
  for (let i = 0; i < PASS_Y.length; i++) {
    const leftToRight = i % 2 === 0;
    const y = PASS_Y[i];
    const p = new Path2D();
    p.moveTo(COIL.x0, y);
    p.lineTo(COIL.x1, y);
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(4,8,13,0.9)";
    ctx.lineWidth = TUBE_R * 2 + 8;
    ctx.stroke(p);
    const g = ctx.createLinearGradient(0, y - TUBE_R, 0, y + TUBE_R);
    g.addColorStop(0, "#1B2B3A");
    g.addColorStop(0.2, "#9DB6CB");
    g.addColorStop(0.42, "#5B718C");
    g.addColorStop(1, "#101A25");
    ctx.strokeStyle = g;
    ctx.lineWidth = TUBE_R * 2;
    ctx.stroke(p);
    if (i < PASS_Y.length - 1) {
      const side = leftToRight ? "right" : "left";
      const x = leftToRight ? COIL.x1 : COIL.x0;
      const bend = new Path2D();
      bend.arc(x, (PASS_Y[i] + PASS_Y[i + 1]) / 2, (PASS_Y[i] - PASS_Y[i + 1]) / 2,
        Math.PI / 2, side === "right" ? -Math.PI / 2 : (3 * Math.PI) / 2, side === "right");
      ctx.strokeStyle = "rgba(4,8,13,0.9)";
      ctx.lineWidth = TUBE_R * 2 + 8;
      ctx.stroke(bend);
      const bg = ctx.createLinearGradient(x - 40, 0, x + 40, 0);
      bg.addColorStop(0, "#1B2B3A");
      bg.addColorStop(0.35, "#8FA8BD");
      bg.addColorStop(1, "#101A25");
      ctx.strokeStyle = bg;
      ctx.lineWidth = TUBE_R * 2;
      ctx.stroke(bend);
    }
  }
  // Sparse vapor in the passes (context motion, healthiest near the top).
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 42; i++) {
    const s1 = hash(i * 4.3 + 17);
    const pass = i % PASS_Y.length;
    const pr = ((st.flow * 0.12 + s1) % 1 + 1) % 1;
    const leftToRight = pass % 2 === 0;
    const x = lerp(leftToRight ? COIL.x0 : COIL.x1, leftToRight ? COIL.x1 : COIL.x0, pr);
    const y = PASS_Y[pass] + (hash(i * 7.7) - 0.5) * TUBE_R;
    const r = lerp(2.6, 6, s1);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(refrigerantGlow(OP.satTempC + pass), 0.5));
    g.addColorStop(1, rgba(refrigerantColor(OP.satTempC + pass), 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawLine(ctx, st) {
  const p = new Path2D();
  p.moveTo(LINE.x0, LINE.y);
  p.lineTo(LINE.x1, LINE.y);
  ctx.save();
  ctx.lineCap = "butt";
  ctx.strokeStyle = "rgba(4,8,13,0.92)";
  ctx.lineWidth = LINE.r * 2 + 10;
  ctx.stroke(p);
  const g = ctx.createLinearGradient(0, LINE.y - LINE.r, 0, LINE.y + LINE.r);
  g.addColorStop(0, "#1B2B3A");
  g.addColorStop(0.2, "#9DB6CB");
  g.addColorStop(0.42, "#5B718C");
  g.addColorStop(1, "#101A25");
  ctx.strokeStyle = g;
  ctx.lineWidth = LINE.r * 2;
  ctx.stroke(p);
  // Cool vapor inside, flowing toward the compressor.
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = rgba(refrigerantGlow(OP.lineTempC), 0.18);
  ctx.lineWidth = LINE.r * 1.4;
  ctx.stroke(p);
  for (let i = 0; i < 30; i++) {
    const s1 = hash(i * 6.7 + 51);
    const pr = ((st.flow * 0.18 + s1) % 1 + 1) % 1;
    const x = lerp(LINE.x0, LINE.x1 - 6, pr);
    const y = LINE.y + (hash(i * 3.1) - 0.5) * LINE.r;
    const r = lerp(2.6, 6.4, s1);
    const pg = ctx.createRadialGradient(x, y, 0, x, y, r);
    pg.addColorStop(0, rgba(C.coolBright, 0.5));
    pg.addColorStop(1, rgba(C.cool, 0));
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // Outlet coupling where the coil hands over the vapor, and a flange
  // collar where the line enters the compressor housing.
  ctx.save();
  ctx.fillStyle = "rgba(4,8,13,0.92)";
  ctx.fillRect(LINE.x0 - 16, LINE.y - LINE.r - 8, 30, (LINE.r + 8) * 2);
  const cg = ctx.createLinearGradient(0, LINE.y - LINE.r - 5, 0, LINE.y + LINE.r + 5);
  cg.addColorStop(0, "#31414F");
  cg.addColorStop(0.3, "#B8C9D8");
  cg.addColorStop(0.6, "#5E7183");
  cg.addColorStop(1, "#1A2530");
  ctx.fillStyle = cg;
  ctx.fillRect(LINE.x0 - 13, LINE.y - LINE.r - 5, 24, (LINE.r + 5) * 2);
  ctx.fillStyle = "rgba(4,8,13,0.92)";
  ctx.fillRect(COMP.x0 - 18, LINE.y - LINE.r - 10, 18, (LINE.r + 10) * 2);
  ctx.fillStyle = steelSide(ctx, COMP.x0 - 15, 13, "#AFC0CE", "#5C6E7E", "#141E28");
  ctx.fillRect(COMP.x0 - 15, LINE.y - LINE.r - 7, 13, (LINE.r + 7) * 2);
  ctx.restore();
}

function drawCompressorContext(ctx) {
  ctx.save();
  const p = new Path2D();
  rr(p, COMP.x0, COMP.y0, COMP.x1 - COMP.x0, COMP.y1 - COMP.y0, 24);
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
  rimLight(ctx, p, 0.35, 0.14);
  ctx.fillStyle = steelSide(ctx, COMP.x0 + 26, 50, "#B9C8D6", "#61717F", "#131C25");
  ctx.fillRect(COMP.x0 + 22, COMP.y1, 48, 14);
  ctx.fillRect(COMP.x1 - 70, COMP.y1, 48, 14);
  ctx.restore();
}

/* ------------------------------------------------------------ instruments */

/** Focus halo used by all three instruments when their beat arrives. */
function focusRing(ctx, x, y, r, live, theta) {
  if (live <= 0.02) return;
  const pulse = 0.78 + 0.22 * Math.sin(theta * 2.2);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.beginPath();
  ctx.arc(x, y, r + (1 - live) * 24, 0, TAU);
  ctx.strokeStyle = rgba(C.accent, 0.7 * live * pulse);
  ctx.lineWidth = 4.5;
  ctx.shadowColor = C.accent;
  ctx.shadowBlur = 22 * live;
  ctx.stroke();
  ctx.restore();
}

function drawClamp(ctx, st) {
  const x = CLAMP_X;
  const y = LINE.y;
  ctx.save();
  ctx.fillStyle = "rgba(4,8,13,0.92)";
  ctx.fillRect(x - 11, y - LINE.r - 8, 22, (LINE.r + 8) * 2);
  ctx.fillStyle = steelSide(ctx, x - 8, 16, "#C7D5E2", "#66788A", "#18222C");
  ctx.fillRect(x - 8, y - LINE.r - 6, 16, (LINE.r + 6) * 2);
  const body = new Path2D();
  rr(body, x - 19, y - LINE.r - 50, 38, 38, 7);
  ctx.fillStyle = "rgba(4,8,13,0.92)";
  ctx.fill(body);
  const g = ctx.createLinearGradient(0, y - LINE.r - 50, 0, y - LINE.r - 12);
  g.addColorStop(0, "#3A4858");
  g.addColorStop(0.4, "#8FA2B4");
  g.addColorStop(1, "#202B36");
  ctx.fillStyle = g;
  const inner = new Path2D();
  rr(inner, x - 16, y - LINE.r - 47, 32, 32, 6);
  ctx.fill(inner);
  // Lead toward the readout plate: the clamp reports to the LINE TEMP row.
  ctx.beginPath();
  ctx.moveTo(x + 17, y - LINE.r - 30);
  ctx.bezierCurveTo(x + 130, y - LINE.r - 40, PLATE.x0 - 150, PLATE.y0 + 30, PLATE.x0 + 3, PLATE.y0 + 42);
  ctx.strokeStyle = "rgba(12,18,26,0.9)";
  ctx.lineWidth = 4.5;
  ctx.stroke();
  focusRing(ctx, x, y - 12, 52, st.tempLive * (st.window === 2 ? 1 : 0.35), st.theta);
  ctx.restore();
}

function drawPort(ctx, st) {
  const x = PORT_X;
  const y = LINE.y;
  ctx.save();
  // Schrader stub on top of the line.
  ctx.fillStyle = "rgba(4,8,13,0.92)";
  ctx.fillRect(x - 8, y - LINE.r - 26, 16, 26);
  ctx.fillStyle = steelSide(ctx, x - 6, 12, "#D2AC7A", C.copper, "#2A1C10");
  ctx.fillRect(x - 6, y - LINE.r - 24, 12, 22);
  // Hose: port down to the gauge head, one calm sweep.
  ctx.beginPath();
  ctx.moveTo(x, y + LINE.r + 2);
  ctx.bezierCurveTo(x + 30, y + 150, GAUGE.cx - 90, GAUGE.cy - 60, GAUGE.cx - GAUGE.r + 6, GAUGE.cy - 8);
  ctx.strokeStyle = "rgba(8,12,18,0.95)";
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.strokeStyle = "#26313D";
  ctx.lineWidth = 7;
  ctx.stroke();
  focusRing(ctx, x, y - 4, 40, st.pressureLive * (st.window === 1 ? 1 : 0.3), st.theta);
  ctx.restore();
}

function drawGauge(ctx, st) {
  const { cx, cy, r } = GAUGE;
  ctx.save();
  // Case + face.
  ctx.beginPath();
  ctx.arc(cx, cy, r + 8, 0, TAU);
  ctx.fillStyle = "rgba(4,8,13,0.94)";
  ctx.fill();
  const rim = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  rim.addColorStop(0, "#8C9BAA");
  rim.addColorStop(0.5, "#3A4858");
  rim.addColorStop(1, "#141E28");
  ctx.beginPath();
  ctx.arc(cx, cy, r + 5, 0, TAU);
  ctx.fillStyle = rim;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fillStyle = "#0B141D";
  ctx.fill();
  // Track: cool -> hot sweep like the series gauges.
  const a0 = Math.PI * 0.75;
  const a1 = Math.PI * 2.25;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, r - 14, a0, a1);
  ctx.strokeStyle = "rgba(70,90,110,0.35)";
  ctx.lineWidth = 7;
  ctx.stroke();
  const pT = clamp((st.psig - 0) / 250, 0, 1);
  ctx.beginPath();
  ctx.arc(cx, cy, r - 14, a0, lerp(a0, a1, pT));
  ctx.strokeStyle = refrigerantColor(lerp(8, 88, pT));
  ctx.lineWidth = 7;
  ctx.shadowColor = refrigerantGlow(lerp(8, 88, pT));
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Needle straight off the model.
  const ang = lerp(a0, a1, pT);
  ctx.strokeStyle = "#EAF3FB";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(ang) * 12, cy - Math.sin(ang) * 12);
  ctx.lineTo(cx + Math.cos(ang) * (r - 22), cy + Math.sin(ang) * (r - 22));
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 5.5, 0, TAU);
  ctx.fillStyle = "#8C9BAA";
  ctx.fill();
  // Readout window on the face: psig, live from the model.
  textShadowed(ctx, `${Math.round(st.psig)}`, cx, cy + r - 30, F.mono(26), C.coolBright, "center", "middle");
  textShadowed(ctx, "psig", cx, cy + r - 10, F.micro(13), C.textDim, "center", "middle");
  focusRing(ctx, cx, cy, r + 10, st.pressureLive * (st.window === 1 ? 1 : 0.25), st.theta);
  ctx.restore();
}

/** The digital manifold plate: three rows, the third computed. */
function drawPlate(ctx, st) {
  ctx.save();
  const plate = new Path2D();
  rr(plate, PLATE.x0, PLATE.y0, PLATE.x1 - PLATE.x0, PLATE.y1 - PLATE.y0, 14);
  ctx.fillStyle = "rgba(4,10,17,0.96)";
  ctx.fill(plate);
  ctx.strokeStyle = "rgba(79,176,255,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke(plate);
  rimLight(ctx, plate, 0.28, 0.1);

  // Written like column subtraction: LINE − SATURATION over a rule, then
  // SUPERHEAT. The minus sits against the subtrahend's value, where a
  // technician's notebook would put it.
  const rowY = [PLATE.y0 + 42, PLATE.y0 + 96, PLATE.y0 + 158];
  const labelX = PLATE.x0 + 22;
  const valX = PLATE.x1 - 24;

  const row = (y, label, value, unit, live, minus) => {
    const a = 0.18 + 0.82 * clamp(live, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    textShadowed(ctx, label, labelX, y, F.micro(19), C.textDim, "left", "middle");
    if (minus && live > 0.02) {
      textShadowed(ctx, "−", valX - 168, y, F.mono(30), C.textDim, "right", "middle");
    }
    textShadowed(ctx, live > 0.02 ? value : "--.-", valX - 54, y, F.mono(34), C.coolBright, "right", "middle");
    textShadowed(ctx, unit, valX, y, F.micro(16), C.textDim, "right", "middle");
    ctx.restore();
  };

  row(rowY[0], "LINE TEMP", st.lineTempC.toFixed(1), "°C", st.tempLive, false);
  row(rowY[1], "SATURATION", st.satTempC.toFixed(1), "°C", st.pressureLive, st.tempLive > 0.02);
  ctx.globalAlpha = 0.25 + 0.75 * st.shLive;
  ctx.strokeStyle = "rgba(147,174,198,0.5)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(PLATE.x0 + 18, rowY[1] + 28);
  ctx.lineTo(PLATE.x1 - 18, rowY[1] + 28);
  ctx.stroke();
  ctx.globalAlpha = 1;
  row(rowY[2], "SUPERHEAT", st.superheatK.toFixed(1), "K", st.shLive, false);
  if (st.shLive > 0.05) {
    focusRing(ctx, (PLATE.x0 + PLATE.x1) / 2, rowY[2], 46, st.shLive * (st.window === 3 ? 1 : 0.35), st.theta);
  }
  // Honesty etch: these figures are the series' one modeled operating point.
  ctx.globalAlpha = 0.5;
  textShadowed(ctx, "modeled example", PLATE.x1 - 22, PLATE.y1 - 16, F.micro(13), C.textDim, "right", "middle");
  ctx.restore();
}

export const superheatScene = { id: "superheat", draw: drawSuperheat, gas() {} };
