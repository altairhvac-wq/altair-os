import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";

export const platformNorthStarStyles = {
  pageCanvas: lt.pageCanvas,
  pageHeader: lt.pageHeader,
  pageHeaderEyebrow: lt.pageHeaderEyebrow,
  pageHeaderTitle: lt.pageHeaderTitle,
  pageHeaderSubtitle: lt.pageHeaderSubtitle,
  primaryAction: lt.primaryAction,
  secondaryAction: lt.secondaryAction,
  workspaceStack:
    "platform-north-star-workspace min-w-0 space-y-3 px-3 pb-16 sm:space-y-3.5 sm:px-3.5 sm:pb-20 lg:px-5 lg:pb-24",
  sectionSurface: "north-star-list-surface overflow-hidden rounded-[1.25rem]",
  sectionEyebrow:
    "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A6324]",
  sectionTitle: "text-sm font-bold text-[#17130E]",
  sectionSubtitle: "text-[11px] leading-snug text-[#6B6255]",
  panelHeader:
    "shrink-0 border-b border-[rgba(138,99,36,0.12)] bg-[#F5F0E4] px-3 py-2.5 sm:px-4 lg:px-5",
  metricCard:
    "min-w-0 rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] p-3 shadow-[0_2px_8px_rgba(138,99,36,0.08)] sm:p-3.5",
  metricLabel:
    "text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6255]",
  metricValue: "mt-1 text-lg font-bold tabular-nums text-[#17130E] sm:text-xl",
  metricIconWrap:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)] [&_svg]:text-[#8A6324]",
  noticeShell:
    "rounded-[1rem] border border-[rgba(138,99,36,0.16)] bg-[#FBF7EF] px-3.5 py-3 sm:px-4",
  noticeTitle: "text-sm font-semibold text-[#17130E]",
  noticeBody: "mt-0.5 text-xs leading-snug text-[#4F4638]",
  noticeIcon: "mt-0.5 h-4 w-4 shrink-0 text-[#8A6324]",
  diagnosticsShell:
    "rounded-[1rem] border border-[rgba(180,83,9,0.22)] bg-[#FFF7ED] px-3.5 py-3 sm:px-4",
  diagnosticsTitle: "text-sm font-semibold text-[#9A3412]",
  diagnosticsItem: "text-xs leading-snug text-[#9A3412]",
  attentionShell:
    "rounded-[1rem] border border-[rgba(180,83,9,0.18)] bg-[#FFF9EA] px-3.5 py-3 sm:px-4",
  attentionTitle: "text-sm font-semibold text-[#17130E]",
  attentionBody: "mt-0.5 text-xs text-[#4F4638]",
  toolLink:
    "flex min-w-0 items-center justify-between gap-3 rounded-[1rem] border border-[rgba(138,99,36,0.14)] bg-[#FFF9EA] px-3 py-3 transition-colors hover:border-[rgba(201,164,77,0.35)] hover:bg-[#F3EBDD] sm:px-4 sm:py-3.5",
  toolIconWrap:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)] [&_svg]:text-[#8A6324]",
  toolTitle: "text-sm font-semibold text-[#17130E]",
  toolDescription: "text-xs leading-snug text-[#6B6255] sm:text-sm",
  toolBadge:
    "shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A6324]",
  listPrimary: "truncate text-sm font-semibold text-[#17130E]",
  listSecondary: "truncate text-xs text-[#4F4638]",
  listMeta: "shrink-0 text-xs text-[#6B6255]",
  listDivider: "divide-y divide-[rgba(138,99,36,0.12)]",
  tableWrap: "overflow-x-auto",
  tableHead: lt.tableHeaderRow,
  tableHeadCell: "whitespace-nowrap px-3 py-2",
  tableBody: "divide-y divide-[rgba(138,99,36,0.12)] bg-[#FBF7EF]",
  tableRow: "text-[#17130E]",
  tableCell: "px-3 py-2.5 text-sm",
  tableCellMuted: "px-3 py-2.5 text-xs text-[#4F4638]",
  tableCellTruncate: "max-w-[10rem] truncate px-3 py-2.5",
  tableLink:
    "text-xs font-semibold text-[#8A6324] transition-colors hover:text-[#6B5A2E] hover:underline",
  debugId: "font-mono text-[10px] text-[#6B6255]",
  emptyCopy: "text-sm text-[#4F4638]",
  emptyTitle: "text-sm font-semibold text-[#17130E]",
  emptyDescription: "mt-1 text-xs text-[#6B6255]",
  severityBadge:
    "inline-flex rounded-full bg-[rgba(185,28,28,0.08)] px-2 py-0.5 text-xs font-semibold text-[#991B1B] ring-1 ring-[rgba(185,28,28,0.16)]",
  panelAction: lt.secondaryAction,
  subNavBand:
    "platform-north-star-subnav shrink-0 border-b border-[rgba(138,99,36,0.12)] bg-[#F5F0E4] px-3 py-2 sm:px-3.5 lg:px-5",
  subNavControl:
    "flex w-full flex-wrap gap-1 rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#EFE4CB] p-0.5 sm:w-auto",
  subNavItem:
    "inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-[#4F4638] transition-colors hover:text-[#17130E] sm:flex-none",
  subNavItemActive:
    "bg-[#FFF9EA] text-[#17130E] shadow-[0_1px_3px_rgba(138,99,36,0.12)] ring-1 ring-[rgba(138,99,36,0.14)]",
} as const;

export const pt = platformNorthStarStyles;
