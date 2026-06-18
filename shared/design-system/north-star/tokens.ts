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

/**
 * Customers list page — Mission Control Original Refined (M3A).
 * Moon graphite frame: lift #273140 · base #1A2029 · deep #111821 · silver edge #AEB6C2
 * Royal brass actions: champagne #E6D092 · royal #C9A44D · command #B88A2E
 * Light surfaces: ivory #FBF7EF / #FFF9EA · text #17130E / #4F4638 / #6B6255
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
    "relative lg:rounded-[1.25rem] lg:ring-1 lg:ring-[rgba(174,182,194,0.14)]",
  listSurfaceTopAccent:
    "pointer-events-none absolute inset-x-0 top-0 hidden h-px bg-gradient-to-r from-transparent via-[rgba(214,190,120,0.32)] to-transparent lg:block",
  primaryAction:
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#E6D092] bg-gradient-to-b from-[#E6D092] from-0% via-[#C9A44D] via-[45%] to-[#B88A2E] to-100% px-3.5 py-1.5 text-sm font-semibold text-[#17130E] shadow-[0_2px_10px_rgba(138,99,36,0.28)] transition-all hover:-translate-y-px hover:from-[#F0E4B8] hover:via-[#D4B05A] hover:to-[#9A7028] hover:shadow-[0_4px_16px_rgba(138,99,36,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,164,77,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2029] [&_svg]:text-[#17130E]",
  secondaryAction:
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#D6BE78] bg-[#FFF9EA] px-3 py-1.5 text-sm font-semibold text-[#17130E] shadow-[0_1px_4px_rgba(138,99,36,0.16)] transition-colors hover:border-[#E6D092] hover:bg-[#F3EBDD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,164,77,0.40)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2029] [&_svg]:text-[#8A6324]",
  filterBar:
    "shrink-0 border-b border-[rgba(138,99,36,0.12)] bg-[#EFE4CB] px-3 py-2.5 sm:px-4 lg:px-5 lg:py-3",
  searchInput:
    "h-9 w-full min-h-9 rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] py-1.5 pl-9 pr-3 text-sm text-[#17130E] placeholder:text-[#6B6255] outline-none transition-colors focus:border-[#B88A2E] focus:bg-[#FBF7EF] focus:ring-2 focus:ring-[rgba(201,164,77,0.22)]",
  filterSelect:
    "h-9 w-full min-h-9 appearance-none rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] py-1.5 pl-9 pr-8 text-sm font-medium text-[#17130E] outline-none transition-colors focus:border-[#B88A2E] focus:bg-[#FBF7EF] focus:ring-2 focus:ring-[rgba(201,164,77,0.22)] sm:w-auto sm:pr-10",
  filterIcon: "text-[#8A6324]",
  filterMeta: "mt-1.5 text-[11px] text-[#6B6255] sm:text-xs",
  tableHeaderRow:
    "border-b border-[rgba(138,99,36,0.12)] bg-[#EFE4CB] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4F4638]",
  tableHeaderCell:
    "admin-table-cell text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4F4638]",
  tableRow:
    "cursor-pointer border-b border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] transition-colors hover:bg-[#F3EBDD]",
  tableRowHover: "hover:bg-[#F3EBDD]",
  tableRowSelected:
    "bg-[rgba(201,164,77,0.12)] shadow-[inset_3px_0_0_0_#C9A44D] ring-1 ring-inset ring-[rgba(201,164,77,0.22)]",
  tableCheckbox:
    "h-4 w-4 rounded border-[rgba(138,99,36,0.35)] text-[#8A6324] focus:ring-[rgba(201,164,77,0.35)] disabled:cursor-not-allowed disabled:opacity-40",
  tableAvatar:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E6D092] to-[#D4C4A0] text-xs font-bold text-[#4F4638] ring-1 ring-[rgba(138,99,36,0.16)] shadow-[0_1px_3px_rgba(138,99,36,0.12)]",
  tablePrimaryText: "truncate font-semibold text-[#17130E]",
  tableSecondaryText: "font-medium text-[#4F4638]",
  tableMutedText: "truncate text-xs text-[#6B6255]",
  tableMetricText: "font-semibold tabular-nums text-[#17130E]",
  tableDateText: "font-medium text-[#4F4638]",
  badgeDeleted:
    "inline-flex shrink-0 rounded-full bg-[rgba(138,99,36,0.10)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8A6324] ring-1 ring-[rgba(138,99,36,0.18)]",
  badgeArchived:
    "inline-flex shrink-0 rounded-full bg-[#F1E7D2] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6B6255] ring-1 ring-[rgba(138,99,36,0.12)]",
  bulkBar:
    "sticky bottom-0 z-20 border-t border-[rgba(138,99,36,0.12)] bg-[#EFE4CB] px-3 py-3 shadow-[0_-8px_24px_-12px_rgba(3,7,12,0.18)] sm:px-4 lg:bg-[#FBF7EF] lg:px-5",
  bulkBarTitle: "text-sm font-bold text-[#17130E]",
  bulkClearButton:
    "inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[rgba(138,99,36,0.22)] bg-[#FFF9EA] px-3 py-1.5 text-xs font-semibold text-[#4F4638] transition-colors hover:border-[#C9A44D] hover:bg-[#F3EBDD] disabled:cursor-not-allowed disabled:opacity-60",
  bulkPrimaryAction:
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[#E6D092] bg-gradient-to-b from-[#E6D092] from-0% via-[#C9A44D] via-[45%] to-[#B88A2E] to-100% px-3 py-2 text-xs font-semibold text-[#17130E] transition-all hover:from-[#F0E4B8] hover:via-[#D4B05A] hover:to-[#9A7028] disabled:cursor-not-allowed disabled:opacity-60",
  bulkSecondaryAction:
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[rgba(138,99,36,0.22)] bg-[#FFF9EA] px-3 py-2 text-xs font-semibold text-[#4F4638] transition-colors hover:border-[#C9A44D] hover:bg-[#F3EBDD] disabled:cursor-not-allowed disabled:opacity-60",
  bulkDestructiveAction:
    "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[rgba(185,28,28,0.35)] bg-[#FEF2F2] px-3 py-2 text-xs font-semibold text-[#991B1B] transition-colors hover:border-[rgba(185,28,28,0.5)] hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-60",
  emptyState:
    "rounded-xl border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-6 py-8 shadow-[0_4px_16px_rgba(3,7,12,0.08)]",
  emptyStateAction:
    "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#E6D092] bg-gradient-to-b from-[#E6D092] from-0% via-[#C9A44D] via-[45%] to-[#B88A2E] to-100% px-4 py-2.5 text-sm font-semibold text-[#17130E] shadow-[0_2px_10px_rgba(138,99,36,0.28)] transition-all hover:-translate-y-px hover:from-[#F0E4B8] hover:via-[#D4B05A] hover:to-[#9A7028] hover:shadow-[0_4px_16px_rgba(138,99,36,0.32)] sm:w-auto sm:min-w-[9rem]",
};
