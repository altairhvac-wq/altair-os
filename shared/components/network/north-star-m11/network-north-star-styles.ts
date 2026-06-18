import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";

export const networkNorthStarStyles = {
  pageCanvas: lt.pageCanvas,
  pageHeader: lt.pageHeader,
  pageHeaderEyebrow: lt.pageHeaderEyebrow,
  pageHeaderTitle: lt.pageHeaderTitle,
  pageHeaderSubtitle: lt.pageHeaderSubtitle,
  primaryAction: lt.primaryAction,
  secondaryAction: lt.secondaryAction,
  searchInput: lt.searchInput,
  sectionSurface: "north-star-list-surface rounded-[1.25rem]",
  sectionEyebrow:
    "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A6324]",
  sectionTitle: "text-sm font-bold text-[#17130E]",
  sectionSubtitle: "text-[11px] leading-snug text-[#6B6255]",
  panelHeader:
    "shrink-0 border-b border-[rgba(138,99,36,0.12)] bg-[#F5F0E4] px-3 py-2.5 sm:px-4 lg:px-5",
  scrollRegion: "flex-1 overflow-y-auto overscroll-contain",
  tabBand: lt.viewTabsBand,
  tabControl: lt.viewTabsControl,
  tabItem: lt.viewTabsItem,
  tabItemActive: lt.viewTabsItemActive,
  filterControl: lt.viewTabsControl,
  filterItem: lt.viewTabsItem,
  filterItemActive: lt.viewTabsItemActive,
  emptyState: lt.emptyState,
  emptyTitle: "text-sm font-semibold text-[#17130E]",
  emptyDescription: "mt-1 text-xs text-[#6B6255]",
  panelAction:
    "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-2.5 py-1.5 text-xs font-semibold text-[#4F4638] transition-colors hover:border-[rgba(201,164,77,0.38)] hover:bg-[#F3EBDD] disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:text-[#8A6324]",
  panelActionAccent:
    "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(201,164,77,0.42)] bg-gradient-to-b from-[#F0E4B8] from-0% via-[#D4B05A] via-[50%] to-[#C9A44D] to-100% px-2.5 py-1.5 text-xs font-semibold text-[#17130E] shadow-[0_1px_4px_rgba(138,99,36,0.12)] transition-all hover:from-[#F5EBC8] hover:via-[#DDB868] hover:to-[#B88A2E] disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:text-[#17130E]",
  cardShell:
    "rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] p-4 transition-all",
  cardShellSelected:
    "rounded-[1rem] border border-[rgba(201,164,77,0.45)] bg-[#FFF9EA] p-4 shadow-[0_2px_12px_rgba(138,99,36,0.14)] ring-1 ring-[rgba(201,164,77,0.28)] transition-all",
  cardShellTrusted:
    "rounded-[1rem] border border-[rgba(201,164,77,0.28)] bg-[#FFF9EA] p-4 transition-all hover:border-[rgba(201,164,77,0.42)] hover:shadow-[0_2px_12px_rgba(138,99,36,0.12)]",
  cardPrimary: "truncate text-sm font-bold text-[#17130E]",
  cardSecondary: "text-xs text-[#4F4638]",
  cardMuted: "text-xs text-[#6B6255]",
  cardIcon:
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#E6D092] to-[#B88A2E] text-xs font-bold text-[#17130E] ring-1 ring-[rgba(138,99,36,0.16)]",
  cardActionFull:
    "inline-flex w-full min-h-8 items-center justify-center gap-1.5 rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-3 py-1.5 text-xs font-semibold text-[#4F4638] transition hover:border-[rgba(201,164,77,0.38)] hover:bg-[#F3EBDD] disabled:opacity-60 [&_svg]:text-[#8A6324]",
  cardActionAccentFull:
    "inline-flex w-full min-h-8 items-center justify-center gap-1.5 rounded-lg border border-[rgba(201,164,77,0.42)] bg-gradient-to-b from-[#F0E4B8] from-0% via-[#D4B05A] via-[50%] to-[#C9A44D] to-100% px-3 py-1.5 text-xs font-semibold text-[#17130E] shadow-[0_1px_4px_rgba(138,99,36,0.12)] transition hover:from-[#F5EBC8] hover:via-[#DDB868] hover:to-[#B88A2E] disabled:opacity-60 [&_svg]:text-[#17130E]",
  metricGroupLabel:
    "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B6255]",
  metricCard:
    "rounded-[0.875rem] border border-[rgba(138,99,36,0.10)] bg-[#FBF7EF] px-3 py-2.5",
  metricLabel:
    "truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B6255]",
  metricValue: "mt-0.5 text-base font-bold tabular-nums text-[#17130E]",
  metricDescription: "mt-0.5 text-[11px] leading-snug text-[#6B6255]",
  metricIconWrapBrass:
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#EFE4CB] text-[#8A6324] ring-1 ring-[rgba(138,99,36,0.12)]",
  metricIconWrapSuccess:
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[rgba(22,101,52,0.08)] text-[#166534] ring-1 ring-[rgba(22,101,52,0.14)]",
  metricIconWrapMuted:
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[rgba(79,70,56,0.06)] text-[#6B6255] ring-1 ring-[rgba(138,99,36,0.10)]",
  detailPanel:
    "north-star-list-surface flex min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden lg:h-full lg:min-h-0 lg:w-[420px] lg:flex-none lg:shrink-0",
  detailPanelHeader:
    "flex shrink-0 items-start justify-between border-b border-[rgba(138,99,36,0.12)] bg-[#F5F0E4] px-4 py-4 sm:px-5",
  detailPanelTitle: "truncate text-base font-bold text-[#17130E]",
  detailPanelSubtitle: "mt-0.5 text-xs text-[#6B6255]",
  detailPanelClose:
    "rounded-lg p-1.5 text-[#6B6255] transition-colors hover:bg-[#EFE4CB] hover:text-[#17130E]",
  profileVisibilityStrip:
    "flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-4 py-3.5",
  inviteHero:
    "rounded-[1.25rem] border border-[rgba(201,164,77,0.22)] bg-gradient-to-br from-[#273140] via-[#1A2029] to-[#111821] p-5 text-[#F8F1E7] ring-1 ring-[rgba(174,182,194,0.14)]",
  inviteHeroEyebrow:
    "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D6BE78]",
  inviteHeroTitle: "mt-1 text-lg font-bold text-[#FFF9EA]",
  inviteHeroBody: "mt-2 max-w-3xl text-sm text-[#D7CDBD]",
  inviteFormShell:
    "rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] p-4",
  inviteSuccessBanner:
    "rounded-[1rem] border border-[rgba(22,101,52,0.22)] bg-[#F0F7F2] px-4 py-3",
  errorBanner:
    "rounded-xl border border-[rgba(185,28,28,0.22)] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]",
  formInput:
    "mt-1 w-full min-h-10 rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-3 py-2 text-sm text-[#17130E] placeholder:text-[#6B6255] outline-none transition-colors focus:border-[#B88A2E] focus:bg-[#FBF7EF] focus:ring-2 focus:ring-[rgba(201,164,77,0.22)] sm:min-h-[44px] sm:py-2.5",
  formTextarea:
    "mt-1 w-full min-h-[80px] max-w-full resize-y rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-3 py-2 text-sm text-[#17130E] placeholder:text-[#6B6255] outline-none transition-colors focus:border-[#B88A2E] focus:bg-[#FBF7EF] focus:ring-2 focus:ring-[rgba(201,164,77,0.22)] sm:min-h-[96px] sm:py-2.5",
  formLabel: "text-xs font-semibold text-[#4F4638]",
  formLabelOptional: "font-normal text-[#6B6255]",
  saveButton:
    "inline-flex min-h-10 items-center justify-center rounded-lg border border-[#E6D092] bg-gradient-to-b from-[#E6D092] from-0% via-[#C9A44D] via-[45%] to-[#B88A2E] to-100% px-4 py-2 text-sm font-semibold text-[#17130E] shadow-[0_2px_10px_rgba(138,99,36,0.28)] transition-all hover:from-[#F0E4B8] hover:via-[#D4B05A] hover:to-[#9A7028] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[44px] sm:py-2.5",
  cancelButton:
    "inline-flex min-h-10 items-center justify-center rounded-lg border border-[rgba(138,99,36,0.22)] bg-[#FFF9EA] px-4 py-2 text-sm font-semibold text-[#4F4638] transition-colors hover:border-[#C9A44D] hover:bg-[#F3EBDD] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[44px] sm:py-2.5",
  permissionCopy: "text-sm text-[#4F4638]",
  countMeta: "text-xs font-medium text-[#6B6255]",
  workspaceStack: "network-north-star-workspace min-w-0 space-y-3 px-3 sm:space-y-3.5 sm:px-3.5 lg:px-5",
} as const;

export const st = networkNorthStarStyles;

export type NetworkSurface = "legacy" | "north-star";
