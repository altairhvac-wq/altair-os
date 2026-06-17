/** Altair Shell North Star v3 — dark graphite shell + warm ivory workspace + brass-gold accent. */

/* ── Shell (graphite / midnight) ──────────────────────────────── */

export const v3RootClass = "bg-[#0F141B]";

export const v3TopBarClass =
  "flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.08] bg-[#111720]/95 px-4 py-3 backdrop-blur-2xl sm:px-6";

export const v3SidebarClass =
  "hidden w-[16rem] shrink-0 flex-col border-r border-white/[0.08] bg-gradient-to-b from-[#0F141B] via-[#111720] to-[#0F141B] lg:flex";

/* ── Workspace canvas (warm ivory / stone) ──────────────────── */

export const v3CanvasClass =
  "relative flex-1 overflow-y-auto bg-[linear-gradient(180deg,#F5F2EC_0%,#EFEAE2_32%,#F5F2EC_68%,#FBF9F5_100%)]";

export const v3CanvasGlowPrimaryClass =
  "pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_70%_80%_at_50%_0%,rgba(184,148,63,0.06),transparent_72%)]";

export const v3CanvasGlowSecondaryClass =
  "pointer-events-none absolute right-0 top-0 h-36 w-44 bg-[radial-gradient(circle_at_100%_0%,rgba(41,34,24,0.04),transparent_70%)]";

/* ── Hero (dark command anchor) ───────────────────────────────── */

export const v3HeroClass =
  "relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#141B24]/98 via-[#111720]/96 to-[#0F141B]/98 p-5 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)_inset] ring-1 ring-white/[0.08] backdrop-blur-xl sm:p-6 lg:p-8";

export const v3EyebrowDarkClass =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C6A757]/90";

export const v3EyebrowLightClass =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-[rgba(41,34,24,0.55)]";

export const v3BodySecondaryDarkClass = "text-sm text-slate-300";

export const v3MetaDarkClass = "text-xs text-slate-400";

export const v3ConceptMarkerClass =
  "inline-flex items-center rounded-full bg-[#E8DDC2]/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B5A2E] ring-1 ring-[rgba(184,148,63,0.28)]";

/* ── Operating board (frosted ivory workspace) ──────────────── */

export const v3OperatingBoardClass =
  "relative overflow-hidden rounded-[1.75rem] bg-[#FBF9F5]/95 shadow-[0_4px_32px_-10px_rgba(41,34,24,0.08),0_0_0_1px_rgba(255,255,255,0.85)_inset] ring-1 ring-[rgba(41,34,24,0.10)] backdrop-blur-xl";

export const v3BoardHeaderClass =
  "border-b border-white/[0.08] bg-gradient-to-r from-[#141B24] via-[#111720] to-[#141B24] px-4 py-4 sm:px-6 sm:py-5";

export const v3ColumnHeaderClass =
  "rounded-xl border border-[rgba(41,34,24,0.10)] bg-[#FBF9F5] px-3.5 py-3 shadow-[0_1px_3px_rgba(41,34,24,0.04)]";

export const v3RowClass =
  "flex items-center gap-3 rounded-xl border border-[rgba(41,34,24,0.10)] bg-[#FBF9F5] px-3.5 py-3 shadow-[0_1px_2px_rgba(41,34,24,0.03)] transition-colors hover:border-[rgba(41,34,24,0.16)] hover:bg-white hover:shadow-[0_2px_8px_rgba(41,34,24,0.05)]";

export const v3WorkspaceTitleClass = "text-lg font-semibold text-white sm:text-xl";

export const v3WorkspaceSubheadingClass = "text-base font-semibold text-[#292218]";

export const v3BodyPrimaryClass = "text-sm font-medium text-[#3D3428]";

export const v3MetaClass = "text-xs text-[rgba(41,34,24,0.65)]";

export const v3LabelMutedClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(41,34,24,0.50)]";

export const v3LinkClass =
  "text-xs font-medium text-slate-600 transition-colors hover:text-slate-800";

/* ── Footer / bands (warm light surfaces) ─────────────────────── */

export const v3FooterClass =
  "relative overflow-hidden rounded-2xl border border-[rgba(41,34,24,0.10)] bg-[#FBF9F5]/92 shadow-[0_2px_16px_-4px_rgba(41,34,24,0.06)] backdrop-blur-xl";

export const v3BrassAccentLineClass =
  "h-px bg-gradient-to-r from-transparent via-[rgba(184,148,63,0.45)] to-transparent";

export const v3PrimaryActionClass =
  "group relative flex max-w-2xl flex-col gap-3 overflow-hidden rounded-2xl border-l-[3px] border-l-[#B8943F] bg-gradient-to-br from-[#141B24]/95 to-[#111720]/90 p-5 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.08] transition-all hover:border-l-[#C6A757] hover:ring-[rgba(184,148,63,0.28)] sm:p-6";

export const v3BrassCtaClass =
  "relative inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-[rgba(184,148,63,0.15)] px-5 py-3 text-sm font-semibold text-[#E8DDC2] ring-1 ring-[rgba(184,148,63,0.28)] transition-all group-hover:bg-[rgba(184,148,63,0.22)] group-hover:ring-[rgba(184,148,63,0.38)] sm:self-center";

export const v3BrassBadgeClass =
  "inline-flex items-center rounded-md bg-[rgba(184,148,63,0.15)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C6A757] ring-1 ring-[rgba(184,148,63,0.28)]";
