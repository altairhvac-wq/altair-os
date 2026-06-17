/** Altair Mission Control v2.3 — dark shell, dark hero, light workspace. */

/* ── Shell (dark navy / graphite) ─────────────────────────────── */

export const missionRootClass = "bg-[#0b1220]";

export const missionTopBarClass =
  "flex shrink-0 items-center justify-between gap-4 border-b border-slate-800/60 bg-[#0b1220]/95 px-4 py-3 backdrop-blur-2xl sm:px-6";

/* ── Workspace canvas (mist / soft blue-gray) ─────────────────── */

export const missionCanvasClass =
  "relative flex-1 overflow-y-auto bg-[linear-gradient(180deg,#d8e0ea_0%,#e4eaf1_28%,#edf1f6_62%,#f2f5f8_100%)]";

export const missionCanvasGlowPrimaryClass =
  "pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_70%_80%_at_50%_0%,rgba(148,163,184,0.14),transparent_72%)]";

export const missionCanvasGlowSecondaryClass =
  "pointer-events-none absolute right-0 top-0 h-40 w-48 bg-[radial-gradient(circle_at_100%_0%,rgba(100,116,139,0.08),transparent_70%)]";

export const missionCanvasGlowAccentClass =
  "pointer-events-none absolute bottom-0 left-0 h-40 w-64 bg-[radial-gradient(circle_at_0%_100%,rgba(148,163,184,0.06),transparent_72%)]";

/* ── Hero (dark command anchor) ───────────────────────────────── */

export const missionHeroClass =
  "relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#111b2e]/98 via-[#0e1726]/96 to-[#0b1220]/98 p-5 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)_inset] ring-1 ring-slate-700/30 backdrop-blur-xl sm:p-6 lg:p-8";

/** Eyebrow on dark surfaces (hero, board header dock). */
export const missionEyebrowClass =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/90";

/** Eyebrow on light workspace surfaces. */
export const missionEyebrowLightClass =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500";

export const missionBodySecondaryClass = "text-sm text-slate-300";

export const missionMetaDarkClass = "text-xs text-slate-400";

export const missionConceptMarkerClass =
  "inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700 ring-1 ring-violet-200/80";

/* ── Operating board (frosted light workspace) ────────────────── */

export const missionOperatingBoardClass =
  "relative overflow-hidden rounded-[1.75rem] bg-[#f6f8fb]/92 shadow-[0_4px_32px_-10px_rgba(15,23,42,0.08),0_0_0_1px_rgba(255,255,255,0.9)_inset] ring-1 ring-slate-200/80 backdrop-blur-xl";

/** Dark header dock — hierarchy anchor on light board. */
export const missionBoardHeaderClass =
  "border-b border-slate-700/25 bg-gradient-to-r from-[#111b2e] via-[#0f1729] to-[#111b2e] px-4 py-4 sm:px-6 sm:py-5";

/** Light column section header — readable daily-use anchor. */
export const missionColumnHeaderClass =
  "rounded-xl border border-slate-200/90 bg-white/85 px-3.5 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]";

/** Light workspace list row — high readability for daily use. */
export const missionRowClass =
  "flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors hover:border-slate-300/90 hover:bg-white hover:shadow-[0_2px_8px_rgba(15,23,42,0.05)]";

/** Text tokens — dark surfaces. */
export const missionWorkspaceTitleClass = "text-lg font-semibold text-white sm:text-xl";
export const missionWorkspaceHeadingClass = "text-base font-semibold text-white";

/** Text tokens — light surfaces. */
export const missionWorkspaceSubheadingClass = "text-base font-semibold text-slate-900";
export const missionBodyPrimaryClass = "text-sm font-medium text-slate-800";
export const missionMetaClass = "text-xs text-slate-600";
export const missionLabelMutedClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";

export const missionLinkClass =
  "text-xs font-medium text-blue-600 transition-colors hover:text-blue-700";

/* ── Footer (frosted light band) ──────────────────────────────── */

export const missionFooterClass =
  "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-[#f6f8fb]/90 shadow-[0_2px_16px_-4px_rgba(15,23,42,0.06)] backdrop-blur-xl";

/* ── Legacy tokens (unused in v2.3 layout, kept for compat) ─── */

export const missionGlassCardClass =
  "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] backdrop-blur-xl sm:p-5";

export const missionZoneClass =
  "relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-[#f6f8fb]/92 p-4 shadow-[0_4px_32px_-10px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5 lg:p-6";

export const missionDockClass =
  "rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-[0_1px_4px_rgba(15,23,42,0.03)] backdrop-blur-xl sm:p-5";
