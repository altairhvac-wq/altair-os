/** Altair Shell North Star v3.1 — graphite shell + warm ivory workspace + restrained brass signature. */

/* ── Shell (graphite / midnight) ──────────────────────────────── */

export const v3RootClass = "bg-[#0F141B]";

export const v3TopBarClass =
  "flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.08] bg-[#111720]/95 px-4 py-3 backdrop-blur-2xl sm:px-6";

export const v3SidebarClass =
  "hidden w-[16rem] shrink-0 flex-col border-r border-white/[0.08] bg-gradient-to-b from-[#0F141B] via-[#111720] to-[#0F141B] lg:flex";

export const v3NavActiveRailClass =
  "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[#B8943F]";

/* ── Workspace canvas (warm ivory / stone) ──────────────────── */

export const v3CanvasClass =
  "relative flex-1 overflow-y-auto bg-[linear-gradient(180deg,#F5F2EC_0%,#EFEAE2_28%,#F5F2EC_72%,#FBF9F5_100%)]";

export const v3CanvasGlowPrimaryClass =
  "pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_60%_70%_at_30%_0%,rgba(184,148,63,0.05),transparent_70%)]";

export const v3CanvasGlowSecondaryClass =
  "pointer-events-none absolute right-0 top-0 h-28 w-40 bg-[radial-gradient(circle_at_100%_0%,rgba(41,34,24,0.03),transparent_68%)]";

/* ── Hero (ivory shell + compact command anchor) ──────────────── */

export const v3HeroShellClass =
  "relative overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,#FBF9F5_0%,#F5F2EC_100%)] shadow-[0_10px_44px_-14px_rgba(41,34,24,0.14),0_0_0_1px_rgba(255,255,255,0.92)_inset] ring-1 ring-[rgba(41,34,24,0.08)]";

export const v3HeroBrassRailClass =
  "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(184,148,63,0.55)] to-transparent";

export const v3HeroHeaderClass =
  "border-b border-[rgba(184,148,63,0.14)] px-5 py-4 sm:px-6 sm:py-5";

export const v3HeroBodyClass = "px-5 py-4 sm:px-6 sm:py-5";

export const v3HeroFooterClass =
  "border-t border-[rgba(184,148,63,0.12)] bg-[#EFEAE2]/35 px-5 py-4 sm:px-6";

export const v3EyebrowBrassClass =
  "text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8B7232]";

export const v3EyebrowLightClass =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(41,34,24,0.52)]";

export const v3HeroTitleClass =
  "text-xl font-semibold tracking-tight text-[#292218] sm:text-2xl";

export const v3BodyPrimaryClass = "text-sm font-medium text-[#3D3428]";

export const v3BodySecondaryClass = "text-sm text-[rgba(41,34,24,0.72)]";

export const v3MetaClass = "text-xs text-[rgba(41,34,24,0.62)]";

export const v3MetaDarkClass = "text-xs text-slate-400";

export const v3BodySecondaryDarkClass = "text-sm text-slate-300";

export const v3ConceptMarkerClass =
  "inline-flex items-center rounded-full bg-[#E8DDC2]/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B5A2E] ring-1 ring-[rgba(184,148,63,0.28)]";

/* ── Command card (compact dark anchor) ───────────────────────── */

export const v3CommandCardClass =
  "relative overflow-hidden rounded-xl bg-gradient-to-br from-[#171A1F] via-[#141B24] to-[#111720] shadow-[0_10px_36px_-14px_rgba(0,0,0,0.38),0_0_0_1px_rgba(255,255,255,0.05)_inset] ring-1 ring-[rgba(184,148,63,0.14)]";

export const v3PrimaryActionClass =
  "group relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border-l-[3px] border-l-[#B8943F] bg-gradient-to-br from-[#171A1F] via-[#141B24] to-[#111720] p-4 text-left shadow-[0_10px_36px_-14px_rgba(0,0,0,0.38)] ring-1 ring-[rgba(184,148,63,0.14)] transition-all hover:border-l-[#C6A757] hover:ring-[rgba(184,148,63,0.28)] sm:flex-row sm:items-center sm:justify-between sm:p-5";

export const v3BrassCtaClass =
  "relative inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-[#B8943F] px-4 py-2.5 text-sm font-semibold text-[#FBF9F5] shadow-[0_2px_10px_rgba(184,148,63,0.28)] transition-all group-hover:bg-[#C6A757] sm:self-center";

export const v3BrassBadgeClass =
  "inline-flex items-center rounded-md bg-[rgba(184,148,63,0.18)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E8DDC2] ring-1 ring-[rgba(184,148,63,0.32)]";

export const v3BrassAccentLineClass =
  "h-px bg-gradient-to-r from-transparent via-[rgba(184,148,63,0.45)] to-transparent";

export const v3SecondaryActionClass =
  "group inline-flex items-center gap-2 rounded-lg border border-[rgba(41,34,24,0.08)] bg-[#FBF9F5]/90 px-3 py-2 shadow-[0_1px_3px_rgba(41,34,24,0.04)] transition-all hover:border-[rgba(184,148,63,0.22)] hover:shadow-[0_3px_10px_rgba(41,34,24,0.06)]";

export const v3InsightSurfaceClass =
  "rounded-lg border-l-2 border-l-[#B8943F] bg-[#FBF9F5]/80 px-4 py-3 ring-1 ring-[rgba(41,34,24,0.06)]";

export const v3SignalChipClass =
  "flex flex-col gap-0.5 rounded-lg border border-[rgba(41,34,24,0.08)] bg-[#FBF9F5]/90 px-3 py-2 shadow-[0_1px_3px_rgba(41,34,24,0.04)]";

export const v3OpsScoreInlineClass =
  "inline-flex items-center gap-2 rounded-lg border border-[rgba(184,148,63,0.18)] bg-[#FBF9F5]/90 px-3 py-1.5 shadow-[0_1px_3px_rgba(41,34,24,0.04)]";

/* ── Operating board (unified ivory material) ─────────────────── */

export const v3OperatingBoardClass =
  "relative overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,#FBF9F5_0%,#F5F2EC_48%,#FBF9F5_100%)] shadow-[0_10px_44px_-14px_rgba(41,34,24,0.12),0_0_0_1px_rgba(255,255,255,0.88)_inset] ring-1 ring-[rgba(41,34,24,0.08)]";

export const v3BoardHeaderClass =
  "border-b border-[rgba(184,148,63,0.14)] px-5 py-4 sm:px-6 sm:py-5";

export const v3BoardTitleClass = "text-lg font-semibold text-[#292218] sm:text-xl";

export const v3ColumnHeaderClass =
  "rounded-lg border border-[rgba(184,148,63,0.12)] bg-[#FBF9F5]/85 px-3.5 py-3 shadow-[0_1px_4px_rgba(41,34,24,0.04)]";

export const v3ColumnRailClass =
  "pointer-events-none absolute right-0 top-5 bottom-5 hidden w-px bg-gradient-to-b from-transparent via-[rgba(184,148,63,0.28)] to-transparent lg:block";

export const v3RowClass =
  "flex items-center gap-3 rounded-lg border border-[rgba(41,34,24,0.07)] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBF9F5_100%)] px-3.5 py-3 shadow-[0_1px_4px_rgba(41,34,24,0.04)] transition-all hover:border-[rgba(184,148,63,0.20)] hover:shadow-[0_4px_14px_rgba(41,34,24,0.07)]";

export const v3WorkspaceSubheadingClass = "text-base font-semibold text-[#292218]";

export const v3LabelMutedClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(41,34,24,0.48)]";

export const v3LinkClass =
  "text-xs font-medium text-[#8B7232] transition-colors hover:text-[#6B5A2E]";

export const v3ConnectionChipClass =
  "inline-flex items-center gap-1.5 rounded-md border border-[rgba(184,148,63,0.14)] bg-[#FBF9F5]/80 px-2.5 py-1.5 text-[10px] font-medium text-[rgba(41,34,24,0.72)]";

/* ── Footer / bands (crafted warm surfaces) ───────────────────── */

export const v3FooterClass =
  "relative overflow-hidden rounded-[1.25rem] bg-[linear-gradient(180deg,#FBF9F5_0%,#F5F2EC_100%)] shadow-[0_6px_28px_-10px_rgba(41,34,24,0.10),0_0_0_1px_rgba(255,255,255,0.85)_inset] ring-1 ring-[rgba(41,34,24,0.08)]";

export const v3FooterSectionClass =
  "border-t border-[rgba(184,148,63,0.12)] first:border-t-0";

export const v3FooterMetricClass =
  "px-4 py-3.5 sm:px-5 border-b border-[rgba(184,148,63,0.10)] sm:border-b-0 sm:border-r last:border-r-0 last:border-b-0";

export const v3SurfaceInsetClass =
  "rounded-lg border border-[rgba(41,34,24,0.07)] bg-[#FBF9F5]/80 px-3 py-2.5 shadow-[0_1px_3px_rgba(41,34,24,0.03)]";
