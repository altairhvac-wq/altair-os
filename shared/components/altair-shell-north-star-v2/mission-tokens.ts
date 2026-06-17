/** Altair Mission Control v2.2 — dark shell, light workspace tokens. */

/* ── Shell (dark) ─────────────────────────────────────────────── */

export const missionRootClass = "bg-[#060912]";

export const missionTopBarClass =
  "flex shrink-0 items-center justify-between gap-4 border-b border-slate-800/70 bg-[#060912]/90 px-4 py-3 backdrop-blur-2xl sm:px-6";

/* ── Workspace canvas (light, below hero) ───────────────────── */

export const missionCanvasClass =
  "relative flex-1 overflow-y-auto bg-[radial-gradient(ellipse_100%_55%_at_50%_0%,rgba(34,211,238,0.07),transparent_58%),linear-gradient(180deg,#dce4ed_0%,#eef2f6_30%,#f4f7fa_100%)]";

export const missionCanvasGlowPrimaryClass =
  "pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_55%_90%_at_50%_0%,rgba(34,211,238,0.1),transparent_72%)]";

export const missionCanvasGlowSecondaryClass =
  "pointer-events-none absolute right-0 top-0 h-56 w-56 bg-[radial-gradient(circle_at_100%_0%,rgba(99,102,241,0.06),transparent_68%)]";

export const missionCanvasGlowAccentClass =
  "pointer-events-none absolute bottom-0 left-0 h-48 w-80 bg-[radial-gradient(circle_at_0%_100%,rgba(148,163,184,0.08),transparent_72%)]";

/* ── Hero (dark anchor — unchanged from v2.1) ─────────────────── */

export const missionHeroClass =
  "relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0c1424]/95 via-[#0a101c]/90 to-[#060912]/95 p-5 shadow-[0_32px_100px_-20px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.05)_inset,0_1px_0_0_rgba(255,255,255,0.06)_inset] ring-1 ring-white/[0.06] backdrop-blur-xl sm:p-6 lg:p-8";

/** Eyebrow on dark surfaces (hero, board header dock). */
export const missionEyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/90";

/** Eyebrow on light workspace surfaces. */
export const missionEyebrowLightClass =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-600";

export const missionBodySecondaryClass = "text-sm text-slate-300";

export const missionMetaDarkClass = "text-xs text-slate-400";

export const missionConceptMarkerClass =
  "inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700 ring-1 ring-violet-200";

/* ── Operating board (frosted light surface) ──────────────────── */

export const missionOperatingBoardClass =
  "relative overflow-hidden rounded-[1.75rem] bg-white/72 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.1),0_0_0_1px_rgba(255,255,255,0.8)_inset] ring-1 ring-slate-200/90 backdrop-blur-xl";

/** Dark header dock — hierarchy anchor on light board. */
export const missionBoardHeaderClass =
  "border-b border-slate-800/30 bg-gradient-to-r from-[#0f172a] via-slate-900 to-[#0f172a] px-4 py-4 sm:px-6 sm:py-5";

/** Dark mini-dock for column section headers. */
export const missionColumnHeaderClass =
  "rounded-xl bg-gradient-to-br from-slate-900/95 via-[#0f172a]/90 to-slate-800/95 px-3.5 py-3 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.35)] ring-1 ring-slate-700/35";

/** Light workspace list row — high readability for daily use. */
export const missionRowClass =
  "flex items-center gap-3 rounded-xl bg-white/95 px-3.5 py-3 shadow-[0_1px_4px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/90 transition-colors hover:bg-white hover:ring-slate-300/90 hover:shadow-[0_2px_10px_rgba(15,23,42,0.07)]";

/** Light workspace text tokens. */
export const missionWorkspaceTitleClass = "text-lg font-semibold text-white sm:text-xl";
export const missionWorkspaceHeadingClass = "text-base font-semibold text-white";
export const missionWorkspaceSubheadingClass = "text-base font-semibold text-slate-800";
export const missionBodyPrimaryClass = "text-sm font-medium text-slate-800";
export const missionMetaClass = "text-xs text-slate-500";
export const missionLabelMutedClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";

export const missionLinkClass =
  "text-xs font-medium text-cyan-600 transition-colors hover:text-cyan-700";

/* ── Footer (frosted light band) ────────────────────────────── */

export const missionFooterClass =
  "relative overflow-hidden rounded-2xl bg-white/70 shadow-[0_4px_24px_-6px_rgba(15,23,42,0.08),0_0_0_1px_rgba(255,255,255,0.7)_inset] ring-1 ring-slate-200/90 backdrop-blur-xl";

/* ── Legacy tokens (unused in v2.2 layout, kept for compat) ─── */

export const missionGlassCardClass =
  "relative overflow-hidden rounded-2xl bg-white/75 p-4 shadow-[0_4px_24px_-6px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/90 backdrop-blur-xl sm:p-5";

export const missionZoneClass =
  "relative overflow-hidden rounded-[1.75rem] bg-white/72 p-4 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.1)] ring-1 ring-slate-200/90 backdrop-blur-xl sm:p-5 lg:p-6";

export const missionDockClass =
  "rounded-2xl bg-white/70 p-4 ring-1 ring-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:p-5";
