/** Shared visual tokens for the Altair OS shell concept — premium dark operating system. */

/** Root shell background — dark navy / graphite. */
export const shellRootClass = "bg-[#0a0f18]";

/** Main command canvas with subtle cyan horizon glow. */
export const shellCanvasClass =
  "relative flex-1 overflow-y-auto bg-[linear-gradient(180deg,#0a0f18_0%,#0d1420_45%,#0a1019_100%)]";

export const shellCanvasGlowClass =
  "pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(34,211,238,0.09),transparent_65%)]";

export const shellCanvasGlowSecondaryClass =
  "pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_50%_80%_at_80%_0%,rgba(99,102,241,0.06),transparent_70%)]";

/** Frosted dimensional panel — composed operating zone. */
export const shellZoneClass =
  "relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950 p-4 ring-1 ring-slate-700/40 backdrop-blur-sm sm:p-5 lg:p-6";

/** Dominant command deck — one primary canvas. */
export const shellCommandDeckClass =
  "relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#0c1220] via-slate-950 to-[#0a0f18] p-4 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.04)_inset] sm:p-5 lg:p-6";

/** Nested frosted inset surface inside a zone. */
export const shellInsetClass =
  "rounded-xl bg-slate-950/55 p-4 ring-1 ring-slate-700/30 backdrop-blur-[2px]";

/** Dark frosted top bar. */
export const shellTopBarClass =
  "flex shrink-0 items-center justify-between gap-4 border-b border-slate-800/80 bg-slate-950/70 px-4 py-3 backdrop-blur-xl sm:px-6";

/** Quiet system status dock at the bottom. */
export const shellStatusDockClass =
  "flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950/80 px-4 py-3 ring-1 ring-slate-800/60 backdrop-blur-sm";

/** Zone eyebrow label — restrained intelligence accent. */
export const shellEyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/70";

/** Internal concept marker — visible to team only. */
export const shellConceptMarkerClass =
  "inline-flex items-center rounded-full bg-indigo-950/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-300/90 ring-1 ring-indigo-500/20";
