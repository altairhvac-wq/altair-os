/**
 * Section bands for the public pages: the backgrounds and text colors that
 * give a long page rhythm (2026-11-21).
 *
 * ============ WHY ============
 * The owner, on the all-black homepage: "it seems a little hard to look at
 * when everything is black. I don't know where my eyes should go." The
 * homepage (PR #104) and then every other all-dark public page alternate dark
 * and warm-cream sections, with gold used only where the eye should land: a
 * glow behind the hero picture, the highlighted card in a row, and one gold
 * closing band.
 *
 * Use: wrap a section in BAND.<kind>, then take its text and card classes
 * from TONE[tone] so a light section never keeps dark-page text colors.
 * Every value is a complete class string so Tailwind can see it.
 */

export type BandTone = "dark" | "light";

export const BAND = {
  /** The first screen: dark, with a warm light behind the picture on the right. */
  hero: "relative isolate bg-[radial-gradient(55%_65%_at_72%_40%,rgba(194,160,90,0.2)_0%,rgba(194,160,90,0.05)_45%,transparent_75%),linear-gradient(180deg,#0d110c_0%,#080907_100%)]",
  /** Warm cream. */
  light: "bg-[linear-gradient(180deg,#f8f3ea_0%,#f2eadb_100%)] text-[#14120e]",
  /** Dark olive with a soft gold light in one corner. */
  olive:
    "bg-[radial-gradient(50%_60%_at_15%_0%,rgba(194,160,90,0.14)_0%,transparent_70%),linear-gradient(180deg,#10150f_0%,#0b0e0a_100%)]",
  /** Plain page dark, with a faint warm light in the middle. */
  dark: "bg-[radial-gradient(45%_55%_at_50%_55%,rgba(194,160,90,0.1)_0%,transparent_70%),linear-gradient(180deg,#0b0e0a_0%,#080907_100%)]",
  /** The one closing ask. Pair with GOLD_BUTTON. */
  gold: "relative isolate overflow-hidden bg-[radial-gradient(70%_120%_at_50%_0%,#e2c27e_0%,#b8954a_55%,#8f6f2c_100%)] text-[#14120e]",
} as const;

export const TONE = {
  dark: {
    eyebrow: "text-[#c2a05a]",
    heading: "text-[#fff9ea]",
    strong: "text-[#f3ebdd]",
    body: "text-[#c9bfae]",
    muted: "text-[#8e826f]",
    card: "rounded-2xl border border-[rgba(230,227,220,0.12)] bg-[rgba(14,17,13,0.6)]",
    cardHover: "hover:border-[#c2a05a]/60",
    /** The one highlighted card in a row. */
    cardLit: "rounded-2xl border border-[#c2a05a]/55 bg-[linear-gradient(165deg,rgba(50,42,25,0.6),rgba(14,17,13,0.92))]",
    divider: "border-[rgba(230,227,220,0.1)]",
    link: "font-semibold text-[#c2a05a] underline-offset-4 hover:text-[#e8d9ac] hover:underline",
    icon: "text-[#c2a05a]",
    ringOffset: "focus-visible:ring-offset-[#080907]",
  },
  light: {
    eyebrow: "text-[#77591B]",
    heading: "text-[#14120e]",
    strong: "text-stone-800",
    body: "text-stone-600",
    muted: "text-stone-500",
    card: "rounded-2xl border border-[#e4d9c4] bg-white shadow-[0_1px_2px_rgba(20,18,14,0.04),0_14px_34px_-24px_rgba(90,68,24,0.35)]",
    cardHover: "hover:border-[#c2a05a] hover:shadow-[0_18px_40px_-22px_rgba(120,90,30,0.45)]",
    cardLit: "rounded-2xl border border-[#14120e] bg-[#14120e] text-[#fff9ea] shadow-[0_18px_40px_-22px_rgba(20,18,14,0.7)]",
    divider: "border-[#e4d9c4]",
    link: "font-semibold text-[#77591B] underline-offset-4 hover:text-[#14120e] hover:underline",
    icon: "text-[#a4823a]",
    ringOffset: "focus-visible:ring-offset-[#f5efe3]",
  },
} as const;

/** The dark button that sits on the gold band. */
export const GOLD_BUTTON =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#14120e] px-8 py-3.5 text-sm font-semibold text-[#fff9ea] shadow-[0_18px_40px_-18px_rgba(20,18,14,0.7)] transition-colors hover:bg-[#2a2620] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14120e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#c9a65c]";

/** A quiet outline button on the gold band. */
export const GOLD_SECONDARY_BUTTON =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#14120e]/30 px-7 py-3.5 text-sm font-semibold text-[#14120e] transition-colors hover:border-[#14120e]/60 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14120e]/60";

/** A light-band secondary button (outline). */
export const LIGHT_SECONDARY_BUTTON =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#d6c8ab] bg-white px-7 py-3.5 text-sm font-semibold text-[#14120e] transition-colors hover:border-[#a4823a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a4823a]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5efe3]";
