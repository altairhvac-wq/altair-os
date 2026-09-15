/**
 * SHORT: "Why is the discharge line hot?"
 *
 * The companion to the suction Short, and deliberately the mirror image of it:
 * same machine, same instruments, opposite end, opposite colour. Seen back to
 * back the pair should teach the whole temperature story without either one
 * having to carry both halves.
 *
 * The answer viewers usually give is "because the refrigerant is hot". The
 * answer this Short gives is the mechanism underneath that: the compressor put
 * work in, and there is nowhere for work to go except into the gas.
 */
import { ease, lerp } from "../engine/style.mjs";
import { CUE } from "../mechanisms/reciprocating.mjs";
import { reciprocating } from "./recip-what-happens.mjs";

const TAU = Math.PI * 2;
const T = { hook: 2600, squeeze: 5200, open: 4000, line: 3600, payoff: 3400 };
const S = {
  hook: 0,
  squeeze: T.hook,
  open: T.hook + T.squeeze,
  line: T.hook + T.squeeze + T.open,
  payoff: T.hook + T.squeeze + T.open + T.line,
};

const A = {
  bdc: Math.PI * 0.995,
  beforeOpen: CUE.dischargeStart - 0.06,
  afterOpen: CUE.dischargeStart + 0.55,
  nearTop: TAU - 0.12,
};

export const spec = {
  id: "alt-hvac-s003-discharge-hot",
  title: "Why is the discharge line hot?",
  topic: "Discharge line temperature",
  hookType: "question",
  takeaway: "Compression puts work into the gas, and work has nowhere to go but into its temperature.",
  takeawayType: "principle",
  mechanism: reciprocating,
  startTheta: A.bdc,

  shots: [
    /* 1 — HOOK. Open on the copper, already glowing. */
    {
      id: "hook",
      dur: T.hook,
      theta: (k) => lerp(A.beforeOpen, A.nearTop, ease.inOut(k)),
      cam: { fx: 280, fy: -190, z: 1.2 },
      camTo: { fx: 230, fy: -150, z: 1.3 },
      camEase: ease.out,
    },
    /* 2 — THE SQUEEZE. Where the heat is actually made. */
    {
      id: "squeeze",
      dur: T.squeeze,
      theta: (k) => lerp(A.bdc, A.beforeOpen, ease.inOut(k)),
      cam: { fx: 0, fy: 100, z: 1.16 },
      camTo: { fx: 0, fy: 14, z: 1.34 },
      camEase: ease.inOut,
    },
    /* 3 — THE VALVE OPENS. The heat leaves the cylinder. */
    {
      id: "open",
      dur: T.open,
      theta: (k) => lerp(A.beforeOpen, A.afterOpen, ease.out(k)),
      cam: { fx: 60, fy: -20, z: 1.3 },
      camTo: { fx: 130, fy: -70, z: 1.16 },
    },
    /* 4 — THE LINE. Follow it away toward the condenser. */
    {
      id: "line",
      dur: T.line,
      theta: (k) => lerp(A.afterOpen, A.nearTop, ease.inOut(k)),
      cam: { fx: 190, fy: -110, z: 1.14 },
      camTo: { fx: 250, fy: -180, z: 1.08 },
    },
    /* 5 — PAYOFF. The principle, then the number. */
    {
      id: "payoff",
      dur: T.payoff,
      theta: (k) => A.nearTop + ease.inOut(k) * TAU * 0.55,
      cam: { fx: 60, fy: 110, z: 1.16 },
      camTo: { fx: 66, fy: 140, z: 1.02 },
      camEase: ease.out,
    },
  ],

  overlays: [
    { kind: "hook", at: 120, dur: 2320, reveal: 700, y: 256, size: 64, lines: [{ text: "Why is the discharge" }, { text: "line so hot?", accent: true }] },
    { kind: "arrow", at: 600, dur: 1800, from: [664, -300], to: [664, -560], tone: "hot" },

    { kind: "eyebrow", at: S.squeeze + 120, dur: T.squeeze - 240, text: "WHERE THE HEAT IS MADE" },
    { kind: "caption", at: S.squeeze + 160, dur: 2300, text: "It isn't hot because it came from somewhere hot" },
    { kind: "caption", at: S.squeeze + 2700, dur: 2300, text: "It got hot right here" },
    { kind: "gauges", at: S.squeeze + 300, dur: S.payoff - S.squeeze - 300, fadeOut: 500 },
    { kind: "chip", at: S.squeeze + 800, dur: T.squeeze - 1000, live: "suction", x: 64, y: 330 },
    { kind: "chip", at: S.squeeze + 1000, dur: T.squeeze + T.open - 1200, live: "discharge", x: 64, y: 396 },
    { kind: "chip", at: S.squeeze + 2400, dur: 2600, align: "right", x: 1024, y: 1000, text: "SAME GAS", tone: "cool" },
    { kind: "chip", at: S.squeeze + 3200, dur: 1800, align: "right", x: 1024, y: 1072, text: "SMALLER SPACE", tone: "hot" },

    { kind: "eyebrow", at: S.open + 120, dur: T.open - 240, text: "DISCHARGE OPENS", tone: "hot" },
    { kind: "caption", at: S.open + 160, dur: 2300, text: "Squeezing a gas is work — and work becomes heat" },
    { kind: "caption", at: S.open + 2600, dur: 1300, text: "Then the valve opens" },

    { kind: "eyebrow", at: S.line + 120, dur: T.line - 240, text: "TO THE CONDENSER", tone: "hot" },
    { kind: "caption", at: S.line + 160, dur: 2600, text: "That heat is what the condenser has to dump" },
    { kind: "arrow", at: S.line + 300, dur: 3000, from: [664, -300], to: [664, -600], tone: "hot" },

    { kind: "hook", at: S.payoff + 180, dur: T.payoff - 280, reveal: 700, y: 262, size: 54, lines: [{ text: "The heat isn't from the house." }, { text: "It's the work you paid for.", accent: true }] },
    { kind: "stat", at: S.payoff + 900, dur: T.payoff - 1000, x: 540, y: 1372, label: "AT THE COMPRESSOR OUTLET", value: "85 °C", tone: "hot", sub: "hot enough to burn — treat the line as live" },
  ],

  narration: [
    { at: 220, text: "Why is the discharge line hot enough to burn you?", visual: "glowing copper riser filling frame" },
    { at: S.squeeze + 180, text: "It's not hot because it came from somewhere hot. It got hot right here.", visual: "camera pushes into the shrinking chamber" },
    { at: S.squeeze + 2700, text: "Same gas, much smaller space. Squeezing it is work.", visual: "particles pack, colour shifts toward orange" },
    { at: S.open + 200, text: "And work has nowhere to go except into the temperature of that gas.", visual: "gauges sweep to 250 psig and 85 C" },
    { at: S.line + 200, text: "Then the valve opens and all of it heads for the condenser.", visual: "discharge valve lifts, orange up the elbow" },
    { at: S.payoff + 250, text: "That heat isn't from your house. It's the work you paid for.", visual: "wide machine, outlet stat" },
  ],

  generationNotes: [
    "Third Short under ALT-HVAC-CUTAWAY-V1; deliberate mirror of the suction Short for pairing.",
    "Hot side only: the camera never crosses to the suction pipe after the hook.",
    "Safety line in the payoff sub-label is intentional — the number alone reads as trivia.",
  ],
};
