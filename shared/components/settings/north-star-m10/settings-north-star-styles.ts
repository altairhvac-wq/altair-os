import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";

export const settingsNorthStarStyles = {
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
  sectionTitle: "mt-0.5 text-sm font-bold text-[#17130E]",
  sectionSubtitle: "mt-0.5 text-[11px] leading-snug text-[#4F4638]",
  summaryCard:
    "min-w-0 rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] p-3 shadow-[0_2px_8px_rgba(138,99,36,0.08)] sm:p-3.5",
  summaryLabel:
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4F4638]",
  summaryValue: "mt-1 truncate text-base font-bold text-[#17130E]",
  summaryMeta: "mt-0.5 text-xs text-[#4F4638]",
  summaryIconWrap:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)] [&_svg]:text-[#8A6324]",
  panelAction:
    "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(138,99,36,0.22)] bg-[#FFF9EA] px-2.5 text-xs font-semibold text-[#4F4638] transition-colors hover:border-[#C9A44D] hover:bg-[#F3EBDD] [&_svg]:text-[#8A6324]",
  panelActionAccent:
    "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#E6D092] bg-gradient-to-b from-[#E6D092] from-0% via-[#C9A44D] via-[45%] to-[#B88A2E] to-100% px-2.5 text-xs font-semibold text-[#17130E] shadow-[0_2px_8px_rgba(138,99,36,0.22)] transition-all hover:from-[#F0E4B8] hover:via-[#D4B05A] hover:to-[#9A7028] [&_svg]:text-[#17130E]",
  systemCheckLink:
    "flex min-w-0 items-center justify-between gap-3 rounded-[1rem] border border-[rgba(138,99,36,0.14)] bg-[#FFF9EA] px-3 py-3 transition-colors hover:border-[rgba(201,164,77,0.35)] hover:bg-[#F3EBDD] sm:px-4 sm:py-3.5",
  systemCheckIconWrap:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)] [&_svg]:text-[#8A6324]",
  systemCheckTitle: "text-sm font-semibold text-[#17130E]",
  systemCheckDescription: "text-xs leading-snug text-[#4F4638] sm:text-sm",
  systemCheckBadge:
    "shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A6324]",
  statusChipCurrent:
    "inline-flex items-center rounded-full bg-[rgba(138,99,36,0.07)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#4F4638] ring-1 ring-[rgba(138,99,36,0.12)]",
  statusChipReview:
    "inline-flex items-center rounded-full bg-[rgba(138,99,36,0.10)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#8A6324] ring-1 ring-[rgba(138,99,36,0.16)]",
  ivoryCardShell:
    "min-w-0 max-w-full overflow-x-clip rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF]",
  ivoryCardHeader:
    "border-b border-[rgba(138,99,36,0.12)] bg-[#F5F0E4] px-3 py-3 sm:px-4",
  ivoryCardBody: "px-3 py-3 sm:px-4",
  formInput:
    "w-full min-h-10 rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-3 py-2 text-sm text-[#17130E] placeholder:text-[#4F4638] outline-none transition-colors focus:border-[#B88A2E] focus:bg-[#FBF7EF] focus:ring-2 focus:ring-[rgba(201,164,77,0.22)] sm:min-h-[44px] sm:py-2.5",
  formTextarea:
    "w-full min-h-[80px] max-w-full resize-y rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-3 py-2 text-sm text-[#17130E] placeholder:text-[#4F4638] outline-none transition-colors focus:border-[#B88A2E] focus:bg-[#FBF7EF] focus:ring-2 focus:ring-[rgba(201,164,77,0.22)] sm:min-h-[96px] sm:py-2.5",
  formLabel: "mb-1 block text-xs font-semibold text-[#4F4638]",
  saveButton:
    "inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-[#E6D092] bg-gradient-to-b from-[#E6D092] from-0% via-[#C9A44D] via-[45%] to-[#B88A2E] to-100% px-4 py-2 text-sm font-semibold text-[#17130E] shadow-[0_2px_10px_rgba(138,99,36,0.28)] transition-all hover:from-[#F0E4B8] hover:via-[#D4B05A] hover:to-[#9A7028] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[44px] sm:w-auto sm:py-2.5",
} as const;

export const st = settingsNorthStarStyles;
