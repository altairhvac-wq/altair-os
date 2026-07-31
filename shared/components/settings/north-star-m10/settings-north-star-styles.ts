import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
import {
  fieldControlClass,
  fieldLabelClass,
  fieldTextareaClass,
} from "@/shared/design-system/components/field-styles";

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
  panelAction: buttonClassName("secondary", "sm", "shrink-0"),
  panelActionAccent: buttonClassName("primary", "sm", "shrink-0"),
  systemCheckLink:
    "flex min-w-0 items-center justify-between gap-3 rounded-[1rem] border border-[rgba(138,99,36,0.14)] bg-[#FFF9EA] px-3 py-3 transition-colors hover:border-[rgba(201,164,77,0.35)] hover:bg-[#F3EBDD] sm:px-4 sm:py-3.5",
  systemCheckIconWrap:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)] [&_svg]:text-[#8A6324]",
  systemCheckTitle: "text-sm font-semibold text-[#17130E]",
  systemCheckDescription: "text-xs leading-snug text-[#4F4638] sm:text-sm",
  systemCheckBadge:
    "shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A6324]",
  subNavBand:
    "settings-north-star-subnav shrink-0 border-b border-[rgba(138,99,36,0.12)] pb-3",
  subNavControl:
    "flex w-full items-stretch gap-0.5 overflow-x-auto overscroll-x-contain rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#EFE4CB] p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  subNavItem:
    "inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-semibold text-[#4F4638] transition-colors hover:text-[#17130E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(201,164,77,0.40)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EFE4CB] sm:px-3",
  subNavItemActive:
    "bg-[#FFF9EA] text-[#17130E] shadow-[0_1px_3px_rgba(138,99,36,0.12)] ring-1 ring-[rgba(138,99,36,0.14)]",
  subNavDivider:
    "mx-0.5 my-1.5 w-px shrink-0 self-stretch bg-[rgba(138,99,36,0.22)]",
  statusChipCurrent:
    "inline-flex items-center rounded-full bg-[rgba(138,99,36,0.07)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#4F4638] ring-1 ring-[rgba(138,99,36,0.12)]",
  statusChipReview:
    "inline-flex items-center rounded-full bg-[rgba(138,99,36,0.10)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#8A6324] ring-1 ring-[rgba(138,99,36,0.16)]",
  ivoryCardShell:
    "min-w-0 max-w-full overflow-x-clip rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF]",
  ivoryCardHeader:
    "border-b border-[rgba(138,99,36,0.12)] bg-[#F5F0E4] px-3 py-3 sm:px-4",
  ivoryCardBody: "px-3 py-3 sm:px-4",
  formInput: fieldControlClass,
  formTextarea: fieldTextareaClass,
  formLabel: fieldLabelClass,
  saveButton: buttonClassName("primary", "md", "w-full sm:w-auto"),
} as const;

export const st = settingsNorthStarStyles;
