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
    "relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#2E261C]/98 via-[#261F17]/96 to-[#201A13]/98 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.48),0_0_0_1px_rgba(255,255,255,0.04)_inset] ring-1 ring-[rgba(198,167,87,0.14)]",
  heroAccentRail:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.42)] to-transparent",
  heroHeader: "border-b border-slate-700/30 px-4 py-3.5 sm:px-6 sm:py-5",
  heroBody: "px-4 py-3.5 sm:px-6 sm:py-5",
  heroFooter: "border-t border-slate-700/25 bg-slate-900/20 px-4 py-2 sm:px-6",

  eyebrowAccent: "text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C6A757]",
  eyebrowLight:
    "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D7CDBD]",
  heroTitle: "text-xl font-semibold tracking-tight text-[#FFF8E8] sm:text-2xl",
  bodySecondary: "text-sm text-[#D7CDBD]",
  meta: "text-xs text-[#B8AD9E]",
  metaDark: "text-xs text-[#B8AD9E]",
  darkSurfaceText: "text-sm font-medium text-[#F8F1E7]",
  darkSurfaceMuted: "text-xs text-[#B8AD9E]",

  primaryAction:
    "group relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border-l-[3px] border-l-[#B8943F] bg-gradient-to-br from-[#2E261C] via-[#251F17] to-[#201A13] p-3.5 text-left shadow-[0_10px_36px_-14px_rgba(0,0,0,0.42)] ring-1 ring-[rgba(198,167,87,0.18)] transition-all hover:border-l-[#C6A757] hover:ring-[rgba(198,167,87,0.30)] sm:flex-row sm:items-center sm:justify-between sm:p-5",
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
  signalLabel: "text-[10px] leading-tight text-[#B8AD9E]",
  opsScoreInline:
    "inline-flex items-center gap-2 rounded-lg border border-[rgba(198,167,87,0.22)] bg-slate-800/40 px-3 py-1.5",
  opsScoreLabel: "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#C6A757]",
  opsScoreValue: "text-lg font-semibold tabular-nums text-[#FFF8E8]",
  opsScoreTrack: "h-1.5 w-16 overflow-hidden rounded-full bg-slate-700/80",
  opsScoreFill: "h-full rounded-full bg-gradient-to-r from-[#C6A757] to-[#8B7232]",
  opsScoreDivider: "h-4 w-px bg-[rgba(198,167,87,0.28)]",
  liveBadge:
    "inline-flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-950/35 px-2 py-0.5 text-[10px] font-medium text-emerald-300",
  primaryActionMetric: "mt-1.5 text-base font-medium tabular-nums text-[#E8DDC2]",

  operatingBoard:
    "relative overflow-hidden rounded-[1.5rem] bg-gradient-to-b from-[#382E22] via-[#32291E] to-[#30281D] shadow-[0_14px_48px_-14px_rgba(0,0,0,0.38),0_0_0_1px_rgba(255,255,255,0.06)_inset] ring-1 ring-[rgba(148,163,184,0.22)]",
  boardHeader: "border-b border-white/[0.08] bg-[#2E261C]/80 px-5 py-4 sm:px-6 sm:py-5",
  boardTopAccent:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(198,167,87,0.38)] to-transparent",
  boardTitle: "text-lg font-semibold text-[#FFF8E8] sm:text-xl",
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
    "relative overflow-hidden rounded-[1.25rem] bg-gradient-to-b from-[#483B2C] via-[#403527] to-[#382E22] shadow-[0_10px_36px_-12px_rgba(0,0,0,0.32),0_0_0_1px_rgba(255,255,255,0.05)_inset] ring-1 ring-[rgba(148,163,184,0.20)]",
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

/**
 * Customers list page — Mission Control Original Refined (M3A).
 * Moon graphite frame: lift #403527 · base #292219 · deep #211B14 · silver edge #AEB6C2
 * Royal brass actions: champagne #E6D092 · royal #C9A44D · command #B88A2E
 * Light surfaces: moonstone #F3E8D1 / band #ECE1CB / row #FFFFFF · text #101827 / #4B5563 / #64748B
 * Dark header text: warm ivory #F3EBDD · lunar muted #C8D0DA
 */
export type NorthStarListPageTokens = {
  pageCanvas: string;
  pageHeader: string;
  pageHeaderTitle: string;
  pageHeaderSubtitle: string;
  pageHeaderEyebrow: string;
  listSurface: string;
  listSurfaceTopAccent: string;
  primaryAction: string;
  secondaryAction: string;
  viewTabsBand: string;
  viewTabsControl: string;
  viewTabsItem: string;
  viewTabsItemActive: string;
  viewTabsCount: string;
  viewTabsCountActive: string;
  filterBar: string;
  searchInput: string;
  filterSelect: string;
  filterIcon: string;
  filterMeta: string;
  tableHeaderRow: string;
  tableHeaderCell: string;
  tableRow: string;
  tableRowHover: string;
  tableRowSelected: string;
  tableCheckbox: string;
  tableAvatar: string;
  tablePrimaryText: string;
  tableSecondaryText: string;
  tableMutedText: string;
  tableMetricText: string;
  tableDateText: string;
  badgeDeleted: string;
  badgeArchived: string;
  bulkBar: string;
  bulkBarTitle: string;
  bulkClearButton: string;
  bulkPrimaryAction: string;
  bulkSecondaryAction: string;
  bulkDestructiveAction: string;
  emptyState: string;
  emptyStateAction: string;
};

export const northStarListTokens: NorthStarListPageTokens = {
  pageCanvas: "north-star-list-page-canvas",
  pageHeader:
    "items-start px-3 py-2 sm:items-center sm:px-3.5 lg:px-5 lg:py-4 lg:mb-3",
  pageHeaderEyebrow:
    "text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D6BE78]",
  pageHeaderTitle:
    "min-w-0 text-base font-bold tracking-tight text-[#FFF9EA] sm:shrink-0 sm:text-lg lg:font-semibold lg:text-xl",
  pageHeaderSubtitle:
    "min-w-0 text-xs leading-snug text-[#C8D0DA] sm:truncate",
  listSurface:
    "relative lg:rounded-[1.25rem] lg:ring-1 lg:ring-[rgba(100,116,139,0.18)]",
  listSurfaceTopAccent:
    "pointer-events-none absolute inset-x-0 top-0 hidden h-px bg-gradient-to-r from-transparent via-[rgba(148,163,184,0.28)] to-transparent lg:block",
  primaryAction:
    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[#E6D092] bg-gradient-to-b from-[#E6D092] from-0% via-[#C9A44D] via-[45%] to-[#B88A2E] to-100% px-3.5 py-1.5 text-sm font-semibold text-[#17130E] shadow-[0_2px_10px_rgba(138,99,36,0.28)] transition-all hover:-translate-y-px hover:from-[#F0E4B8] hover:via-[#D4B05A] hover:to-[#9A7028] hover:shadow-[0_4px_16px_rgba(138,99,36,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,164,77,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#292219] md:h-9 md:min-h-9 [&_svg]:text-[#17130E]",
  secondaryAction:
    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[#D6BE78] bg-[#FFF9EA] px-3 py-1.5 text-sm font-semibold text-[#17130E] shadow-[0_1px_4px_rgba(138,99,36,0.16)] transition-colors hover:border-[#E6D092] hover:bg-[#F3EBDD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,164,77,0.40)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#292219] md:h-9 md:min-h-9 [&_svg]:text-[#8A6324]",
  viewTabsBand:
    "shrink-0 border-b border-[rgba(100,116,139,0.18)] bg-[#ECE1CB] px-3 py-2 sm:px-4 lg:px-5",
  viewTabsControl:
    "job-north-star-view-tabs flex w-full gap-0.5 rounded-lg border border-[rgba(148,163,184,0.24)] bg-[#EADFC9] p-0.5 sm:w-auto",
  viewTabsItem:
    "min-h-9 flex-1 rounded-md px-2.5 py-1.5 text-sm font-semibold text-[#4B5563] transition-colors hover:text-[#101827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,164,77,0.35)] sm:flex-none sm:px-3",
  viewTabsItemActive:
    "bg-[#FFFFFF] text-[#101827] shadow-[0_1px_4px_rgba(16,24,39,0.10)] ring-1 ring-[rgba(148,163,184,0.24)]",
  viewTabsCount: "ml-1.5 text-xs font-medium text-[#6B7280]",
  viewTabsCountActive: "ml-1.5 text-xs font-medium text-[#4B5563]",
  filterBar:
    "shrink-0 border-b border-[rgba(100,116,139,0.18)] bg-[#ECE1CB] px-3 py-2.5 sm:px-4 lg:px-5 lg:py-3",
  searchInput:
    "h-11 w-full min-h-11 rounded-lg border border-[rgba(148,163,184,0.24)] bg-[#FFFFFF] py-1.5 pl-9 pr-3 text-sm text-[#101827] placeholder:text-[#6B7280] outline-none transition-colors focus:border-[#B88A2E] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[rgba(201,164,77,0.22)] md:h-9 md:min-h-9",
  filterSelect:
    "h-11 w-full min-h-11 appearance-none rounded-lg border border-[rgba(148,163,184,0.24)] bg-[#FFFFFF] py-1.5 pl-9 pr-8 text-sm font-medium text-[#101827] outline-none transition-colors focus:border-[#B88A2E] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[rgba(201,164,77,0.22)] sm:w-auto sm:pr-10 md:h-9 md:min-h-9",
  filterIcon: "text-[#8A6324]",
  filterMeta: "mt-1.5 text-[11px] text-[#64748B] sm:text-xs",
  tableHeaderRow:
    "border-b border-[rgba(100,116,139,0.18)] bg-[#ECE1CB] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4B5563]",
  tableHeaderCell:
    "admin-table-cell text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4F4638]",
  tableRow:
    "cursor-pointer border-b border-[rgba(100,116,139,0.18)] bg-[#FFFFFF] transition-colors hover:bg-[#F8EDD5]",
  tableRowHover: "hover:bg-[#F8EDD5]",
  tableRowSelected:
    "bg-[rgba(201,164,77,0.12)] shadow-[inset_3px_0_0_0_#C9A44D] ring-1 ring-inset ring-[rgba(201,164,77,0.22)]",
  tableCheckbox:
    "h-4 w-4 rounded border-[rgba(138,99,36,0.35)] text-[#8A6324] focus:ring-[rgba(201,164,77,0.35)] disabled:cursor-not-allowed disabled:opacity-40",
  tableAvatar:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E6D092] to-[#D4C4A0] text-xs font-bold text-[#4F4638] ring-1 ring-[rgba(138,99,36,0.16)] shadow-[0_1px_3px_rgba(138,99,36,0.12)]",
  tablePrimaryText: "truncate font-semibold text-[#17130E]",
  tableSecondaryText: "font-medium text-[#4F4638]",
  tableMutedText: "truncate text-xs text-[#64748B]",
  tableMetricText: "font-semibold tabular-nums text-[#17130E]",
  tableDateText: "font-medium text-[#4F4638]",
  badgeDeleted:
    "inline-flex shrink-0 rounded-full bg-[rgba(138,99,36,0.10)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8A6324] ring-1 ring-[rgba(138,99,36,0.18)]",
  badgeArchived:
    "inline-flex shrink-0 rounded-full bg-[#F1E7D2] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#4F4638] ring-1 ring-[rgba(138,99,36,0.12)]",
  bulkBar:
    "sticky bottom-0 z-20 border-t border-[rgba(138,99,36,0.12)] bg-[#EFE4CB] px-3 py-3 shadow-[0_-8px_24px_-12px_rgba(3,7,12,0.18)] sm:px-4 lg:bg-[#FBF7EF] lg:px-5",
  bulkBarTitle: "text-sm font-bold text-[#17130E]",
  bulkClearButton:
    "inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[rgba(138,99,36,0.22)] bg-[#FFF9EA] px-3 py-1.5 text-xs font-semibold text-[#4F4638] transition-colors hover:border-[#C9A44D] hover:bg-[#F3EBDD] disabled:cursor-not-allowed disabled:opacity-60 md:min-h-9",
  bulkPrimaryAction:
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[#E6D092] bg-gradient-to-b from-[#E6D092] from-0% via-[#C9A44D] via-[45%] to-[#B88A2E] to-100% px-3 py-2 text-xs font-semibold text-[#17130E] transition-all hover:from-[#F0E4B8] hover:via-[#D4B05A] hover:to-[#9A7028] disabled:cursor-not-allowed disabled:opacity-60 md:min-h-10",
  bulkSecondaryAction:
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[rgba(138,99,36,0.22)] bg-[#FFF9EA] px-3 py-2 text-xs font-semibold text-[#4F4638] transition-colors hover:border-[#C9A44D] hover:bg-[#F3EBDD] disabled:cursor-not-allowed disabled:opacity-60 md:min-h-10",
  bulkDestructiveAction:
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[rgba(185,28,28,0.35)] bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#991B1B] transition-colors hover:border-[rgba(185,28,28,0.5)] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60 md:min-h-10",
  emptyState:
    "rounded-xl border border-[rgba(100,116,139,0.18)] bg-[#FFFFFF] px-6 py-8 shadow-[0_4px_16px_rgba(3,7,12,0.08)]",
  emptyStateAction:
    "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#E6D092] bg-gradient-to-b from-[#E6D092] from-0% via-[#C9A44D] via-[45%] to-[#B88A2E] to-100% px-4 py-2.5 text-sm font-semibold text-[#17130E] shadow-[0_2px_10px_rgba(138,99,36,0.28)] transition-all hover:-translate-y-px hover:from-[#F0E4B8] hover:via-[#D4B05A] hover:to-[#9A7028] hover:shadow-[0_4px_16px_rgba(138,99,36,0.32)] sm:w-auto sm:min-w-[9rem]",
};

/**
 * Customer 360 detail page — Mission Control Original Refined (M3B).
 * Premium dark hero on moon graphite frame; ivory section cards below.
 */
export type NorthStarDetailPageTokens = {
  pageCanvas: string;
  backLink: string;
  heroShell: string;
  heroAccentRail: string;
  heroEyebrow: string;
  heroTitle: string;
  heroCompany: string;
  heroMeta: string;
  heroMetaIcon: string;
  heroAvatar: string;
  heroStatLabel: string;
  heroStatValue: string;
  heroLink: string;
  sectionSurface: string;
  sectionTitle: string;
  sectionSubtitle: string;
  sectionIconWrap: string;
  sectionNav: string;
  sectionNavLink: string;
  primaryAction: string;
  secondaryAction: string;
  tertiaryAction: string;
  metaStrip: string;
  metaRow: string;
  metaIcon: string;
  tagChip: string;
  link: string;
  emptyState: string;
  listRowHover: string;
  listDivider: string;
  notesDetails: string;
  notesSummary: string;
  notesBody: string;
  innerCard: string;
  innerCardHover: string;
  metricCard: string;
  metricCardHighlight: string;
  metricLabel: string;
  metricValue: string;
  metricIcon: string;
  opportunityLink: string;
  photoCard: string;
  photoCardHover: string;
  bannerDeleted: string;
  bannerArchived: string;
  commandPlate: string;
  workspaceGrid: string;
  workspaceMain: string;
  workspaceSide: string;
  ivoryMetaRow: string;
  ivoryTagChip: string;
  ivoryCardPrimary: string;
  ivoryCardSecondary: string;
  ivoryCardMuted: string;
  compactSectionSurface: string;
  truncatedHint: string;
};

export const northStarDetailTokens: NorthStarDetailPageTokens = {
  pageCanvas: "north-star-detail-page-canvas",
  backLink:
    "inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-[#C8D0DA] transition-colors hover:text-[#FFF9EA]",
  heroShell: "north-star-detail-hero relative overflow-hidden rounded-[1.25rem] p-4 sm:p-5",
  heroAccentRail:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(214,190,120,0.42)] to-transparent",
  heroEyebrow:
    "text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D6BE78]",
  heroTitle: "truncate text-xl font-bold tracking-tight text-[#FFF9EA] sm:text-2xl",
  heroCompany: "mt-0.5 truncate text-sm text-[#C8D0DA]",
  heroMeta: "text-sm text-[#C8D0DA]",
  heroMetaIcon: "h-4 w-4 shrink-0 text-[#8A6324]",
  heroAvatar:
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E6D092] to-[#B88A2E] text-sm font-bold text-[#17130E] ring-2 ring-[rgba(201,164,77,0.35)] shadow-[0_2px_8px_rgba(138,99,36,0.24)]",
  heroStatLabel: "text-[10px] font-semibold uppercase tracking-[0.12em] text-[#C8D0DA]",
  heroStatValue: "mt-0.5 text-lg font-bold tabular-nums text-[#FFF9EA]",
  heroLink:
    "text-xs font-semibold text-[#D6BE78] transition-colors hover:text-[#E6D092]",
  sectionSurface:
    "north-star-detail-section scroll-mt-6 rounded-[1.25rem] p-3.5 sm:p-4",
  sectionTitle: "text-sm font-bold text-[#17130E]",
  sectionSubtitle: "text-[11px] text-[#4F4638]",
  sectionIconWrap:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)] [&_svg]:text-[#8A6324]",
  sectionNav:
    "-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 north-star-detail-section-nav",
  sectionNavLink:
    "inline-flex min-h-9 shrink-0 items-center rounded-lg px-2.5 text-xs font-semibold text-[#4F4638] transition-colors hover:bg-[rgba(201,164,77,0.10)] hover:text-[#17130E]",
  primaryAction:
    "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#E6D092] bg-gradient-to-b from-[#E6D092] from-0% via-[#C9A44D] via-[45%] to-[#B88A2E] to-100% px-2.5 text-xs font-semibold text-[#17130E] shadow-[0_2px_10px_rgba(138,99,36,0.28)] transition-all hover:-translate-y-px hover:from-[#F0E4B8] hover:via-[#D4B05A] hover:to-[#9A7028] [&_svg]:text-[#17130E]",
  secondaryAction:
    "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(138,99,36,0.22)] bg-[#FFF9EA] px-2.5 text-xs font-semibold text-[#4F4638] transition-colors hover:border-[#C9A44D] hover:bg-[#F3EBDD] [&_svg]:text-[#8A6324]",
  tertiaryAction:
    "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(174,182,194,0.22)] bg-[rgba(39,49,64,0.35)] px-2.5 text-xs font-semibold text-[#F3EBDD] transition-colors hover:border-[rgba(201,164,77,0.28)] hover:bg-[rgba(39,49,64,0.55)] [&_svg]:text-[#D6BE78]",
  metaStrip:
    "mt-3 rounded-lg border border-[rgba(201,164,77,0.14)] bg-[rgba(15,23,42,0.28)] px-3 py-2.5",
  metaRow: "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#C8D0DA]",
  metaIcon: "h-3.5 w-3.5 shrink-0 text-[#8A6324]",
  tagChip:
    "inline-flex items-center gap-0.5 rounded-full bg-[rgba(201,164,77,0.12)] px-2 py-0.5 text-[11px] font-medium text-[#F3EBDD] ring-1 ring-[rgba(201,164,77,0.22)]",
  link: "text-xs font-semibold text-[#8A6324] transition-colors hover:text-[#6B5A2E]",
  emptyState:
    "rounded-xl border border-dashed border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-4 py-8 text-center",
  listRowHover:
    "rounded-lg transition-colors hover:bg-[rgba(201,164,77,0.08)] -mx-2 px-2 py-1",
  listDivider: "divide-[rgba(138,99,36,0.12)]",
  notesDetails:
    "group overflow-hidden rounded-[1.25rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF]",
  notesSummary:
    "flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-semibold text-[#4F4638] marker:content-none [&::-webkit-details-marker]:hidden",
  notesBody: "border-t border-[rgba(138,99,36,0.12)] px-3.5 py-2.5",
  innerCard:
    "rounded-lg border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] px-2.5 py-2",
  innerCardHover:
    "rounded-md border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] px-2 py-1.5 transition-colors hover:border-[rgba(201,164,77,0.28)]",
  metricCard:
    "rounded-lg border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] px-2.5 py-2",
  metricCardHighlight:
    "rounded-lg border border-[rgba(245,158,11,0.35)] bg-[rgba(254,243,199,0.55)] px-2.5 py-2",
  metricLabel:
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4F4638]",
  metricValue: "mt-0.5 text-sm font-bold tabular-nums text-[#17130E]",
  metricIcon: "h-3.5 w-3.5 shrink-0 text-[#8A6324]",
  opportunityLink:
    "inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-[#8A6324]",
  photoCard:
    "w-36 shrink-0 overflow-hidden rounded-xl border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA]",
  photoCardHover:
    "transition-colors hover:border-[rgba(201,164,77,0.35)]",
  bannerDeleted:
    "mb-2 rounded-lg border border-[rgba(251,146,60,0.35)] bg-[rgba(254,243,199,0.45)] px-3 py-2 text-sm text-[#9A3412]",
  bannerArchived:
    "mb-2 rounded-lg border border-[rgba(245,158,11,0.30)] bg-[rgba(254,243,199,0.40)] px-3 py-2 text-sm text-[#92400E]",
  commandPlate:
    "flex flex-col gap-2 rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-3",
  workspaceGrid:
    "grid gap-2.5 lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.95fr)] lg:items-start",
  workspaceMain: "flex min-w-0 flex-col gap-2.5",
  workspaceSide: "flex min-w-0 flex-col gap-2.5",
  ivoryMetaRow:
    "flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#4F4638]",
  ivoryTagChip:
    "inline-flex items-center gap-0.5 rounded-full bg-[#EFE4CB] px-2 py-0.5 text-[11px] font-medium text-[#4F4638] ring-1 ring-[rgba(138,99,36,0.12)]",
  ivoryCardPrimary: "text-sm font-semibold text-[#17130E]",
  ivoryCardSecondary: "text-xs text-[#4F4638]",
  ivoryCardMuted: "text-xs text-[#64748B]",
  compactSectionSurface:
    "north-star-detail-section scroll-mt-6 rounded-[1rem] p-3",
  truncatedHint: "mt-2 text-xs font-medium text-[#64748B]",
};

/**
 * Estimate detail / quote document — Mission Control Original Refined (M5C).
 * Premium quote document on ivory surface inside moon graphite frame.
 */
export type NorthStarEstimateDocumentTokens = {
  documentSurface: string;
  documentSectionLabel: string;
  documentCustomerCard: string;
  documentLineItemsTable: string;
  documentTotalsSurface: string;
  documentTotalLabel: string;
  documentTotalValue: string;
  ivoryPrimary: string;
  ivorySecondary: string;
  ivoryMuted: string;
  ivoryLink: string;
  darkPrimary: string;
  darkSecondary: string;
  darkMuted: string;
  darkLink: string;
  overlayBodyCanvas: string;
  overlayHeader: string;
  overlayHeaderTitle: string;
  overlayHeaderSubtitle: string;
  overlayCloseButton: string;
  overlayPanel: string;
};

/**
 * Invoice detail / billing document — Mission Control Original Refined (M5D).
 * Same ivory document + graphite frame language as estimates; invoice-specific surface class.
 */
export type NorthStarInvoiceDocumentTokens = NorthStarEstimateDocumentTokens;

export const northStarInvoiceDocumentTokens: NorthStarInvoiceDocumentTokens = {
  documentSurface:
    "invoice-north-star-document relative flex min-h-[960px] flex-col overflow-x-hidden rounded-[1.25rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] p-3 shadow-[0_10px_40px_-14px_rgba(3,7,12,0.28)] sm:rounded-[1.25rem] sm:p-4 print:min-h-0 print:rounded-none print:border print:border-slate-400 print:bg-white print:p-0 print:shadow-none",
  documentSectionLabel:
    "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4F4638] print:text-slate-600",
  documentCustomerCard:
    "rounded-lg border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] px-3 py-2 ring-1 ring-[rgba(138,99,36,0.08)] sm:rounded-xl sm:px-4 sm:py-3 print:rounded-none print:border-0 print:bg-white print:px-0 print:py-0 print:ring-0",
  documentLineItemsTable: "invoice-north-star-line-items",
  documentTotalsSurface:
    "rounded-lg border border-[rgba(138,99,36,0.14)] bg-[#FFF9EA] px-3 py-3 sm:rounded-xl sm:px-5 sm:py-4 md:px-6 md:py-5 print:break-inside-avoid print:rounded-none print:border-slate-300 print:bg-white",
  documentTotalLabel:
    "text-right text-sm font-bold uppercase tracking-[0.08em] text-[#4F4638] print:text-slate-900",
  documentTotalValue:
    "text-2xl font-bold tabular-nums text-[#17130E] sm:text-3xl print:text-2xl print:text-slate-900",
  ivoryPrimary: "text-[#17130E]",
  ivorySecondary: "text-[#4F4638]",
  ivoryMuted: "text-[#64748B]",
  ivoryLink: "text-[#9A7028] transition-colors hover:text-[#8A6324]",
  darkPrimary: "text-[#FFF8E8]",
  darkSecondary: "text-[#D7CDBD]",
  darkMuted: "text-[#B8AD9E]",
  darkLink: "text-[#D6BE78] transition-colors hover:text-[#E6D092]",
  overlayBodyCanvas:
    "north-star-invoice-overlay-body bg-[#292219] print:bg-white",
  overlayHeader:
    "no-print overlay-header-safe-mobile flex shrink-0 items-start gap-2 border-b border-[rgba(201,164,77,0.14)] bg-gradient-to-b from-[#403527] to-[#292219] px-3 py-2.5 sm:px-4 sm:py-3 lg:pt-3",
  overlayHeaderTitle: "break-words text-base font-bold text-[#FFF8E8] sm:text-lg",
  overlayHeaderSubtitle: "mt-0.5 text-sm text-[#D7CDBD]",
  overlayCloseButton:
    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(174,182,194,0.22)] bg-[rgba(39,49,64,0.35)] px-2 text-sm font-semibold text-[#F3EBDD] transition-colors hover:border-[rgba(201,164,77,0.28)] hover:bg-[rgba(39,49,64,0.55)] disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:text-[#D6BE78]",
  overlayPanel:
    "relative z-10 flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-[#292219] lg:mx-auto lg:max-w-6xl lg:shadow-[0_22px_60px_rgba(3,7,12,0.42)] lg:ring-1 lg:ring-[rgba(174,182,194,0.18)] print:bg-white print:shadow-none print:ring-0",
};

export const northStarEstimateDocumentTokens: NorthStarEstimateDocumentTokens = {
  documentSurface:
    "estimate-north-star-document relative flex min-h-[960px] flex-col overflow-x-hidden rounded-[1.25rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] p-3 shadow-[0_10px_40px_-14px_rgba(3,7,12,0.28)] sm:rounded-[1.25rem] sm:p-4 print:min-h-0 print:rounded-none print:border print:border-slate-400 print:bg-white print:p-0 print:shadow-none",
  documentSectionLabel:
    "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4F4638] print:text-slate-600",
  documentCustomerCard:
    "rounded-lg border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] px-3 py-2 ring-1 ring-[rgba(138,99,36,0.08)] sm:rounded-xl sm:px-4 sm:py-3 print:rounded-none print:border-0 print:bg-white print:px-0 print:py-0 print:ring-0",
  documentLineItemsTable: "estimate-north-star-line-items",
  documentTotalsSurface:
    "rounded-lg border border-[rgba(138,99,36,0.14)] bg-[#FFF9EA] px-3 py-3 sm:rounded-xl sm:px-5 sm:py-4 md:px-6 md:py-5 print:break-inside-avoid print:rounded-none print:border-slate-300 print:bg-white",
  documentTotalLabel:
    "text-right text-sm font-bold uppercase tracking-[0.08em] text-[#4F4638] print:text-slate-900",
  documentTotalValue:
    "text-2xl font-bold tabular-nums text-[#17130E] sm:text-3xl print:text-2xl print:text-slate-900",
  ivoryPrimary: "text-[#17130E]",
  ivorySecondary: "text-[#4F4638]",
  ivoryMuted: "text-[#64748B]",
  ivoryLink:
    "text-[#9A7028] transition-colors hover:text-[#8A6324]",
  darkPrimary: "text-[#FFF8E8]",
  darkSecondary: "text-[#D7CDBD]",
  darkMuted: "text-[#B8AD9E]",
  darkLink: "text-[#D6BE78] transition-colors hover:text-[#E6D092]",
  overlayBodyCanvas:
    "north-star-estimate-overlay-body bg-[#292219] print:bg-white",
  overlayHeader:
    "no-print overlay-header-safe-mobile flex shrink-0 items-start gap-2 border-b border-[rgba(201,164,77,0.14)] bg-gradient-to-b from-[#403527] to-[#292219] px-3 py-2.5 sm:px-4 sm:py-3 lg:pt-3",
  overlayHeaderTitle: "break-words text-base font-bold text-[#FFF8E8] sm:text-lg",
  overlayHeaderSubtitle: "mt-0.5 text-sm text-[#D7CDBD]",
  overlayCloseButton:
    "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(174,182,194,0.22)] bg-[rgba(39,49,64,0.35)] px-2 text-sm font-semibold text-[#F3EBDD] transition-colors hover:border-[rgba(201,164,77,0.28)] hover:bg-[rgba(39,49,64,0.55)] disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:text-[#D6BE78]",
  overlayPanel:
    "relative z-10 flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-[#292219] lg:mx-auto lg:max-w-6xl lg:shadow-[0_22px_60px_rgba(3,7,12,0.42)] lg:ring-1 lg:ring-[rgba(174,182,194,0.18)] print:bg-white print:shadow-none print:ring-0",
};

/**
 * Dispatch command shell — Mission Control Original Refined (M15B).
 * Graphite command header, dark elevated lanes/cards, brass accents.
 */
export type NorthStarDispatchTokens = {
  sectionButton: string;
  sectionButtonActive: string;
  sectionButtonEmphasized: string;
  sectionButtonBadge: string;
  sectionButtonBadgeActive: string;
  focusBanner: string;
  focusBannerIcon: string;
  focusBannerTitle: string;
  focusBannerDescription: string;
  focusBannerClear: string;
  statPill: string;
  statPillUnassigned: string;
  boardSurface: string;
  boardSurfaceTopAccent: string;
  boardHeader: string;
  boardHeaderTitle: string;
  boardHeaderSubtitle: string;
  boardBody: string;
  boardUnassignedButton: string;
  boardUnassignedBadge: string;
  boardEmphasisRing: string;
  filterBar: string;
  filterBarCompact: string;
  unassignedFilterButton: string;
  unassignedFilterBadge: string;
  lane: string;
  laneHeader: string;
  laneHeaderAvatar: string;
  laneHeaderName: string;
  laneHeaderRole: string;
  laneHeaderStatusLabel: string;
  laneHeaderNextJob: string;
  laneHeaderCount: string;
  laneJobWell: string;
  laneEmptyWell: string;
  laneEmptyText: string;
  laneToggleButton: string;
  laneToggleButtonDashed: string;
  unassignedLane: string;
  unassignedLaneEmphasis: string;
  unassignedLaneHeader: string;
  unassignedLaneIcon: string;
  unassignedLaneTitle: string;
  unassignedLaneSubtitle: string;
  unassignedLaneCount: string;
  unassignedJobWell: string;
  unassignedEmptyWell: string;
  jobCard: string;
  jobCardCompact: string;
  jobCardSelected: string;
  jobCardAssigning: string;
  jobCardJobNumber: string;
  jobCardCustomer: string;
  jobCardService: string;
  jobCardMeta: string;
  jobCardMetaIcon: string;
  jobCardMetaTime: string;
  jobCardFooter: string;
  jobCardLoader: string;
  emptyState: string;
  emptyStateIcon: string;
  emptyStateTitle: string;
  emptyStateDescription: string;
  detailPanelShell: string;
  detailPanelTopAccent: string;
  detailPanelHeader: string;
  detailPanelTitle: string;
  detailPanelSubtitle: string;
  detailPanelCustomerLink: string;
  detailPanelCloseButton: string;
  detailPanelBody: string;
  detailSectionLabel: string;
  detailIdentityCard: string;
  detailIdentityService: string;
  detailIdentityMeta: string;
  detailSiteContextCard: string;
  detailSiteContextIconWrap: string;
  detailSiteContextAddress: string;
  detailSectionDivider: string;
  detailAssignmentCard: string;
  detailTechAvatar: string;
  detailTechName: string;
  detailTechRole: string;
  detailTechPhone: string;
  detailUnassignedBanner: string;
  detailEstimateHint: string;
  detailSelect: string;
  detailPrimaryButton: string;
  detailSecondaryButton: string;
  detailMutedText: string;
  detailBodyText: string;
  detailFooterLink: string;
  detailFooterDivider: string;
  detailPermissionNote: string;
  detailPendingNote: string;
  pageCanvas: string;
  sectionSheetPanel: string;
  sectionSheetHeader: string;
  sectionSheetHeaderIcon: string;
  sectionSheetBody: string;
  detailMobileSheetPanel: string;
  unassignedSheetPanel: string;
  unassignedSheetHeader: string;
  unassignedSheetHeaderIcon: string;
  unassignedSheetBadge: string;
  unassignedSheetEmpty: string;
  summaryMetricCard: string;
  summaryMetricCardHighlight: string;
  summaryMetricCardInteractive: string;
  summaryMetricLabel: string;
  summaryMetricValue: string;
  summaryMetricDescription: string;
  summaryMetricIcon: string;
  workloadCard: string;
  workloadCardActive: string;
  workloadCardOverloaded: string;
  workloadCardInteractive: string;
  workloadEmptyState: string;
};

export const northStarDispatchTokens: NorthStarDispatchTokens = {
  sectionButton:
    "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-[rgba(174,182,194,0.22)] bg-[rgba(39,49,64,0.45)] px-2.5 py-2 text-xs font-semibold text-[#F3EBDD] shadow-[0_1px_3px_rgba(3,7,12,0.18)] transition-colors hover:border-[rgba(201,164,77,0.32)] hover:bg-[rgba(39,49,64,0.65)] sm:min-h-11 sm:gap-2 sm:px-3 sm:text-sm [&_svg]:text-[#D6BE78]",
  sectionButtonActive:
    "border-[rgba(201,164,77,0.42)] bg-[rgba(201,164,77,0.16)] text-[#FFF8E8] ring-2 ring-[rgba(201,164,77,0.24)] [&_svg]:text-[#E6D092]",
  sectionButtonEmphasized:
    "border-[rgba(201,164,77,0.48)] bg-[rgba(201,164,77,0.20)] text-[#FFF8E8] ring-2 ring-[rgba(201,164,77,0.30)] [&_svg]:text-[#E6D092]",
  sectionButtonBadge:
    "rounded-full bg-[rgba(174,182,194,0.14)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#AEB6C2] sm:px-2 sm:text-xs",
  sectionButtonBadgeActive:
    "rounded-full bg-[rgba(201,164,77,0.22)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#E6D092] sm:px-2 sm:text-xs",
  focusBanner:
    "flex flex-wrap items-start justify-between gap-2 rounded-xl border border-[rgba(201,164,77,0.28)] bg-[rgba(39,49,64,0.55)] px-3 py-2 shadow-[0_2px_8px_rgba(3,7,12,0.18)] sm:gap-3 sm:px-4 sm:py-3",
  focusBannerIcon:
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(201,164,77,0.16)] text-[#E6D092] ring-1 ring-[rgba(201,164,77,0.24)] sm:h-9 sm:w-9 sm:rounded-xl",
  focusBannerTitle: "text-xs font-bold text-[#FFF8E8] sm:text-sm",
  focusBannerDescription:
    "mt-0.5 hidden text-[11px] leading-snug text-[#D7CDBD] sm:mt-1 sm:block sm:text-xs sm:leading-relaxed",
  focusBannerClear:
    "inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#E6D092] transition-colors hover:text-[#F0E4B8]",
  statPill:
    "rounded-full border border-[rgba(201,164,77,0.28)] bg-[rgba(39,49,64,0.45)] px-2 py-1 text-[11px] font-semibold tabular-nums text-[#F3EBDD] shadow-sm sm:px-3 sm:py-1.5 sm:text-xs",
  statPillUnassigned:
    "rounded-full border border-[rgba(201,164,77,0.38)] bg-[rgba(201,164,77,0.14)] px-2 py-1 text-[11px] font-semibold tabular-nums text-[#E6D092] shadow-sm sm:px-3 sm:py-1.5 sm:text-xs",
  boardSurface:
    "relative flex min-h-0 min-w-0 max-w-full flex-col overflow-hidden rounded-[1.25rem] bg-gradient-to-b from-[#403527] via-[#292219] to-[#211B14] shadow-[0_14px_48px_-14px_rgba(0,0,0,0.38),0_0_0_1px_rgba(255,255,255,0.06)_inset] ring-1 ring-[rgba(174,182,194,0.18)]",
  boardSurfaceTopAccent:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(214,190,120,0.38)] to-transparent",
  boardHeader:
    "flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-[rgba(201,164,77,0.14)] px-3 py-2.5 sm:px-4 sm:py-3",
  boardHeaderTitle:
    "text-sm font-bold tracking-tight text-[#FFF8E8] sm:text-base",
  boardHeaderSubtitle: "mt-0.5 hidden text-xs text-[#D7CDBD] sm:block",
  boardBody:
    "min-h-0 min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#261F17] px-2 py-2.5 pb-[max(5rem,calc(1rem+env(safe-area-inset-bottom)))] sm:px-3 sm:py-3 sm:pb-16 lg:pb-6",
  boardUnassignedButton:
    "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(201,164,77,0.32)] bg-[rgba(201,164,77,0.12)] px-2.5 py-1.5 text-xs font-semibold text-[#E6D092] transition-colors hover:border-[rgba(214,190,120,0.42)] hover:bg-[rgba(201,164,77,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,164,77,0.35)]",
  boardUnassignedBadge:
    "rounded-full bg-[rgba(201,164,77,0.22)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#FFF8E8]",
  boardEmphasisRing: "ring-2 ring-[rgba(201,164,77,0.28)]",
  filterBar:
    "dispatch-north-star-filter-bar rounded-xl border border-[rgba(174,182,194,0.18)] bg-[#292219] px-3 py-2.5 shadow-[0_2px_8px_rgba(3,7,12,0.18)] sm:rounded-2xl sm:px-4 sm:py-3",
  filterBarCompact: "dispatch-north-star-filter-bar px-0 py-0",
  unassignedFilterButton:
    "col-span-2 inline-flex min-h-[2.75rem] shrink-0 items-center justify-center gap-2 rounded-lg border border-[rgba(201,164,77,0.32)] bg-[rgba(201,164,77,0.14)] px-3 py-2 text-sm font-semibold text-[#E6D092] transition-colors hover:border-[rgba(201,164,77,0.42)] hover:bg-[rgba(201,164,77,0.20)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,164,77,0.30)] sm:col-span-1 sm:min-h-0 sm:py-2.5",
  unassignedFilterBadge:
    "rounded-full bg-[rgba(201,164,77,0.22)] px-2 py-0.5 text-xs font-bold tabular-nums text-[#FFF8E8]",
  lane:
    "min-w-0 max-w-full overflow-hidden rounded-xl border border-[rgba(174,182,194,0.16)] bg-[#382E22] shadow-[0_2px_10px_rgba(3,7,12,0.22)] sm:rounded-2xl",
  laneHeader:
    "flex shrink-0 items-center gap-2 border-b border-[rgba(174,182,194,0.12)] bg-gradient-to-b from-[#403527] to-[#292219] px-2.5 py-2 sm:gap-2.5 sm:w-44 sm:flex-col sm:items-start sm:justify-center sm:border-b-0 sm:border-r sm:border-[rgba(201,164,77,0.14)] sm:px-3 sm:py-2.5 lg:w-48",
  laneHeaderAvatar:
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#E6D092] to-[#B88A2E] text-xs font-bold text-[#17130E] shadow-[0_1px_4px_rgba(138,99,36,0.20)] ring-1 ring-[rgba(201,164,77,0.28)] sm:h-9 sm:w-9 sm:rounded-xl",
  laneHeaderName:
    "truncate text-sm font-bold tracking-tight text-[#FFF8E8]",
  laneHeaderRole: "truncate text-[11px] text-[#B8AD9E]",
  laneHeaderStatusLabel: "text-[11px] font-medium text-[#D7CDBD]",
  laneHeaderNextJob:
    "hidden text-[10px] font-medium text-[#B8AD9E] sm:inline",
  laneHeaderCount:
    "rounded-full border border-[rgba(201,164,77,0.22)] bg-[rgba(39,49,64,0.55)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#F3EBDD]",
  laneJobWell:
    "flex min-h-[4.75rem] min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain bg-[#282118] p-2 sm:min-h-[5.5rem] sm:gap-2.5 sm:p-2.5",
  laneEmptyWell:
    "flex flex-1 items-center justify-center rounded-lg border border-dashed border-[rgba(174,182,194,0.18)] bg-[rgba(39,49,64,0.28)] px-3 py-2.5 text-center sm:rounded-xl sm:px-4 sm:py-3",
  laneEmptyText: "text-[11px] font-medium text-[#AEB6C2]",
  laneToggleButton:
    "self-start rounded-lg border border-[rgba(174,182,194,0.22)] bg-[rgba(39,49,64,0.45)] px-3 py-1.5 text-[11px] font-semibold text-[#F3EBDD] transition-colors hover:border-[rgba(201,164,77,0.32)] hover:bg-[rgba(39,49,64,0.65)] sm:text-xs",
  laneToggleButtonDashed:
    "self-start rounded-lg border border-dashed border-[rgba(174,182,194,0.22)] bg-[rgba(39,49,64,0.28)] px-3 py-1.5 text-[11px] font-semibold text-[#D7CDBD] transition-colors hover:border-[rgba(201,164,77,0.28)] hover:bg-[rgba(39,49,64,0.45)] sm:text-xs",
  unassignedLane:
    "min-w-0 max-w-full overflow-hidden rounded-xl border border-[rgba(201,164,77,0.28)] bg-[#443829] shadow-[0_2px_10px_rgba(3,7,12,0.22)] sm:rounded-2xl",
  unassignedLaneEmphasis:
    "min-w-0 max-w-full overflow-hidden rounded-xl border border-[rgba(201,164,77,0.42)] bg-[#483B2C] shadow-[0_4px_16px_rgba(3,7,12,0.24)] ring-1 ring-[rgba(201,164,77,0.22)] sm:rounded-2xl",
  unassignedLaneHeader:
    "flex shrink-0 items-center gap-2 border-b border-[rgba(201,164,77,0.18)] bg-gradient-to-b from-[#504231] to-[#443829] px-2.5 py-2 sm:gap-2.5 sm:w-44 sm:flex-col sm:items-start sm:justify-center sm:border-b-0 sm:border-r sm:border-[rgba(201,164,77,0.16)] sm:px-3 sm:py-2.5 lg:w-48",
  unassignedLaneIcon:
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(201,164,77,0.18)] text-[#E6D092] ring-1 ring-[rgba(201,164,77,0.28)] sm:h-9 sm:w-9 sm:rounded-xl [&_svg]:text-[#E6D092]",
  unassignedLaneTitle: "text-sm font-bold text-[#FFF8E8]",
  unassignedLaneSubtitle: "hidden text-[11px] text-[#D7CDBD] sm:block",
  unassignedLaneCount:
    "rounded-full border border-[rgba(201,164,77,0.32)] bg-[rgba(201,164,77,0.16)] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#E6D092]",
  unassignedJobWell:
    "flex min-h-[4.75rem] min-w-0 flex-1 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain bg-[#282118] p-2 sm:min-h-[5.5rem] sm:gap-2.5 sm:p-2.5",
  unassignedEmptyWell:
    "flex flex-1 items-center justify-center rounded-lg border border-dashed border-[rgba(201,164,77,0.24)] bg-[rgba(39,49,64,0.28)] px-3 py-2.5 text-center sm:rounded-xl sm:px-4 sm:py-3",
  jobCard:
    "snap-start w-full rounded-xl border border-[rgba(174,182,194,0.16)] bg-[#403527] p-3.5 text-left shadow-[0_2px_8px_rgba(3,7,12,0.22)] transition-[border-color,box-shadow,background-color] hover:border-[rgba(201,164,77,0.32)] hover:shadow-[0_4px_14px_rgba(3,7,12,0.28)]",
  jobCardCompact:
    "snap-start w-[12rem] shrink-0 rounded-xl border border-[rgba(174,182,194,0.16)] bg-[#403527] p-2.5 text-left shadow-[0_2px_8px_rgba(3,7,12,0.22)] transition-[border-color,box-shadow,background-color] hover:border-[rgba(201,164,77,0.32)] hover:shadow-[0_4px_14px_rgba(3,7,12,0.28)] sm:w-[13.25rem] sm:p-3",
  jobCardSelected:
    "border-[rgba(201,164,77,0.48)] bg-[#504231] shadow-[0_4px_16px_rgba(3,7,12,0.28)] ring-2 ring-[rgba(201,164,77,0.28)]",
  jobCardAssigning:
    "border-[rgba(201,164,77,0.35)] bg-[#443829] opacity-90",
  jobCardJobNumber:
    "font-semibold uppercase tracking-[0.12em] text-[#D6BE78] tabular-nums",
  jobCardCustomer: "truncate font-bold tracking-tight text-[#FFF8E8]",
  jobCardService: "truncate text-[#D7CDBD]",
  jobCardMeta: "text-[#D7CDBD]",
  jobCardMetaIcon: "shrink-0 text-[#D6BE78]",
  jobCardMetaTime: "font-semibold text-[#F3EBDD]",
  jobCardFooter: "border-t border-[rgba(174,182,194,0.14)]",
  jobCardLoader: "h-3.5 w-3.5 animate-spin text-[#D6BE78]",
  emptyState:
    "flex w-full max-w-md flex-col items-center rounded-xl border border-[rgba(174,182,194,0.16)] bg-[#382E22] px-6 py-8 text-center shadow-[0_4px_16px_rgba(3,7,12,0.22)]",
  emptyStateIcon:
    "flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(201,164,77,0.14)] ring-1 ring-[rgba(201,164,77,0.22)] [&_svg]:text-[#D6BE78]",
  emptyStateTitle: "mt-3 text-base font-bold text-[#FFF8E8]",
  emptyStateDescription: "mt-1.5 text-sm text-[#AEB6C2]",
  detailPanelShell:
    "dispatch-north-star-detail-panel relative flex h-full max-h-full min-h-0 flex-col overflow-hidden rounded-t-2xl bg-[#292219] shadow-[0_14px_48px_-14px_rgba(0,0,0,0.38)] ring-1 ring-[rgba(174,182,194,0.18)] sm:rounded-2xl",
  detailPanelTopAccent:
    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(214,190,120,0.38)] to-transparent",
  detailPanelHeader:
    "relative flex shrink-0 items-start justify-between border-b border-[rgba(201,164,77,0.14)] bg-gradient-to-b from-[#403527] to-[#292219] px-4 pb-4 pt-3 overlay-header-safe-mobile sm:px-5 lg:py-4",
  detailPanelTitle:
    "text-base font-bold tracking-tight text-[#FFF8E8] sm:text-lg",
  detailPanelSubtitle: "mt-0.5 text-xs text-[#D7CDBD]",
  detailPanelCustomerLink:
    "text-xs text-[#D7CDBD] transition-colors hover:text-[#E6D092]",
  detailPanelCloseButton:
    "inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-[rgba(174,182,194,0.22)] bg-[rgba(39,49,64,0.35)] p-2 text-[#F3EBDD] transition-colors hover:border-[rgba(201,164,77,0.28)] hover:bg-[rgba(39,49,64,0.55)] [&_svg]:text-[#D6BE78]",
  detailPanelBody:
    "dispatch-north-star-detail-panel-body min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#261F17] pl-4 pr-5 py-4 pb-[max(6rem,calc(1.5rem+env(safe-area-inset-bottom)))] sm:pl-5 sm:pr-6 sm:py-5 sm:pb-[max(4.5rem,calc(1.25rem+env(safe-area-inset-bottom)))] lg:pb-6",
  detailSectionLabel:
    "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#AEB6C2]",
  detailIdentityCard:
    "rounded-xl border border-[rgba(174,182,194,0.16)] bg-[#382E22] p-3.5 shadow-[0_2px_8px_rgba(3,7,12,0.18)] sm:p-4",
  detailIdentityService: "text-sm font-medium text-[#D7CDBD]",
  detailIdentityMeta: "text-xs text-[#AEB6C2]",
  detailSiteContextCard:
    "rounded-xl border border-[rgba(174,182,194,0.16)] bg-gradient-to-br from-[#443829] to-[#382E22] p-3.5 shadow-[0_2px_8px_rgba(3,7,12,0.18)] sm:p-4",
  detailSiteContextIconWrap:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(201,164,77,0.14)] ring-1 ring-[rgba(201,164,77,0.22)] [&_svg]:text-[#D6BE78]",
  detailSiteContextAddress: "text-sm font-medium leading-snug text-[#F3EBDD]",
  detailSectionDivider: "border-[rgba(174,182,194,0.14)]",
  detailAssignmentCard:
    "rounded-xl border border-[rgba(174,182,194,0.16)] bg-[#382E22] p-3 shadow-[0_2px_6px_rgba(3,7,12,0.16)]",
  detailTechAvatar:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#E6D092] to-[#B88A2E] text-xs font-bold text-[#17130E] ring-1 ring-[rgba(201,164,77,0.28)]",
  detailTechName: "text-sm font-semibold text-[#FFF8E8]",
  detailTechRole: "text-xs text-[#D7CDBD]",
  detailTechPhone: "text-xs text-[#D7CDBD] [&_svg]:text-[#D6BE78]",
  detailUnassignedBanner:
    "flex items-center gap-2 text-sm font-medium text-[#E6D092]",
  detailEstimateHint:
    "rounded-lg border border-[rgba(201,164,77,0.28)] bg-[rgba(201,164,77,0.12)] px-3 py-2.5 text-xs font-medium text-[#E6D092] ring-1 ring-[rgba(201,164,77,0.16)]",
  detailSelect:
    "w-full min-h-11 rounded-lg border border-[rgba(148,163,184,0.24)] bg-[#FFFFFF] px-3 py-3 text-sm text-[#101827] outline-none focus:border-[#B88A2E] focus:ring-2 focus:ring-[rgba(201,164,77,0.22)] disabled:cursor-not-allowed disabled:opacity-60 sm:py-2",
  detailPrimaryButton:
    "north-star-dispatch-disabled-action w-full min-h-11 rounded-lg border border-[#E6D092] bg-gradient-to-b from-[#E6D092] from-0% via-[#C9A44D] via-[45%] to-[#B88A2E] to-100% px-3 py-3 text-sm font-semibold text-[#17130E] shadow-[0_2px_10px_rgba(138,99,36,0.28)] transition-all hover:from-[#F0E4B8] hover:via-[#D4B05A] hover:to-[#9A7028] disabled:cursor-not-allowed disabled:border-[rgba(174,182,194,0.18)] disabled:from-[#483B2C] disabled:via-[#483B2C] disabled:to-[#483B2C] disabled:text-[#AEB6C2] disabled:shadow-none sm:py-2",
  detailSecondaryButton:
    "inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-lg border border-[rgba(174,182,194,0.22)] bg-[rgba(39,49,64,0.45)] px-3 py-3 text-sm font-semibold text-[#F3EBDD] transition-colors hover:border-[rgba(201,164,77,0.32)] hover:bg-[rgba(39,49,64,0.65)] disabled:cursor-not-allowed disabled:opacity-60 sm:py-2 [&_svg]:text-[#D6BE78]",
  detailMutedText: "text-xs text-[#AEB6C2]",
  detailBodyText: "text-sm leading-relaxed text-[#D7CDBD]",
  detailFooterLink:
    "flex min-h-11 flex-1 items-center justify-center rounded-lg border border-[rgba(174,182,194,0.22)] bg-[rgba(39,49,64,0.45)] px-3 py-3 text-sm font-semibold text-[#F3EBDD] transition-colors hover:border-[rgba(201,164,77,0.32)] hover:bg-[rgba(39,49,64,0.65)] sm:py-2",
  detailFooterDivider: "border-[rgba(174,182,194,0.14)]",
  detailPermissionNote:
    "rounded-xl border border-[rgba(174,182,194,0.16)] bg-[#382E22] px-4 py-3 text-sm text-[#D7CDBD]",
  detailPendingNote: "text-xs font-medium text-[#E6D092]",
  pageCanvas: "north-star-dispatch-page-canvas",
  sectionSheetPanel:
    "dispatch-north-star-section-sheet relative flex h-[90dvh] max-h-[90dvh] min-h-0 flex-col overflow-hidden rounded-t-2xl border border-[rgba(174,182,194,0.18)] bg-[#292219] shadow-[0_14px_48px_-14px_rgba(0,0,0,0.38)] sm:h-auto sm:max-h-[85dvh] sm:rounded-2xl",
  sectionSheetHeader:
    "border-b border-[rgba(201,164,77,0.14)] bg-gradient-to-b from-[#403527] to-[#292219]",
  sectionSheetHeaderIcon:
    "bg-[rgba(201,164,77,0.14)] text-[#D6BE78] ring-1 ring-[rgba(201,164,77,0.22)] sm:rounded-xl [&_svg]:text-[#D6BE78]",
  sectionSheetBody:
    "min-w-0 overflow-x-hidden bg-[#261F17] pb-[max(5.5rem,calc(1.25rem+env(safe-area-inset-bottom)))] sm:pb-[max(4rem,calc(1rem+env(safe-area-inset-bottom)))]",
  detailMobileSheetPanel:
    "dispatch-north-star-detail-mobile-sheet flex h-[90dvh] max-h-[90dvh] min-h-0 flex-col sm:h-auto sm:max-h-[90dvh]",
  unassignedSheetPanel:
    "dispatch-north-star-unassigned-sheet relative flex h-[90dvh] max-h-[90dvh] min-h-0 flex-col overflow-hidden rounded-t-2xl border border-[rgba(201,164,77,0.28)] bg-[#292219] shadow-[0_14px_48px_-14px_rgba(0,0,0,0.38)] sm:h-auto sm:max-h-[80vh] sm:rounded-2xl",
  unassignedSheetHeader:
    "border-b border-[rgba(201,164,77,0.18)] bg-gradient-to-b from-[#403527] to-[#292219]",
  unassignedSheetHeaderIcon:
    "bg-[rgba(201,164,77,0.18)] text-[#E6D092] ring-1 ring-[rgba(201,164,77,0.28)] sm:rounded-xl [&_svg]:text-[#E6D092]",
  unassignedSheetBadge:
    "rounded-full bg-[rgba(201,164,77,0.22)] px-2.5 py-0.5 text-xs font-bold tabular-nums text-[#FFF8E8]",
  unassignedSheetEmpty:
    "flex flex-col items-center justify-center rounded-xl border border-dashed border-[rgba(201,164,77,0.24)] bg-[rgba(39,49,64,0.28)] px-4 py-10 text-center",
  summaryMetricCard:
    "rounded-xl border border-[rgba(174,182,194,0.16)] bg-[#382E22] p-2.5 shadow-[0_2px_8px_rgba(3,7,12,0.18)] sm:rounded-2xl sm:p-4",
  summaryMetricCardHighlight:
    "border-[rgba(201,164,77,0.32)] bg-[rgba(201,164,77,0.12)] ring-1 ring-[rgba(201,164,77,0.18)]",
  summaryMetricCardInteractive:
    "cursor-pointer transition-[border-color,box-shadow,background-color] hover:border-[rgba(201,164,77,0.32)] hover:bg-[#443829] hover:shadow-[0_4px_14px_rgba(3,7,12,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,164,77,0.30)]",
  summaryMetricLabel:
    "truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#AEB6C2] sm:text-[11px]",
  summaryMetricValue:
    "mt-0.5 text-lg font-bold tabular-nums text-[#FFF8E8] sm:mt-1 sm:text-2xl",
  summaryMetricDescription: "mt-0.5 hidden text-xs text-[#AEB6C2] sm:block",
  summaryMetricIcon:
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(201,164,77,0.14)] ring-1 ring-[rgba(201,164,77,0.22)] sm:h-10 sm:w-10 sm:rounded-xl [&_svg]:text-[#D6BE78]",
  workloadCard:
    "rounded-xl border border-[rgba(174,182,194,0.16)] bg-[#382E22] p-2.5 shadow-[0_2px_8px_rgba(3,7,12,0.18)] transition-[border-color,box-shadow,background-color] sm:rounded-2xl sm:p-4",
  workloadCardActive:
    "border-[rgba(201,164,77,0.42)] bg-[rgba(201,164,77,0.12)] ring-2 ring-[rgba(201,164,77,0.22)]",
  workloadCardOverloaded:
    "border-[rgba(201,164,77,0.38)] bg-[rgba(201,164,77,0.10)] ring-2 ring-[rgba(201,164,77,0.18)] shadow-[0_4px_14px_rgba(3,7,12,0.22)]",
  workloadCardInteractive:
    "min-h-11 cursor-pointer hover:border-[rgba(201,164,77,0.32)] hover:bg-[#443829] hover:shadow-[0_4px_14px_rgba(3,7,12,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,164,77,0.30)]",
  workloadEmptyState:
    "rounded-xl border border-dashed border-[rgba(174,182,194,0.18)] bg-[rgba(39,49,64,0.28)] px-3 py-2.5 sm:rounded-2xl sm:px-4 sm:py-4",
};
