/**
 * technical_cutaway_short — the reusable Short template.
 *
 * A Short is declared, not programmed: a mechanism, a list of shots, and a list
 * of overlays with times. The template owns everything that should be identical
 * across every Altair explainer — camera interpolation, the safe-area grid, the
 * caption band, gauges, the watermark, the progress hairline — so a new Short is
 * a data file rather than a new renderer.
 *
 * The mechanism is a plug: anything exposing { state(theta), draw(ctx, state),
 * gas(ctx, state, flows, t) } can be dropped in. Reciprocating is the first;
 * scroll, rotary, screw and centrifugal are meant to arrive as siblings, and
 * each will have its OWN state function, because they do not compress alike.
 */
import { CANVAS, C, F, clamp, lerp, ease, rgba } from "./style.mjs";
import { drawBackground, drawVignette, drawFilmGrain } from "./background.mjs";
import { gauge, callout, chip, hookText, caption, progress, watermark } from "./hud.mjs";
import { textShadowed, rr } from "./draw.mjs";

export const LAYOUT = {
  captionY: 214,
  hookY: 300,
  camAnchorY: 948,
  gaugeY: 1462,
  gaugeR: 76,
  gaugeLX: 246,
  gaugeRX: 834,
  markY: 1782,
};

/**
 * Compile a declarative Short into something renderable.
 * Returns frame count, a per-frame state table, and renderFrame(ctx, i).
 */
export function buildShort(spec) {
  const fps = spec.fps ?? CANVAS.fps;
  const shots = spec.shots;
  const totalMs = shots.reduce((a, s) => a + s.dur, 0);
  const frames = Math.round((totalMs / 1000) * fps);

  // ---- precompute the mechanical timeline -------------------------------
  // Crank angle is integrated once, here, rather than recomputed per frame, so
  // a shot can specify "turn at this rate" and still hand every later frame an
  // exact angle. Flow phases are integrated the same way: when a valve shuts,
  // its stream stops advancing instead of drifting on.
  const table = [];
  let theta = spec.startTheta ?? 0;
  let sFlow = 0;
  let dFlow = 0;
  for (let i = 0; i < frames; i++) {
    const ms = (i / fps) * 1000;
    const { shot, shotT, index } = locate(shots, ms);
    const dt = 1 / fps;
    if (typeof shot.theta === "function") {
      // Choreographed: the shot names the angles it wants to show. Still the
      // real cycle — only the rate of time through it is being directed.
      theta = shot.theta(clamp(shotT / shot.dur, 0, 1), shot);
    } else {
      const rate = shot.rpm !== undefined ? (shot.rpm * Math.PI * 2) / 60 : (shot.rate ?? 0);
      theta += rate * dt;
    }
    const st = spec.mechanism.state(theta);
    sFlow += (st.suctionOpen ? 0.55 : 0.06) * dt;
    dFlow += (st.dischargeOpen ? 0.75 : 0.0) * dt;
    table.push({ ms, st, shot, shotT, index, sFlow, dFlow });
  }

  return {
    spec,
    fps,
    frames,
    totalMs,
    table,
    renderFrame: (ctx, i) => renderFrame(ctx, spec, table, i, frames, fps),
  };
}

function locate(shots, ms) {
  let acc = 0;
  for (let i = 0; i < shots.length; i++) {
    if (ms < acc + shots[i].dur || i === shots.length - 1) {
      return { shot: shots[i], shotT: ms - acc, index: i };
    }
    acc += shots[i].dur;
  }
  return { shot: shots[0], shotT: 0, index: 0 };
}

/** Camera for a moment in time: the shot's own move, eased across the cut. */
function cameraAt(spec, table, i, fps) {
  const row = table[i];
  const s = row.shot;
  const k = clamp(row.shotT / s.dur, 0, 1);
  const from = s.cam;
  const to = s.camTo ?? s.cam;
  const e = (s.camEase ?? ease.inOut)(k);
  let cam = {
    fx: lerp(from.fx, to.fx, e),
    fy: lerp(from.fy, to.fy, e),
    z: lerp(from.z, to.z, e),
  };
  // Soften the first 380ms after a cut so nothing snaps.
  const blendMs = s.hardCut ? 0 : 380;
  if (row.shotT < blendMs && row.index > 0) {
    const prev = table[Math.max(0, i - Math.round((row.shotT / 1000) * fps) - 1)];
    if (prev) {
      const pc = shotCamEnd(prev.shot);
      const b = ease.out(clamp(row.shotT / blendMs, 0, 1));
      cam = { fx: lerp(pc.fx, cam.fx, b), fy: lerp(pc.fy, cam.fy, b), z: lerp(pc.z, cam.z, b) };
    }
  }
  return cam;
}
const shotCamEnd = (s) => s.camTo ?? s.cam;

function renderFrame(ctx, spec, table, i, frames, fps) {
  const row = table[i];
  const { st } = row;
  const t = row.ms / 1000;
  const W = CANVAS.w;
  const H = CANVAS.h;
  const cam = cameraAt(spec, table, i, fps);
  const project = (x, y) => ({
    x: W / 2 + (x - cam.fx) * cam.z,
    y: LAYOUT.camAnchorY + (y - cam.fy) * cam.z,
  });

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, W, H, -cam.fx * cam.z, -cam.fy * cam.z, t);

  // ---- machine ----------------------------------------------------------
  ctx.save();
  ctx.translate(W / 2, LAYOUT.camAnchorY);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.fx, -cam.fy);
  spec.mechanism.draw(ctx, st);
  spec.mechanism.gas(ctx, st, { suction: row.sFlow, discharge: row.dFlow }, t);
  ctx.restore();

  drawVignette(ctx, W, H);

  // ---- overlays ---------------------------------------------------------
  for (const ov of spec.overlays) {
    const a = overlayAlpha(ov, row.ms);
    if (a <= 0.005) continue;
    const rev = clamp((row.ms - ov.at) / (ov.reveal ?? 420), 0, 1);
    drawOverlay(ctx, ov, a, rev, st, project, row);
  }

  // ---- permanent furniture ---------------------------------------------
  watermark(ctx, 64, LAYOUT.markY, 0.5);
  progress(ctx, W, H, i / (frames - 1));
  drawFilmGrain(ctx, W, H, i);
  ctx.restore();
}

/** Trapezoid envelope: in, hold, out. */
function overlayAlpha(ov, ms) {
  const inMs = ov.fadeIn ?? 220;
  const outMs = ov.fadeOut ?? 260;
  if (ms < ov.at) return 0;
  if (ms > ov.at + ov.dur) return 0;
  const up = clamp((ms - ov.at) / inMs, 0, 1);
  const down = clamp((ov.at + ov.dur - ms) / outMs, 0, 1);
  return Math.min(up, down);
}

function drawOverlay(ctx, ov, a, rev, st, project, row) {
  switch (ov.kind) {
    case "hook":
      hookText(ctx, ov.lines, ov.x ?? 64, ov.y ?? LAYOUT.hookY, rev * 1.6, a, ov.size ?? 74);
      break;

    case "caption":
      caption(ctx, ov.text, CANVAS.w / 2, ov.y ?? LAYOUT.captionY, a, 980);
      break;

    case "callout": {
      const anchor = ov.anchor ? project(ov.anchor[0], ov.anchor[1]) : null;
      callout(ctx, {
        x: ov.x,
        y: ov.y,
        anchor,
        title: ov.title,
        sub: ov.sub,
        tone: ov.tone,
        align: ov.align ?? "left",
        alpha: a,
        reveal: rev,
      });
      break;
    }

    case "chip": {
      // Chips can read live state so a valve label can never contradict the
      // valve it points at.
      const live =
        ov.live === "suction"
          ? `SUCTION VALVE — ${st.suctionOpen ? "OPEN" : "CLOSED"}`
          : ov.live === "discharge"
            ? `DISCHARGE VALVE — ${st.dischargeOpen ? "OPEN" : "CLOSED"}`
            : ov.text;
      const tone =
        ov.live === "suction"
          ? st.suctionOpen
            ? "cool"
            : "off"
          : ov.live === "discharge"
            ? st.dischargeOpen
              ? "hot"
              : "off"
            : ov.tone;
      chip(ctx, ov.x, ov.y, live, tone, a, ov.align ?? "left");
      break;
    }

    case "gauges": {
      gaugeCluster(ctx, st, a, ov);
      break;
    }

    case "stat": {
      bigStat(ctx, ov, a, rev, st);
      break;
    }

    case "eyebrow": {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = F.micro(27);
      ctx.textAlign = "center";
      const letters = ov.text.split("");
      const sp = 7;
      const wTot = letters.reduce((acc, ch) => acc + ctx.measureText(ch).width + sp, -sp);
      let cx = CANVAS.w / 2 - wTot / 2;
      for (const ch of letters) {
        textShadowed(ctx, ch, cx, ov.y ?? 156, F.micro(27), ov.tone === "hot" ? C.hot : C.accent, "left", "middle");
        cx += ctx.measureText(ch).width + sp;
      }
      ctx.restore();
      break;
    }

    case "arrow":
      flowArrow(ctx, ov, a, project, row);
      break;

    default:
      break;
  }
}

/** Pressure and temperature, side by side, reading straight off the model. */
function gaugeCluster(ctx, st, a, ov) {
  const y = ov.y ?? LAYOUT.gaugeY;
  const r = LAYOUT.gaugeR;
  // No full-width band: a hard horizontal edge across the frame reads as a
  // broadcast lower-third and flattens everything above it. Each instrument
  // lights its own ground instead.
  ctx.save();
  ctx.globalAlpha = a;
  for (const gx of [LAYOUT.gaugeLX, LAYOUT.gaugeRX]) {
    const rg = ctx.createRadialGradient(gx, y + 20, r * 0.6, gx, y + 20, r * 3.6);
    rg.addColorStop(0, "rgba(3,9,16,0.97)");
    rg.addColorStop(0.5, "rgba(3,9,16,0.9)");
    rg.addColorStop(0.78, "rgba(3,9,16,0.6)");
    rg.addColorStop(1, "rgba(3,9,16,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(gx - r * 3.6, y - r * 2.8, r * 7.2, r * 6.4);
  }
  ctx.restore();

  const pT = clamp((st.psig - 40) / (260 - 40), 0, 1);
  gauge(ctx, LAYOUT.gaugeLX, y, r, {
    label: "PRESSURE",
    unit: "psig",
    value: `${Math.round(st.psig)}`,
    t: pT,
    hot: pT > 0.62,
    alpha: a,
    state: { text: st.psig > 200 ? "HIGH" : st.psig > 90 ? "RISING" : "LOW", hot: pT > 0.62 },
  });

  /**
   * The right instrument is selectable.
   *
   * Every positive-displacement compressor in the series raises pressure and
   * temperature together, so a temperature gauge tells the story. A centrifugal
   * does not: it adds VELOCITY first, and pressure appears later in the
   * diffuser. Forcing it to show temperature on the right would leave the one
   * quantity its Short is actually about with nowhere to appear.
   */
  if (ov.right === "velocity") {
    const vT = clamp((st.velocityMs - 40) / (290 - 40), 0, 1);
    gauge(ctx, LAYOUT.gaugeRX, y, r, {
      label: "VELOCITY",
      unit: "m/s",
      value: `${Math.round(st.velocityMs)}`,
      t: vT,
      hot: false,
      alpha: a,
      state: { text: vT > 0.75 ? "FAST" : vT > 0.4 ? "SLOWING" : "SLOW", hot: false },
    });
    return;
  }

  const tT = clamp((st.tempC - 5) / (95 - 5), 0, 1);
  gauge(ctx, LAYOUT.gaugeRX, y, r, {
    label: "TEMPERATURE",
    unit: "°C",
    value: `${Math.round(st.tempC)}`,
    t: tT,
    hot: tT > 0.62,
    alpha: a,
    state: { text: st.tempC > 70 ? "HOT" : st.tempC > 30 ? "RISING" : "COLD", hot: tT > 0.62 },
  });
}

/**
 * One number, on a plate. V1 set this text straight onto the machinery and it
 * was the least readable thing in the whole Short — a payoff nobody can read is
 * not a payoff.
 */
function bigStat(ctx, ov, a, rev, st) {
  void st;
  const e = ease.outExpo(rev);
  const x = ov.x ?? CANVAS.w / 2;
  const w = ov.w ?? 452;
  const h = 176;
  const hot = ov.tone === "hot";

  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(0, (1 - e) * 22);
  rr(ctx, x - w / 2, ov.y, w, h, 16);
  ctx.fillStyle = "rgba(5,13,23,0.94)";
  ctx.fill();
  ctx.strokeStyle = hot ? C.hudLineHot : C.hudLine;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = hot ? C.hot : C.accent;
  ctx.fillRect(x - w / 2, ov.y + 14, 4, (h - 28) * e);

  textShadowed(ctx, ov.label, x, ov.y + 34, F.micro(24), C.textDim, "center", "middle");
  textShadowed(ctx, ov.value, x, ov.y + 92, F.mono(56), hot ? C.hotBright : C.coolBright, "center", "middle");
  if (ov.sub) textShadowed(ctx, ov.sub, x, ov.y + 144, F.body(25), C.textDim, "center", "middle");
  ctx.restore();
}

/** A directional flow arrow drawn in machine space, projected to screen. */
function flowArrow(ctx, ov, a, project, row) {
  const from = project(ov.from[0], ov.from[1]);
  const to = project(ov.to[0], ov.to[1]);
  const tone = ov.tone === "hot" ? C.hotBright : C.coolBright;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ang = Math.atan2(dy, dx);
  // Three chevrons chasing along the line — motion without moving the camera.
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(from.x, from.y);
  ctx.rotate(ang);
  for (let k = 0; k < 3; k++) {
    const p = (((row.ms / 900 + k / 3) % 1) + 1) % 1;
    const x = p * len;
    const fade = Math.sin(p * Math.PI);
    ctx.save();
    ctx.globalAlpha = a * fade;
    ctx.beginPath();
    ctx.moveTo(x - 22, -26);
    ctx.lineTo(x + 16, 0);
    ctx.lineTo(x - 22, 26);
    ctx.lineTo(x - 10, 0);
    ctx.closePath();
    ctx.fillStyle = tone;
    ctx.shadowColor = tone;
    ctx.shadowBlur = 22;
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/**
 * The cover frame — one intentional still for the Short's thumbnail.
 *
 * Not a video frame pulled at random: the mechanism is posed at an
 * operator-tuned theta/camera (presets.mjs `cover`), and the text is the
 * house hook style at cover weight — 2-5 words, readable on a phone. No
 * progress hairline, no timeline overlays: a poster, in the same visual
 * constitution as the moving picture.
 */
export function renderCover(ctx, spec) {
  const cover = spec.cover;
  if (!cover) return false;
  const W = CANVAS.w;
  const H = CANVAS.h;
  const st = spec.mechanism.state(cover.theta);
  const cam = cover.cam;

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx, W, H, -cam.fx * cam.z, -cam.fy * cam.z, 0);
  ctx.save();
  ctx.translate(W / 2, LAYOUT.camAnchorY);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.fx, -cam.fy);
  spec.mechanism.draw(ctx, st);
  spec.mechanism.gas(ctx, st, { suction: 0.4, discharge: 0.4 }, 0);
  ctx.restore();
  drawVignette(ctx, W, H);
  hookText(ctx, cover.lines, 64, cover.y ?? 320, 1.6, 1, cover.size ?? 92);
  watermark(ctx, 64, LAYOUT.markY, 0.5);
  drawFilmGrain(ctx, W, H, 0);
  ctx.restore();
  return true;
}

/** Debug: safe-area guides. Never drawn in a delivered render. */
export function drawSafeGuides(ctx) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,80,80,0.55)";
  ctx.setLineDash([12, 12]);
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 150, CANVAS.w - 128, CANVAS.h - 150 - 300);
  ctx.restore();
  void rr;
  void rgba;
}
