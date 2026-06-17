/** Altair Mission Control v2 — premium dark command center tokens. */

export const missionRootClass = "bg-[#060912]";

export const missionCanvasClass =
  "relative flex-1 overflow-y-auto bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(34,211,238,0.07),transparent_50%),linear-gradient(180deg,#060912_0%,#0a0f1a_40%,#070b14_100%)]";

export const missionCanvasGlowPrimaryClass =
  "pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(34,211,238,0.12),transparent_70%)]";

export const missionCanvasGlowSecondaryClass =
  "pointer-events-none absolute right-0 top-0 h-80 w-80 bg-[radial-gradient(circle_at_100%_0%,rgba(99,102,241,0.1),transparent_65%)]";

export const missionCanvasGlowAccentClass =
  "pointer-events-none absolute bottom-0 left-0 h-64 w-96 bg-[radial-gradient(circle_at_0%_100%,rgba(139,92,246,0.06),transparent_70%)]";

/** Dominant hero surface — the primary focal canvas. */
export const missionHeroClass =
  "relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0c1424]/95 via-[#0a101c]/90 to-[#060912]/95 p-5 shadow-[0_32px_100px_-20px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.05)_inset,0_1px_0_0_rgba(255,255,255,0.06)_inset] ring-1 ring-white/[0.06] backdrop-blur-xl sm:p-6 lg:p-8";

/** High-contrast glass card for priority modules. */
export const missionGlassCardClass =
  "relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/90 p-4 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)_inset] ring-1 ring-slate-700/40 backdrop-blur-md sm:p-5";

/** Operating zone — one of three strong zones. */
export const missionZoneClass =
  "relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-900/90 via-[#0c1220]/85 to-slate-950/95 p-4 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.03)_inset] ring-1 ring-slate-700/35 backdrop-blur-sm sm:p-5 lg:p-6";

/** Inset list row inside a zone. */
export const missionRowClass =
  "flex items-center gap-3 rounded-xl bg-slate-950/50 px-3.5 py-3 ring-1 ring-slate-800/40 transition-colors hover:bg-slate-900/60 hover:ring-slate-700/50";

export const missionTopBarClass =
  "flex shrink-0 items-center justify-between gap-4 border-b border-slate-800/70 bg-[#060912]/90 px-4 py-3 backdrop-blur-2xl sm:px-6";

export const missionEyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/80";

export const missionConceptMarkerClass =
  "inline-flex items-center rounded-full bg-violet-950/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300/90 ring-1 ring-violet-500/25";

export const missionDockClass =
  "rounded-2xl bg-slate-950/70 p-4 ring-1 ring-slate-800/50 backdrop-blur-sm sm:p-5";
