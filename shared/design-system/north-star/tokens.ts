/**
 * North Star production tokens — frozen from Mission Control Original Refined.
 * Source: shared/components/altair-shell-color-lab-v1/palette-tokens.ts (missionControlRefined)
 * Do not import Color Lab at runtime. No palette switching.
 */

export type NorthStarDashboardTokens = {
  heroMode: "dark" | "light";

  heroShell: string;
  heroAccentRail: string;
  heroHeader: string;
  heroBody: string;
  heroFooter: string;

  eyebrowAccent: string;
  eyebrowLight: string;
  heroTitle: string;
  bodySecondary: string;
  meta: string;
  metaDark: string;
  darkSurfaceText: string;
  darkSurfaceMuted: string;

  primaryAction: string;
  accentCta: string;
  accentBadge: string;
  accentLine: string;
  secondaryAction: string;
  secondaryActionIndex: string;
  insightSurface: string;
  signalChip: string;
  signalLabel: string;
  opsScoreInline: string;
  opsScoreLabel: string;
  opsScoreValue: string;
  opsScoreTrack: string;
  opsScoreFill: string;
  opsScoreDivider: string;
  liveBadge: string;
  primaryActionMetric: string;

  operatingBoard: string;
  boardHeader: string;
  boardTopAccent: string;
  boardTitle: string;
  columnWell: string;
  columnHeader: string;
  columnRail: string;
  row: string;
  workspaceSubheading: string;
  labelMuted: string;
  link: string;
  connectionChip: string;
  connectionArrow: string;
  columnDivider: string;
  officeHover: string;
  soonBadge: string;
  soonBadgeRing: string;
  techAvatarBg: string;
  moneyTrack: string;
  moneyLeadBorder: string;

  lightSurfaceText: string;
  lightSurfaceSecondary: string;
  lightSurfaceMuted: string;
  lightCardLabel: string;
  lightCardMeta: string;
  lightCardValue: string;
  surfaceInset: string;
  intelligenceAccent: string;

  footer: string;
  footerTopAccent: string;
  footerSection: string;
  footerMetric: string;
  footerPanel: string;
  footerDock: string;
  momentumDot: string;
  activityTitle: string;
  activityTime: string;
  metricLabel: string;
  metricDelta: string;

  healthScoreTrack: string;
  healthScoreGradientId: string;
  healthScoreGradientStart: string;
  healthScoreGradientEnd: string;
  healthScoreValue: string;
  systemStatusText: string;
  systemNotificationText: string;
};

/** Mission Control Original Refined — dashboard shell tokens (M2A). */
export const northStarTokens: NorthStarDashboardTokens = {
  heroMode: "dark",

  heroShell:
    "relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#111b2e]/98 via-[#0e1726]/96 to-[#0b1220]/98 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,255,255,0.04)_inset] ring-1 ring-[rgba(198,167,87,0.14)]",
  heroAccentRail:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.42)] to-transparent",
  heroHeader: "border-b border-slate-700/30 px-5 py-4 sm:px-6 sm:py-5",
  heroBody: "px-5 py-4 sm:px-6 sm:py-5",
  heroFooter: "border-t border-slate-700/25 bg-slate-900/20 px-5 py-4 sm:px-6",

  eyebrowAccent: "text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C6A757]",
  eyebrowLight: "text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400",
  heroTitle: "text-xl font-semibold tracking-tight text-white sm:text-2xl",
  bodySecondary: "text-sm text-slate-300",
  meta: "text-xs text-slate-400",
  metaDark: "text-xs text-slate-400",
  darkSurfaceText: "text-sm font-medium text-slate-200",
  darkSurfaceMuted: "text-xs text-slate-400",

  primaryAction:
    "group relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border-l-[3px] border-l-[#B8943F] bg-gradient-to-br from-[#0f1a2e] via-[#0c1525] to-[#0a1220] p-4 text-left shadow-[0_10px_36px_-14px_rgba(0,0,0,0.42)] ring-1 ring-[rgba(198,167,87,0.18)] transition-all hover:border-l-[#C6A757] hover:ring-[rgba(198,167,87,0.30)] sm:flex-row sm:items-center sm:justify-between sm:p-5",
  accentCta:
    "relative inline-flex shrink-0 items-center gap-2 self-start rounded-lg bg-[#B8943F] px-4 py-2.5 text-sm font-semibold text-[#FCFBF8] shadow-[0_2px_10px_rgba(184,148,63,0.28)] transition-all group-hover:bg-[#C6A757] sm:self-center",
  accentBadge:
    "inline-flex items-center rounded-md bg-[rgba(198,167,87,0.18)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E8DDC2] ring-1 ring-[rgba(198,167,87,0.32)]",
  accentLine: "h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.35)] to-transparent",
  secondaryAction:
    "group inline-flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-800/40 px-3 py-2 transition-all hover:border-[rgba(198,167,87,0.28)] hover:bg-slate-800/60",
  secondaryActionIndex:
    "flex h-5 w-5 items-center justify-center rounded-md bg-slate-700/80 text-[10px] font-bold tabular-nums text-[#C6A757]",
  insightSurface:
    "rounded-lg border-l-2 border-l-violet-400/60 bg-slate-800/35 px-4 py-3 ring-1 ring-slate-700/40",
  signalChip:
    "flex flex-col gap-0.5 rounded-lg border border-slate-600/40 bg-slate-800/35 px-3 py-2",
  signalLabel: "text-[10px] leading-tight text-slate-400",
  opsScoreInline:
    "inline-flex items-center gap-2 rounded-lg border border-[rgba(198,167,87,0.22)] bg-slate-800/40 px-3 py-1.5",
  opsScoreLabel: "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#C6A757]",
  opsScoreValue: "text-lg font-semibold tabular-nums text-white",
  opsScoreTrack: "h-1.5 w-16 overflow-hidden rounded-full bg-slate-700/80",
  opsScoreFill: "h-full rounded-full bg-gradient-to-r from-[#C6A757] to-[#8B7232]",
  opsScoreDivider: "h-4 w-px bg-[rgba(198,167,87,0.28)]",
  liveBadge:
    "inline-flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-950/35 px-2 py-0.5 text-[10px] font-medium text-emerald-300",
  primaryActionMetric: "mt-1.5 text-base font-medium tabular-nums text-[#E8DDC2]",

  operatingBoard:
    "relative overflow-hidden rounded-[1.5rem] bg-gradient-to-b from-[#1a2538] via-[#172232] to-[#152030] shadow-[0_14px_48px_-14px_rgba(0,0,0,0.38),0_0_0_1px_rgba(255,255,255,0.06)_inset] ring-1 ring-[rgba(148,163,184,0.22)]",
  boardHeader: "border-b border-white/[0.08] bg-[#141e2e]/80 px-5 py-4 sm:px-6 sm:py-5",
  boardTopAccent:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.38)] to-transparent",
  boardTitle: "text-lg font-semibold text-slate-100 sm:text-xl",
  columnWell: "bg-[rgba(12,20,34,0.38)]",
  columnHeader:
    "rounded-lg border border-white/[0.12] bg-[#FAF9F6] px-3.5 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.20)]",
  columnRail:
    "pointer-events-none absolute right-0 top-5 bottom-5 hidden w-px bg-gradient-to-b from-transparent via-[rgba(198,167,87,0.24)] to-transparent lg:block",
  row: "flex items-center gap-3 rounded-lg border border-slate-200/90 bg-[#FCFBF8] px-3.5 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.14)] transition-all hover:border-[rgba(198,167,87,0.32)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.18)]",
  workspaceSubheading: "text-base font-semibold text-slate-900",
  labelMuted: "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500",
  link: "text-xs font-medium text-[#8B7232] transition-colors hover:text-[#6B5A2E]",
  connectionChip:
    "inline-flex items-center gap-1.5 rounded-md border border-white/[0.10] bg-[#FAF9F6]/95 px-2.5 py-1.5 text-[10px] font-medium text-slate-700 shadow-[0_1px_4px_rgba(0,0,0,0.12)]",
  connectionArrow: "h-3 w-3 text-[#8B7232]",
  columnDivider: "border-white/[0.08]",
  officeHover: "hover:bg-white/[0.06]",
  soonBadge: "bg-slate-100 text-slate-700",
  soonBadgeRing: "ring-slate-200",
  techAvatarBg: "bg-slate-200",
  moneyTrack: "bg-slate-200",
  moneyLeadBorder: "border-l-[#B8943F]",

  lightSurfaceText: "text-sm font-medium text-slate-950",
  lightSurfaceSecondary: "text-sm text-slate-700",
  lightSurfaceMuted: "text-xs text-slate-600",
  lightCardLabel: "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500",
  lightCardMeta: "text-[10px] text-slate-600",
  lightCardValue: "text-sm font-semibold text-slate-950",
  surfaceInset:
    "rounded-lg border border-slate-200/85 bg-[#FAF9F6] px-3 py-2.5 shadow-[0_2px_6px_rgba(0,0,0,0.10)]",
  intelligenceAccent: "text-[#C6A757]",

  footer:
    "relative overflow-hidden rounded-[1.25rem] bg-gradient-to-b from-[#243448] via-[#1f2d40] to-[#1a2838] shadow-[0_10px_36px_-12px_rgba(0,0,0,0.32),0_0_0_1px_rgba(255,255,255,0.05)_inset] ring-1 ring-[rgba(148,163,184,0.20)]",
  footerTopAccent:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.30)] to-transparent",
  footerSection: "border-t border-white/[0.08] first:border-t-0",
  footerMetric:
    "mx-2 my-2 rounded-lg border border-white/[0.10] bg-[#FAF9F6]/95 px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.14)] sm:mx-3 sm:my-3 sm:px-5",
  footerPanel:
    "rounded-lg border border-white/[0.10] bg-[#FAF9F6]/95 shadow-[0_2px_8px_rgba(0,0,0,0.14)]",
  footerDock: "m-3 sm:m-4 lg:ml-0 lg:mr-4 lg:mb-4",
  momentumDot: "mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#B8943F]",
  activityTitle: "min-w-0 flex-1 text-xs font-medium text-slate-950",
  activityTime: "shrink-0 text-[10px] tabular-nums text-slate-600",
  metricLabel: "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500",
  metricDelta: "text-[11px] text-slate-600",

  healthScoreTrack: "rgba(198,167,87,0.22)",
  healthScoreGradientId: "ns-health-score",
  healthScoreGradientStart: "#059669",
  healthScoreGradientEnd: "#047857",
  healthScoreValue: "text-[11px] font-bold tabular-nums text-emerald-800",
  systemStatusText: "inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700",
  systemNotificationText: "inline-flex items-center gap-1 text-[11px] text-slate-600",
};
