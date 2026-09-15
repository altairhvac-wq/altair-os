/**
 * SHORT: "Why is the suction line cold?"
 *
 * Same visual system, same machine, different question. This one exists to
 * prove the template is reusable: nothing below is a new renderer, only new
 * data — shots, camera moves, overlay times and a narration track.
 *
 * The answer is a chain, so the Short is built as a chain: the line is cold
 * because what is inside it is cold, and what is inside it is cold because it
 * just finished boiling in the evaporator and stealing heat from the room.
 */
import { ease, lerp } from "../engine/style.mjs";
import { reciprocating } from "./recip-what-happens.mjs";

const TAU = Math.PI * 2;
const T = { hook: 2600, inside: 4200, why: 4600, pull: 3400, payoff: 3400 };
const S = {
  hook: 0,
  inside: T.hook,
  why: T.hook + T.inside,
  pull: T.hook + T.inside + T.why,
  payoff: T.hook + T.inside + T.why + T.pull,
};

export const spec = {
  id: "alt-hvac-s002-suction-cold",
  title: "Why is the suction line cold?",
  topic: "Suction line temperature",
  hookType: "question",
  takeaway: "The line is cold because the refrigerant inside it is cold — it just boiled in the evaporator.",
  takeawayType: "diagnostic-cue",
  mechanism: reciprocating,
  startTheta: 0.6,

  shots: [
    /* 1 — HOOK. Open on the cold line itself, sweating into the frame. */
    {
      id: "hook",
      dur: T.hook,
      theta: (k) => lerp(0.6, 0.6 + TAU * 0.6, ease.inOut(k)),
      cam: { fx: -300, fy: -140, z: 1.18 },
      camTo: { fx: -220, fy: -120, z: 1.26 },
      camEase: ease.out,
    },
    /* 2 — WHAT IS INSIDE. Blue particles, and the numbers that go with them. */
    {
      id: "inside",
      dur: T.inside,
      theta: (k) => lerp(0.6 + TAU * 0.6, 0.6 + TAU * 1.15, ease.inOut(k)),
      cam: { fx: -240, fy: -120, z: 1.22 },
      camTo: { fx: -150, fy: -60, z: 1.1 },
    },
    /* 3 — WHY IT IS COLD. Low pressure means a low boiling point. */
    {
      id: "why",
      dur: T.why,
      theta: (k) => lerp(0.6 + TAU * 1.15, 0.6 + TAU * 1.7, ease.inOut(k)),
      cam: { fx: -110, fy: -40, z: 1.14 },
      camTo: { fx: -60, fy: 30, z: 1.2 },
    },
    /* 4 — WHERE IT GOES. The compressor draws it in; the chain closes. */
    {
      id: "pull",
      dur: T.pull,
      theta: () => 1.35,
      cam: { fx: -40, fy: 20, z: 1.2 },
      camTo: { fx: -20, fy: 90, z: 1.14 },
    },
    /* 5 — PAYOFF. The diagnostic version of the answer. */
    {
      id: "payoff",
      dur: T.payoff,
      theta: (k) => lerp(1.35, 1.35 + TAU * 0.5, ease.inOut(k)),
      cam: { fx: 20, fy: 120, z: 1.1 },
      camTo: { fx: 30, fy: 150, z: 1.0 },
      camEase: ease.out,
    },
  ],

  overlays: [
    { kind: "hook", at: 120, dur: 2320, reveal: 700, y: 256, size: 64, lines: [{ text: "Why is the suction" }, { text: "line always cold?", accent: true }] },
    { kind: "arrow", at: 600, dur: 1800, from: [-620, -188], to: [-380, -188], tone: "cool" },

    { kind: "eyebrow", at: S.inside + 120, dur: T.inside - 240, text: "INSIDE THE SUCTION LINE" },
    { kind: "caption", at: S.inside + 160, dur: 2100, text: "Because of what is inside it" },
    { kind: "caption", at: S.inside + 2400, dur: 1700, text: "Cold, low-pressure vapour" },
    { kind: "gauges", at: S.inside + 300, dur: S.payoff - S.inside - 300, fadeOut: 500 },
    { kind: "chip", at: S.inside + 1000, dur: 2900, x: 64, y: 330, text: "STRAIGHT FROM THE EVAPORATOR", tone: "cool" },

    { kind: "eyebrow", at: S.why + 120, dur: T.why - 240, text: "WHY IT IS COLD" },
    { kind: "caption", at: S.why + 160, dur: 2200, text: "Low pressure means a low boiling point" },
    { kind: "caption", at: S.why + 2500, dur: 2000, text: "So it boils at room temperature — and boiling takes heat" },
    { kind: "chip", at: S.why + 1200, dur: 3200, align: "right", x: 1024, y: 1000, text: "~60 psig", tone: "cool" },
    { kind: "chip", at: S.why + 2000, dur: 2400, align: "right", x: 1024, y: 1072, text: "BOILS NEAR 5 °C", tone: "cool" },

    { kind: "eyebrow", at: S.pull + 120, dur: T.pull - 240, text: "INTO THE COMPRESSOR" },
    { kind: "caption", at: S.pull + 160, dur: 2600, text: "The compressor pulls it in still cold" },
    { kind: "chip", at: S.pull + 600, dur: 2400, live: "suction", x: 64, y: 330 },

    { kind: "hook", at: S.payoff + 180, dur: T.payoff - 280, reveal: 700, y: 262, size: 54, lines: [{ text: "A cold suction line" }, { text: "means it's absorbing heat.", accent: true }] },
    { kind: "stat", at: S.payoff + 900, dur: T.payoff - 1000, x: 540, y: 1372, label: "AT THE COMPRESSOR INLET", value: "15 °C", sub: "cool vapour, low pressure — this is normal" },
  ],

  narration: [
    { at: 220, text: "Why is the suction line always the cold one?", visual: "cold blue line filling the frame" },
    { at: S.inside + 180, text: "Because of what's inside it. Cold, low-pressure vapour, straight off the evaporator.", visual: "blue particles, gauges read 60 psig and 15 C" },
    { at: S.why + 180, text: "Low pressure means a low boiling point. Down here the refrigerant boils at around room temperature.", visual: "pressure chip, boiling-point chip" },
    { at: S.why + 2500, text: "And boiling takes heat — that heat comes out of your house.", visual: "particles brighten" },
    { at: S.pull + 180, text: "The compressor pulls it in still cold.", visual: "suction valve open, piston descending" },
    { at: S.payoff + 250, text: "So a cold suction line isn't a fault. It's the system working.", visual: "wide machine, inlet stat" },
  ],

  generationNotes: [
    "Second Short under ALT-HVAC-CUTAWAY-V1; reuses the reciprocating mechanism plug unchanged.",
    "Camera lives on the suction side throughout so the subject of the question is always the subject of the frame.",
    "Boiling point stated as a range near room temperature rather than a single exact figure, because it moves with refrigerant and saturation pressure.",
  ],
};
