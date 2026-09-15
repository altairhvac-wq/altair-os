/**
 * The reciprocating compressor cutaway.
 *
 * Local coordinates: origin on the cylinder axis at the head deck (the face the
 * valves seat against). +y is down, toward the crankcase. Nothing here decides
 * what the machine is doing — it is handed a state from the cycle model and
 * draws exactly that.
 *
 * Section convention: the near half of the casting has been removed, so every
 * INNER contour is a cut face and gets the warm sliced-metal band. The outer
 * silhouette is untouched material and never gets it. Getting that backwards is
 * what makes a cutaway read as a red-outlined diagram instead of a sliced
 * machine, and V1 of this file got it backwards.
 */
import { C, rgba, clamp, refrigerantGlow } from "./style.mjs";
import { steelSide, ironSide, cutFace, bloom, radial, bolt, spring, makeGrain, rr, rimLight } from "./draw.mjs";

export const M = {
  boreHalf: 178,
  wall: 96,
  headTop: -292,
  deck: 0,
  crownTDC: 24,
  strokePx: 240,
  pistonH: 176,
  pinDrop: 100,
  crankR: 120,
  rodL: 250,
  caseTop: 430,
  caseBot: 648,
  caseHalf: 322,
  valveX: 88,
  valveR: 60,
  deckThk: 34, // thickness of the head casting below the gallery floor
};
M.crankY = M.crownTDC + M.pinDrop + M.crankR + M.rodL;

let grain = null;

export const crownY = (frac) => M.crownTDC + frac * M.strokePx;

export function chamberRect(frac) {
  const top = M.deck + 4;
  const bot = crownY(frac);
  return { x: -M.boreHalf + 9, y: top, w: (M.boreHalf - 9) * 2, h: Math.max(bot - top, 5) };
}

export function drawMachine(ctx, st) {
  if (!grain) grain = makeGrain(384, 384, 17);
  const cy = crownY(st.pistonFrac);

  drawCrankcase(ctx, st);
  drawBoreInterior(ctx);
  drawCylinder(ctx);
  drawHead(ctx);
  drawSuctionPipe(ctx, st);
  drawDischargePipe(ctx, st);
  drawChamberInterior(ctx, st);
  drawValve(ctx, -M.valveX, st.suctionLift, true, st);
  drawValve(ctx, M.valveX, st.dischargeLift, false, st);
  drawPiston(ctx, cy, st);
  drawRod(ctx, st, cy);
  drawCutFaces(ctx);
}

/**
 * The far half of the cylinder, seen through the section.
 *
 * Without this the bore is a slot between two walls and the whole machine reads
 * as a flat vector diagram — which is exactly what the first two versions of
 * this renderer looked like. A concave left-to-right shade, an elliptical deck
 * lip and faint honing marks are enough for the eye to close the tube.
 */
function drawBoreInterior(ctx) {
  const b = M.boreHalf - 2;
  const top = M.deck;
  const bot = M.caseTop + 30;

  ctx.save();
  ctx.beginPath();
  ctx.rect(-b, top - 26, b * 2, bot - top + 26);
  ctx.clip();

  // Concave wall: darkest at the section edges, lit toward the middle-left.
  const g = ctx.createLinearGradient(-b, 0, b, 0);
  g.addColorStop(0, "#0A1219");
  g.addColorStop(0.2, "#243646");
  g.addColorStop(0.42, "#3D5468");
  g.addColorStop(0.68, "#26394A");
  g.addColorStop(1, "#080E14");
  ctx.fillStyle = g;
  ctx.fillRect(-b, top - 26, b * 2, bot - top + 26);

  // Vertical honing marks.
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 34; i++) {
    const x = -b + (i / 33) * b * 2;
    ctx.fillStyle = i % 2 ? "rgba(190,216,238,0.5)" : "rgba(0,0,0,0.6)";
    ctx.fillRect(x, top, 1.6, bot - top);
  }
  ctx.globalAlpha = 1;

  // Deck lip: the far edge of the head deck curving away from the viewer.
  ctx.beginPath();
  ctx.ellipse(0, top, b, 30, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
  const lg = ctx.createLinearGradient(0, top - 30, 0, top);
  lg.addColorStop(0, "#0B131B");
  lg.addColorStop(1, "#33465A");
  ctx.fillStyle = lg;
  ctx.fill();

  // Ambient occlusion where the far wall meets the near cut faces.
  const ao = ctx.createLinearGradient(-b, 0, b, 0);
  ao.addColorStop(0, "rgba(0,0,0,0.85)");
  ao.addColorStop(0.12, "rgba(0,0,0,0)");
  ao.addColorStop(0.88, "rgba(0,0,0,0)");
  ao.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = ao;
  ctx.fillRect(-b, top - 26, b * 2, bot - top + 26);
  ctx.restore();
}

/* ------------------------------------------------------------- crankcase */

function drawCrankcase(ctx, st) {
  const { caseTop: tp, caseBot: bt, caseHalf: hh } = M;

  // Outer casting.
  const shell = new Path2D();
  shell.moveTo(-hh, tp);
  shell.quadraticCurveTo(-hh - 22, tp + 120, -hh + 6, bt - 56);
  shell.quadraticCurveTo(-hh + 28, bt, -hh + 104, bt);
  shell.lineTo(hh - 104, bt);
  shell.quadraticCurveTo(hh - 28, bt, hh - 6, bt - 56);
  shell.quadraticCurveTo(hh + 22, tp + 120, hh, tp);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-hh, tp);
  ctx.lineTo(hh, tp);
  ctx.quadraticCurveTo(hh + 22, tp + 120, hh - 6, bt - 56);
  ctx.quadraticCurveTo(hh - 28, bt, hh - 104, bt);
  ctx.lineTo(-hh + 104, bt);
  ctx.quadraticCurveTo(-hh + 28, bt, -hh + 6, bt - 56);
  ctx.quadraticCurveTo(-hh - 22, tp + 120, -hh, tp);
  ctx.closePath();
  ctx.fillStyle = ironSide(ctx, -hh, hh * 2);
  ctx.fill();
  ctx.clip();
  ctx.globalAlpha = 0.45;
  ctx.drawImage(grain, -hh, tp, hh * 2, bt - tp);
  ctx.restore();
  rimLight(ctx, shell, 0.45, 0.2);

  // Bolted side flanges — they give the casting a manufactured edge.
  for (const s of [-1, 1]) {
    for (let y = tp + 56; y < bt - 40; y += 92) bolt(ctx, s * (hh - 24), y, 12);
  }

  // Sectioned interior. Dark, but never flat black: a cool ambient bounce and
  // an oil line at the bottom give the void something to be.
  const iw = hh - 52;
  const ih = (bt - tp) / 2 - 26;
  ctx.save();
  ctx.beginPath();
  rr(ctx, -iw, tp + 18, iw * 2, bt - tp - 46, 52);
  ctx.fillStyle = "#060C13";
  ctx.fill();
  ctx.clip();
  // Far wall of the case, curving away: same trick as the bore.
  const amb = ctx.createLinearGradient(-iw, 0, iw, 0);
  amb.addColorStop(0, "#070D14");
  amb.addColorStop(0.24, "#1B2A38");
  amb.addColorStop(0.46, "#2A3D4E");
  amb.addColorStop(0.72, "#182530");
  amb.addColorStop(1, "#05090F");
  ctx.fillStyle = amb;
  ctx.fillRect(-iw, tp, iw * 2, bt - tp);
  // The bore mouth opening into the case, seen from below.
  ctx.beginPath();
  ctx.ellipse(0, tp + 26, M.boreHalf - 4, 34, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(3,7,12,0.92)";
  ctx.fill();
  const topShade = ctx.createLinearGradient(0, tp, 0, tp + 120);
  topShade.addColorStop(0, "rgba(0,0,0,0.8)");
  topShade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topShade;
  ctx.fillRect(-iw, tp, iw * 2, 120);

  // Oil in the sump, with a specular streak.
  const oilY = bt - 48;
  const og = ctx.createLinearGradient(0, oilY, 0, bt);
  og.addColorStop(0, "rgba(64,44,18,0.9)");
  og.addColorStop(1, "rgba(16,11,5,0.95)");
  ctx.fillStyle = og;
  ctx.fillRect(-iw, oilY, iw * 2, bt - oilY);
  ctx.fillStyle = "rgba(196,158,92,0.22)";
  ctx.fillRect(-iw, oilY, iw * 2, 3);

  drawCrankGear(ctx, st);
  ctx.restore();
  void ih;

  // Inner lip of the crankcase: a shadowed step, not another outline.
  const p = new Path2D();
  rr(p, -iw, tp + 18, iw * 2, bt - tp - 46, 52);
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.8)";
  ctx.lineWidth = 16;
  ctx.stroke(p);
  ctx.strokeStyle = "rgba(150,184,214,0.16)";
  ctx.lineWidth = 2;
  ctx.stroke(p);
  ctx.restore();
}

/** Counterweight, crank pin and main journal — clipped inside the crankcase. */
function drawCrankGear(ctx, st) {
  const th = st.theta;
  const cx = M.crankR * Math.sin(th);
  const cyy = M.crankY - M.crankR * Math.cos(th);

  // Counterweight lobe, thrown opposite the pin. Its rotation is the clearest
  // running-machine cue in the frame, so it is steel, not shadow.
  ctx.save();
  ctx.translate(0, M.crankY);
  ctx.rotate(th + Math.PI);
  ctx.beginPath();
  ctx.moveTo(-104, -24);
  ctx.quadraticCurveTo(-118, 128, 0, 150);
  ctx.quadraticCurveTo(118, 128, 104, -24);
  ctx.quadraticCurveTo(0, 22, -104, -24);
  ctx.closePath();
  const wg = ctx.createLinearGradient(-110, 0, 110, 0);
  wg.addColorStop(0, "#141E28");
  wg.addColorStop(0.3, "#7D8FA0");
  wg.addColorStop(0.52, "#465666");
  wg.addColorStop(1, "#0D151D");
  ctx.fillStyle = wg;
  ctx.fill();
  ctx.strokeStyle = "rgba(180,205,228,0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Crank web connecting journal to pin.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, M.crankY);
  ctx.lineTo(cx, cyy);
  ctx.strokeStyle = "#3B4A59";
  ctx.lineWidth = 74;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.strokeStyle = "rgba(190,212,232,0.22)";
  ctx.lineWidth = 66;
  ctx.stroke();
  ctx.restore();

  // Main journal.
  ctx.beginPath();
  ctx.arc(0, M.crankY, 46, 0, Math.PI * 2);
  ctx.fillStyle = steelSide(ctx, -46, 92, "#E2EDF7", "#7F909F", "#161F29");
  ctx.fill();
  ctx.strokeStyle = "rgba(3,7,11,0.9)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, M.crankY, 17, 0, Math.PI * 2);
  ctx.fillStyle = "#0A1119";
  ctx.fill();
}

/* -------------------------------------------------------------- cylinder */

function drawCylinder(ctx) {
  const outerL = -M.boreHalf - M.wall;
  const outerR = M.boreHalf + M.wall;

  for (const side of [-1, 1]) {
    const x0 = side < 0 ? outerL : M.boreHalf;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, M.deck - 4, M.wall, M.caseTop - M.deck + 8);
    ctx.fillStyle = ironSide(ctx, x0, M.wall);
    ctx.fill();
    ctx.clip();
    ctx.globalAlpha = 0.4;
    ctx.drawImage(grain, x0 - 20, M.deck - 40, M.wall + 40, 600);
    ctx.restore();

    // Cooling fins on the OUTSIDE face only — the inside is bore, not fins.
    // Cut as slots with a lit upper lip; the V2 lozenges stacked into a ladder.
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, M.deck - 4, M.wall, M.caseTop - M.deck + 8);
    ctx.clip();
    const fx = side < 0 ? outerL - 4 : outerR - 44;
    for (let y = M.deck + 30; y < M.caseTop - 16; y += 34) {
      ctx.fillStyle = "rgba(4,9,15,0.85)";
      ctx.fillRect(fx, y, 48, 13);
      ctx.fillStyle = "rgba(158,192,222,0.3)";
      ctx.fillRect(fx, y + 12, 48, 2);
      ctx.fillStyle = "rgba(120,156,190,0.12)";
      ctx.fillRect(fx, y - 2, 48, 2);
    }
    ctx.restore();

    // Honed bore liner: the bright machined face the rings ride on.
    const lx = side < 0 ? -M.boreHalf : M.boreHalf - 14;
    const lg = ctx.createLinearGradient(lx, 0, lx + 14, 0);
    lg.addColorStop(0, side < 0 ? "#101922" : "#A8BDCE");
    lg.addColorStop(0.5, "#66798B");
    lg.addColorStop(1, side < 0 ? "#B4C8D8" : "#101922");
    ctx.fillStyle = lg;
    ctx.fillRect(lx, M.deck, 14, M.caseTop - M.deck);
  }
}

/* ------------------------------------------------------------------ head */

function drawHead(ctx) {
  const outerL = -M.boreHalf - M.wall - 20;
  const w = -outerL * 2;

  ctx.save();
  ctx.beginPath();
  rr(ctx, outerL, M.headTop, w, -M.headTop + 6, 18);
  ctx.fillStyle = ironSide(ctx, outerL, w);
  ctx.fill();
  ctx.clip();
  ctx.globalAlpha = 0.45;
  ctx.drawImage(grain, outerL - 30, M.headTop - 20, 780, 330);
  // Cast rib running along the top of the head.
  ctx.globalAlpha = 1;
  const rg = ctx.createLinearGradient(0, M.headTop, 0, M.headTop + 46);
  rg.addColorStop(0, "rgba(150,182,210,0.26)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(outerL, M.headTop, w, 46);
  ctx.restore();
  const hp = new Path2D();
  rr(hp, outerL, M.headTop, w, -M.headTop + 6, 18);
  rimLight(ctx, hp, 0.5, 0.26);

  // Valve chambers: bored pockets, deliberately small so cast material remains
  // between and around them. V1 hollowed out the whole head and it read as a
  // hole with springs floating in it.
  for (const s of [-1, 1]) pocket(ctx, s * M.valveX, s);

  // Head gasket: a thin bright parting line at the deck.
  ctx.fillStyle = "rgba(196,214,232,0.32)";
  ctx.fillRect(outerL + 6, M.deck - 3, w - 12, 3);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(outerL + 6, M.deck, w - 12, 3);

  for (const bx of [outerL + 22, outerL + 70, -outerL - 22, -outerL - 70]) bolt(ctx, bx, -30, 13);
  for (const bx of [outerL + 22, -outerL - 22]) bolt(ctx, bx, M.headTop + 36, 13);
}

/** One valve pocket plus the port that leads sideways out of the casting. */
function pocket(ctx, x, dir) {
  const top = M.headTop + 52;
  const bot = M.deck - M.deckThk;
  const half = M.valveR + 16;

  ctx.save();
  ctx.beginPath();
  // Pocket.
  rr(ctx, x - half, top, half * 2, bot - top + M.deckThk, 16);
  ctx.fillStyle = "#070D15";
  ctx.fill();
  ctx.clip();
  // Back wall of the pocket, curving away exactly like the bore does.
  const amb = ctx.createLinearGradient(x - half, 0, x + half, 0);
  amb.addColorStop(0, "#070D14");
  amb.addColorStop(0.26, "#1E2E3C");
  amb.addColorStop(0.5, "#2C4054");
  amb.addColorStop(0.76, "#182430");
  amb.addColorStop(1, "#05090F");
  ctx.fillStyle = amb;
  ctx.fillRect(x - half, top, half * 2, M.deck - top + 40);
  const drop = ctx.createLinearGradient(0, top, 0, top + 70);
  drop.addColorStop(0, "rgba(0,0,0,0.85)");
  drop.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = drop;
  ctx.fillRect(x - half, top, half * 2, 70);
  ctx.restore();

  // Port: a duct from the pocket out to the pipe flange.
  const py = M.headTop + 104;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + dir * (half - 6), py - 44);
  ctx.lineTo(x + dir * 260, py - 44);
  ctx.lineTo(x + dir * 260, py + 44);
  ctx.lineTo(x + dir * (half - 6), py + 44);
  ctx.closePath();
  ctx.fillStyle = "#070D15";
  ctx.fill();
  ctx.restore();
}

/* ----------------------------------------------------------------- pipes */

/** Suction: cool steel line with a visible cold interior. */
function drawSuctionPipe(ctx, st) {
  const y = M.headTop + 104;
  const x1 = -M.boreHalf - M.wall - 20;
  const mid = new Path2D();
  mid.moveTo(-1180, y);
  mid.lineTo(x1, y);

  ctx.save();
  ctx.lineCap = "butt";
  ctx.strokeStyle = "rgba(4,8,13,0.92)";
  ctx.lineWidth = 116;
  ctx.stroke(mid);
  const g = ctx.createLinearGradient(0, y - 54, 0, y + 54);
  g.addColorStop(0, "#1B2B3A");
  g.addColorStop(0.2, "#9DB6CB");
  g.addColorStop(0.42, "#5B718C");
  g.addColorStop(1, "#101A25");
  ctx.strokeStyle = g;
  ctx.lineWidth = 104;
  ctx.stroke(mid);
  // Bore interior, lit by the cold vapour inside it.
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = rgba(C.cool, st.suctionOpen ? 0.3 : 0.18);
  ctx.lineWidth = 74;
  ctx.stroke(mid);
  ctx.restore();

  // Flange.
  ctx.fillStyle = steelSide(ctx, x1 - 34, 34);
  ctx.fillRect(x1 - 34, y - 78, 34, 156);
  bolt(ctx, x1 - 17, y - 60, 10);
  bolt(ctx, x1 - 17, y + 60, 10);
}

/** Discharge: copper, climbing away to the condenser. */
function drawDischargePipe(ctx, st) {
  const y = M.headTop + 104;
  const x0 = M.boreHalf + M.wall + 20;
  const mid = new Path2D();
  mid.moveTo(x0, y);
  mid.lineTo(x0 + 216, y);
  mid.quadraticCurveTo(x0 + 404, y, x0 + 404, y - 196);
  mid.lineTo(x0 + 404, y - 600);

  ctx.save();
  ctx.lineCap = "butt";
  ctx.strokeStyle = "rgba(4,8,13,0.92)";
  ctx.lineWidth = 118;
  ctx.stroke(mid);
  const g = ctx.createLinearGradient(x0, y - 54, x0, y + 54);
  g.addColorStop(0, "#3A2415");
  g.addColorStop(0.2, C.copperHi);
  g.addColorStop(0.44, C.copper);
  g.addColorStop(1, "#251609");
  ctx.strokeStyle = g;
  ctx.lineWidth = 106;
  ctx.stroke(mid);
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = rgba(st.dischargeOpen ? "#FF8A3D" : "#7A3418", st.dischargeOpen ? 0.4 : 0.14);
  ctx.lineWidth = 76;
  ctx.stroke(mid);
  ctx.restore();

  ctx.fillStyle = steelSide(ctx, x0, 34);
  ctx.fillRect(x0, y - 78, 34, 156);
  bolt(ctx, x0 + 17, y - 60, 10);
  bolt(ctx, x0 + 17, y + 60, 10);
}

/* ------------------------------------------------------------- interior */

function drawChamberInterior(ctx, st) {
  const r = chamberRect(st.pistonFrac);
  const glow = refrigerantGlow(st.tempC);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  ctx.fillStyle = "#02060B";
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.globalCompositeOperation = "lighter";
  const density = clamp(0.18 + (1 - st.volumeFrac) * 0.55, 0.18, 0.76);
  ctx.fillStyle = radial(
    ctx,
    0,
    r.y + r.h * 0.5,
    Math.max(r.w, r.h) * 0.8,
    rgba(glow, 0.3 * density + 0.08),
    rgba(glow, 0.08),
  );
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

/**
 * A poppet valve. Suction opens downward into the cylinder, discharge opens
 * upward out of it — lift direction equals flow direction, so the mechanism
 * alone tells the viewer which way the gas is going.
 */
function drawValve(ctx, x, lift, isSuction, st) {
  const L = clamp(lift, 0, 1);
  const dir = isSuction ? 1 : -1;
  const seatY = M.deck - 8;
  const discY = seatY + dir * (4 + 40 * L);
  const tint = !isSuction && st.dischargeOpen ? C.hot : C.cool;

  // Seat: a machined ring set into the deck, left and right of the port.
  ctx.save();
  const sg = steelSide(ctx, x - M.valveR - 20, 2 * (M.valveR + 20), "#C8D6E4", "#66778A", "#121B24");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(x - M.valveR - 20, seatY - 10);
  ctx.lineTo(x - M.valveR + 2, seatY + 12);
  ctx.lineTo(x - M.valveR + 2, seatY + 20);
  ctx.lineTo(x - M.valveR - 20, seatY + 20);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + M.valveR + 20, seatY - 10);
  ctx.lineTo(x + M.valveR - 2, seatY + 12);
  ctx.lineTo(x + M.valveR - 2, seatY + 20);
  ctx.lineTo(x + M.valveR + 20, seatY + 20);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Guide, spring and stem inside the pocket.
  const stemTop = M.headTop + 74;
  spring(ctx, x, stemTop + 10, Math.max(discY - 18, stemTop + 34), 58, 5, L);
  ctx.fillStyle = steelSide(ctx, x - 10, 20, "#CBD9E5", "#6F8090", "#18222C");
  ctx.fillRect(x - 10, stemTop - 14, 20, Math.max(discY - stemTop + 16, 16));
  // Guide boss the stem runs in.
  ctx.fillStyle = steelSide(ctx, x - 26, 52, "#9BADBE", "#4C5C6C", "#0E151D");
  ctx.fillRect(x - 26, stemTop - 20, 52, 34);

  // Disc.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, discY, M.valveR, 16, 0, 0, Math.PI * 2);
  ctx.fillStyle = steelSide(ctx, x - M.valveR, M.valveR * 2, "#E6F0FA", "#82939F", "#1B2530");
  ctx.fill();
  ctx.strokeStyle = "rgba(6,11,16,0.85)";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, discY - 5, M.valveR - 14, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(230,242,252,0.3)";
  ctx.fill();
  ctx.restore();

  // The GAP is the thing worth lighting, not the valve.
  if (L > 0.02) {
    const gapTop = Math.min(seatY, discY);
    const gapH = Math.abs(discY - seatY);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = clamp(L * 1.1, 0, 1);
    const gg = ctx.createLinearGradient(0, gapTop, 0, gapTop + gapH);
    gg.addColorStop(0, rgba(tint, isSuction ? 0.55 : 0.12));
    gg.addColorStop(1, rgba(tint, isSuction ? 0.12 : 0.55));
    ctx.fillStyle = gg;
    ctx.fillRect(x - M.valveR - 4, gapTop, (M.valveR + 4) * 2, Math.max(gapH, 3));
    ctx.restore();
    bloom(ctx, rgba(tint, 0.9), 30, 0.42 * L, (c) => {
      c.beginPath();
      c.ellipse(x, seatY + 6, M.valveR + 4, 9, 0, 0, Math.PI * 2);
      c.strokeStyle = rgba(tint, 0.8);
      c.lineWidth = 4;
      c.stroke();
    });
  }
}

function drawPiston(ctx, cy, st) {
  const w = M.boreHalf - 8;
  ctx.save();
  ctx.beginPath();
  rr(ctx, -w, cy, w * 2, M.pistonH, 10);
  ctx.fillStyle = steelSide(ctx, -w, w * 2, "#EAF3FB", "#8C9CAB", "#1A242E");
  ctx.fill();
  ctx.strokeStyle = "rgba(4,9,14,0.8)";
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let i = 0; i < 3; i++) {
    const ry = cy + 22 + i * 19;
    ctx.fillStyle = "rgba(4,9,14,0.92)";
    ctx.fillRect(-w, ry, w * 2, 8);
    ctx.fillStyle = "rgba(196,216,234,0.5)";
    ctx.fillRect(-w, ry + 6.5, w * 2, 2);
  }
  // Skirt relief: a step, not a blackout. V1 dropped the lower half into
  // shadow and it read as a box bolted under the piston.
  ctx.fillStyle = "rgba(8,14,20,0.22)";
  ctx.fillRect(-w, cy + 104, w * 2, M.pistonH - 104);
  ctx.fillStyle = "rgba(186,208,228,0.16)";
  ctx.fillRect(-w, cy + 104, w * 2, 2);

  ctx.beginPath();
  ctx.ellipse(0, cy, w, 15, 0, 0, Math.PI * 2);
  const cg = ctx.createLinearGradient(-w, 0, w, 0);
  cg.addColorStop(0, "#4A5A69");
  cg.addColorStop(0.3, "#F4F9FE");
  cg.addColorStop(0.55, "#A2B2C1");
  cg.addColorStop(1, "#3C4A58");
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.strokeStyle = "rgba(8,14,20,0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = clamp(0.15 + (1 - st.volumeFrac) * 0.6, 0.15, 0.75);
  ctx.beginPath();
  ctx.ellipse(0, cy - 2, w * 0.92, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(refrigerantGlow(st.tempC), 0.5);
  ctx.fill();
  ctx.restore();

  // Wrist pin bore, open to section.
  const py = cy + M.pinDrop;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, py, 33, 0, Math.PI * 2);
  ctx.fillStyle = "#0A1119";
  ctx.fill();
  ctx.strokeStyle = "#738698";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
}

function drawRod(ctx, st, cy) {
  const th = st.theta;
  const cx = M.crankR * Math.sin(th);
  const cyy = M.crankY - M.crankR * Math.cos(th);
  const wristY = cy + M.pinDrop;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-25, wristY);
  ctx.lineTo(25, wristY);
  ctx.lineTo(cx + 44, cyy);
  ctx.lineTo(cx - 44, cyy);
  ctx.closePath();
  const rg = ctx.createLinearGradient(-46, 0, 46, 0);
  rg.addColorStop(0, "#1C2631");
  rg.addColorStop(0.34, "#C2D1DE");
  rg.addColorStop(0.6, "#637383");
  rg.addColorStop(1, "#141D26");
  ctx.fillStyle = rg;
  ctx.fill();
  ctx.strokeStyle = "rgba(4,9,14,0.85)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cyy, 50, 0, Math.PI * 2);
  ctx.fillStyle = steelSide(ctx, cx - 50, 100, "#DCE9F5", "#758595", "#131C25");
  ctx.fill();
  ctx.strokeStyle = "rgba(3,7,11,0.9)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cyy, 23, 0, Math.PI * 2);
  ctx.fillStyle = "#080E14";
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------ cut faces */

/** Only the inner contours. The outer silhouette is uncut material. */
function drawCutFaces(ctx) {
  const outerL = -M.boreHalf - M.wall - 20;
  const outerR = -outerL;
  const p = new Path2D();

  // Bore walls, from the deck down into the crankcase.
  p.moveTo(-M.boreHalf, M.deck);
  p.lineTo(-M.boreHalf, M.caseTop + 8);
  p.moveTo(M.boreHalf, M.deck);
  p.lineTo(M.boreHalf, M.caseTop + 8);

  // Head deck, either side of the valve pockets.
  p.moveTo(outerL + 10, M.deck);
  p.lineTo(-M.valveR - M.valveX - 20, M.deck);
  p.moveTo(M.valveR + M.valveX + 20, M.deck);
  p.lineTo(outerR - 10, M.deck);

  cutFace(ctx, p, 10);
}
