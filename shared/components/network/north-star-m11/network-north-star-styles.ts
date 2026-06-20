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
  filterControl: `${lt.viewTabsControl} inline-flex items-center`,
  filterItem: `${lt.viewTabsItem} inline-flex min-h-9 items-center justify-center gap-1.5 px-3 py-2 text-xs leading-none sm:flex-none`,
  filterItemActive: lt.viewTabsItemActive,
  filterToolbar: "shrink-0 border-b border-[rgba(138,99,36,0.08)] pb-3",
  filterToolbarRow:
    "grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_minmax(0,11rem)] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,10rem)_minmax(0,12rem)]",
  filterInput:
    "h-9 w-full rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] text-sm leading-normal text-[#17130E] outline-none transition-colors placeholder:text-[#6B6255] focus:border-[#B88A2E] focus:bg-[#FBF7EF] focus:ring-2 focus:ring-[rgba(201,164,77,0.22)]",
  emptyState: lt.emptyState,
  emptyTitle: "text-sm font-semibold text-[#17130E]",
  emptyDescription: "mt-1 text-xs text-[#6B6255]",
  panelAction:
    "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-2.5 py-1.5 text-xs font-semibold text-[#4F4638] transition-colors hover:border-[rgba(201,164,77,0.38)] hover:bg-[#F3EBDD] disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:text-[#8A6324]",
  panelActionAccent:
    "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(201,164,77,0.42)] bg-gradient-to-b from-[#F0E4B8] from-0% via-[#D4B05A] via-[50%] to-[#C9A44D] to-100% px-2.5 py-1.5 text-xs font-semibold text-[#17130E] shadow-[0_1px_4px_rgba(138,99,36,0.12)] transition-all hover:from-[#F5EBC8] hover:via-[#DDB868] hover:to-[#B88A2E] disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:text-[#17130E]",
  cardShellTrusted:
    "group/card relative rounded-lg border border-[rgba(201,164,77,0.28)] bg-[#FFF9EA] px-2 py-1.5 transition-colors hover:border-[rgba(201,164,77,0.42)] hover:bg-[#FFFDF5]",
  cardPrimary: "truncate text-[13px] font-semibold leading-tight text-[#17130E]",
  cardSecondary: "truncate text-[11px] leading-snug text-[#4F4638]",
  cardMuted: "truncate text-[11px] leading-snug text-[#6B6255]",
  cardIcon:
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#E6D092] to-[#B88A2E] text-[10px] font-bold leading-none text-[#17130E] ring-1 ring-[rgba(138,99,36,0.16)]",
  cardActionFull:
    "inline-flex w-full min-h-8 items-center justify-center gap-1.5 rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-3 py-1.5 text-xs font-semibold text-[#4F4638] transition hover:border-[rgba(201,164,77,0.38)] hover:bg-[#F3EBDD] disabled:opacity-60 [&_svg]:text-[#8A6324]",
  cardActionAccentFull:
    "inline-flex w-full min-h-8 items-center justify-center gap-1.5 rounded-lg border border-[rgba(201,164,77,0.42)] bg-gradient-to-b from-[#F0E4B8] from-0% via-[#D4B05A] via-[50%] to-[#C9A44D] to-100% px-3 py-1.5 text-xs font-semibold text-[#17130E] shadow-[0_1px_4px_rgba(138,99,36,0.12)] transition hover:from-[#F5EBC8] hover:via-[#DDB868] hover:to-[#B88A2E] disabled:opacity-60 [&_svg]:text-[#17130E]",
  detailPanel:
    "flex min-w-0 shrink-0 flex-col overflow-hidden rounded-lg border border-[rgba(138,99,36,0.10)] bg-[#FBF7EF]/80 lg:max-h-[min(22rem,45vh)]",
  detailPanelHeader:
    "flex shrink-0 items-start justify-between border-b border-[rgba(138,99,36,0.12)] bg-[#F5F0E4] px-3 py-2.5 sm:px-4",
  detailPanelTitle: "truncate text-sm font-bold text-[#17130E]",
  detailPanelSubtitle: "mt-0.5 text-[11px] leading-snug text-[#6B6255]",
  detailPanelClose:
    "rounded-lg p-1.5 text-[#6B6255] transition-colors hover:bg-[#EFE4CB] hover:text-[#17130E]",
  detailPanelEmptyShell:
    "flex shrink-0 flex-col items-center px-4 py-5 text-center",
  detailPanelEmptyIcon:
    "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#E6D092] to-[#B88A2E] text-[#17130E] ring-1 ring-[rgba(138,99,36,0.16)]",
  detailPanelEmptyTitle: "mt-3 text-sm font-semibold text-[#17130E]",
  detailPanelEmptyBody:
    "mt-1.5 max-w-[240px] text-[11px] leading-relaxed text-[#6B6255]",
  detailPanelEmptyChips: "mt-5 flex flex-wrap items-center justify-center gap-2",
  detailPanelEmptyChip:
    "inline-flex items-center rounded-full border border-[rgba(138,99,36,0.14)] bg-[#FFF9EA] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#6B6255]",
  detailPanelProfileHero:
    "rounded-xl border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] p-4 shadow-[0_2px_12px_rgba(138,99,36,0.08)]",
  detailPanelProfileName: "text-base font-bold text-[#17130E]",
  detailPanelConnectedBadge:
    "inline-flex items-center gap-1 rounded-full border border-[rgba(22,101,52,0.22)] bg-[rgba(22,101,52,0.08)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#166534]",
  profileVisibilityStrip:
    "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[rgba(138,99,36,0.10)] bg-[#FBF7EF]/80 px-3 py-2 sm:px-3.5",
  profileVisibilityLabel: "text-xs font-semibold text-[#17130E]",
  profileVisibilityHelper: "text-[10px] leading-snug text-[#6B6255]",
  profileVisibilityPill:
    "inline-flex items-center rounded-full bg-[rgba(22,101,52,0.10)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#166534] ring-1 ring-[rgba(22,101,52,0.18)]",
  profileVisibilityPillHidden:
    "inline-flex items-center rounded-full bg-[rgba(107,98,85,0.10)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6B6255] ring-1 ring-[rgba(107,98,85,0.18)]",
  commandHeaderChips: "flex flex-wrap items-center gap-1.5",
  commandHeaderChip:
    "inline-flex items-center rounded-full border border-[rgba(138,99,36,0.14)] bg-[#FFF9EA] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6B6255]",
  commandHeaderChipAccent:
    "inline-flex items-center rounded-full border border-[rgba(201,164,77,0.28)] bg-[rgba(201,164,77,0.10)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A6324]",
  tabBodySurface:
    "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-[rgba(138,99,36,0.10)] bg-[#FBF7EF]",
  tabBodyInner: "min-h-0 flex-1 p-3 sm:p-4 lg:p-5",
  directoryListColumn:
    "flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-x-hidden lg:min-h-[28rem] lg:basis-[42%] lg:max-w-none lg:shrink-0",
  directoryDetailColumn:
    "flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 overflow-x-hidden lg:min-h-[28rem] lg:basis-[58%] lg:gap-2.5",
  discoveryListRegion:
    "min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain lg:min-h-[16rem] lg:max-h-full",
  discoveryMapRegion:
    "min-h-0 min-w-0 shrink-0 lg:max-h-[8.5rem]",
  flatPanelHeader:
    "shrink-0 space-y-2 border-b border-[rgba(138,99,36,0.08)] pb-3",
  mobileViewToggle: `${lt.viewTabsControl} items-center`,
  mobileViewToggleItem: `${lt.viewTabsItem} inline-flex min-h-9 items-center justify-center gap-1.5 px-3 py-2 text-xs leading-none capitalize sm:flex-none`,
  mobileViewToggleItemActive: lt.viewTabsItemActive,
  mapPreviewPanel:
    "relative flex min-h-[7rem] max-h-[8.5rem] flex-col overflow-hidden rounded-lg border border-[rgba(138,99,36,0.12)] bg-[#EDE6D4] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:min-h-[7.5rem]",
  mapPreviewCanvas:
    "pointer-events-none absolute inset-0 overflow-hidden",
  mapPreviewGrid:
    "absolute inset-0 bg-[linear-gradient(rgba(138,99,36,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(138,99,36,0.07)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_45%,black_15%,transparent_72%)]",
  mapPreviewRoads:
    "absolute inset-0 opacity-60 [background:repeating-linear-gradient(118deg,transparent,transparent_38px,rgba(138,99,36,0.05)_38px,rgba(138,99,36,0.05)_39px),repeating-linear-gradient(28deg,transparent,transparent_52px,rgba(201,164,77,0.06)_52px,rgba(201,164,77,0.06)_53px)]",
  mapPreviewGlow:
    "absolute left-1/2 top-[42%] h-[70%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(201,164,77,0.18)_0%,rgba(201,164,77,0.06)_42%,transparent_72%)]",
  mapPreviewRing:
    "absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(201,164,77,0.14)]",
  mapPreviewRingOuter: "h-[min(58%,5.5rem)] w-[min(58%,5.5rem)]",
  mapPreviewRingInner:
    "h-[min(38%,3.5rem)] w-[min(38%,3.5rem)] border-[rgba(201,164,77,0.10)]",
  mapPreviewContent:
    "relative z-[1] flex flex-1 flex-col justify-between px-3 py-2 sm:px-3 sm:py-2",
  mapPreviewHeader: "flex items-start gap-2",
  mapPreviewIcon:
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FFF9EA] text-[#8A6324] shadow-[0_1px_4px_rgba(138,99,36,0.10)] ring-1 ring-[rgba(138,99,36,0.12)]",
  mapPreviewTitle: "text-xs font-bold text-[#17130E]",
  mapPreviewSubtitle: "mt-0.5 text-[10px] leading-snug text-[#6B6255]",
  mapPreviewMessage: "mt-1 text-[10px] leading-snug text-[#4F4638]",
  mapPreviewPill:
    "inline-flex items-center rounded-full border border-[rgba(138,99,36,0.10)] bg-[rgba(255,249,234,0.82)] px-2.5 py-0.5 text-[10px] font-semibold text-[#6B6255] backdrop-blur-[1px]",
  mapPreviewHint:
    "mt-3 inline-flex w-fit items-center rounded-lg border border-dashed border-[rgba(138,99,36,0.22)] bg-[rgba(255,249,234,0.75)] px-2.5 py-1 text-[10px] font-medium text-[#8A6324] backdrop-blur-[1px]",
  mapPreviewAreasLabel:
    "text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8A6324]",
  mapPreviewAreaChip:
    "inline-flex max-w-full items-center truncate rounded-full border border-[rgba(201,164,77,0.22)] bg-[rgba(255,249,234,0.88)] px-2.5 py-0.5 text-[10px] font-medium text-[#4F4638] backdrop-blur-[1px]",
  mapPreviewMeta: "text-[10px] text-[#6B6255]",
  mapPreviewFooter: "mt-auto space-y-1.5 pt-1.5",
  cardShell:
    "group/card relative rounded-lg border border-[rgba(138,99,36,0.10)] bg-[#FBF7EF] px-2 py-1.5 transition-colors hover:border-[rgba(201,164,77,0.24)] hover:bg-[#FFFDF5]",
  cardShellSelected:
    "group/card relative rounded-lg border border-[rgba(201,164,77,0.45)] bg-[#FFF9EA] px-2 py-1.5 shadow-[0_1px_6px_rgba(138,99,36,0.08)] ring-1 ring-[rgba(201,164,77,0.28)] transition-colors",
  rosterRowChevron:
    "ml-1 shrink-0 self-center text-[#8A6324] opacity-0 transition-all group-hover/card:opacity-70 group-data-[selected=true]/card:opacity-100",
  rosterRowChevronActive: "translate-x-0.5 opacity-100 text-[#6B4E1A]",
  rosterList: "flex min-w-0 flex-col gap-0.5 divide-y divide-[rgba(138,99,36,0.06)]",
  rosterListMyNetwork: "flex min-w-0 flex-col gap-0.5 divide-y divide-[rgba(138,99,36,0.06)]",
  rosterSectionHeader: "flex shrink-0 items-baseline justify-between gap-2 pb-1",
  emptyStateStrong: "rounded-xl border border-[rgba(138,99,36,0.10)] bg-[#FFF9EA]/60 px-4 py-8 text-center sm:py-9",
  emptyStateCta: lt.primaryAction,
  referralInboxHeader: "mb-4 space-y-1",
  invitationCardGrid: "grid gap-3 lg:grid-cols-2",
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
  workspaceStack:
    "network-north-star-workspace flex min-h-0 min-w-0 flex-1 flex-col space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain px-3 pb-12 sm:space-y-3.5 sm:px-3.5 sm:pb-14 lg:px-5 lg:pb-16",
} as const;

export const st = networkNorthStarStyles;

export type NetworkSurface = "legacy" | "north-star";
