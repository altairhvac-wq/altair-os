import {
  altairReportCardClass,
  altairReportMetricLabelClass,
  altairReportTileClass,
} from "@/shared/design-system/components/report-surface";

/**
 * Dispatch board chrome — deliberate dark elevated register (Reports-adjacent).
 * Exception to Mission Control v2 light paper for this page only.
 * Reuses Graphite / report-surface tokens — no parallel hex vocabulary.
 */
export const dispatchMissionClasses = {
  pageCanvas:
    "rounded-xl bg-altair-ink text-altair-paper sm:rounded-2xl",

  filterRegion:
    "dispatch-mission-filter-region shrink-0 border-b border-altair-border/70 bg-white/[0.03]",
  filterSearchBand: "px-3 pb-3 pt-2 sm:px-4",
  searchInput:
    "h-11 w-full min-h-11 rounded-xl border border-altair-border bg-altair-graphite py-1.5 pl-9 pr-3 text-sm text-altair-paper placeholder:text-altair-ink-muted outline-none transition-colors hover:border-altair-border-strong focus-visible:border-altair-brass/50 focus-visible:ring-2 focus-visible:ring-altair-brass/35 focus-visible:ring-offset-2 focus-visible:ring-offset-altair-ink md:h-10 md:min-h-10",
  filterSelect:
    "h-11 w-full min-h-11 appearance-none rounded-xl border border-altair-border bg-altair-graphite py-1.5 pl-9 pr-8 text-sm font-medium text-altair-paper outline-none transition-colors hover:border-altair-border-strong focus-visible:border-altair-brass/50 focus-visible:ring-2 focus-visible:ring-altair-brass/35 focus-visible:ring-offset-2 focus-visible:ring-offset-altair-ink sm:w-auto sm:pr-10 md:h-10 md:min-h-10",
  filterIcon: "text-altair-ink-muted",
  filterMeta: "mt-1.5 text-[11px] text-altair-ink-muted sm:text-xs",

  boardSurface: `${altairReportCardClass} relative flex min-h-0 min-w-0 max-w-full flex-col overflow-hidden md:flex-1`,
  boardEmphasisRing: "ring-2 ring-altair-brass/30",
  boardHeader:
    "flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-altair-border px-3 py-2 sm:px-4",
  boardHeaderTitle:
    "text-sm font-bold tracking-tight text-altair-paper sm:text-base",
  boardHeaderSubtitle:
    "mt-0.5 hidden text-xs text-altair-ink-muted sm:block",
  /** Viewport-fill workbench: no page scroll — children claim remaining height. */
  boardBody:
    "flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden bg-altair-ink/60 px-2 py-2 sm:px-3 sm:py-2.5",

  focusBanner:
    "flex shrink-0 flex-wrap items-start justify-between gap-2 rounded-lg border border-altair-warning/35 bg-altair-warning/10 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3",
  focusBannerIcon:
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-altair-warning/20 text-altair-warning sm:h-9 sm:w-9",
  focusBannerTitle: "text-xs font-bold text-altair-paper sm:text-sm",
  focusBannerDescription:
    "mt-0.5 hidden text-[11px] leading-snug text-altair-ink-muted sm:mt-1 sm:block sm:text-xs sm:leading-relaxed",
  focusBannerClear:
    "inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-altair-warning transition-colors hover:text-altair-paper",

  /** Technician Gantt row — no overflow clip so sticky identity can pin while scrolling. */
  lane: `${altairReportCardClass} flex min-w-0 items-stretch`,
  laneHeader:
    "sticky left-0 z-20 flex h-full w-[10.5rem] shrink-0 flex-col justify-center overflow-hidden border-r border-altair-border bg-altair-graphite px-2 py-1 sm:w-44 sm:px-2.5 lg:w-48",
  laneHeaderAvatar:
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-altair-brass/20 text-[9px] font-bold text-altair-brass ring-1 ring-altair-brass/30",
  laneHeaderName:
    "truncate text-[11px] font-bold leading-tight tracking-tight text-altair-paper sm:text-[12px]",
  laneHeaderRole: "truncate text-[9px] leading-tight text-altair-ink-muted",
  laneHeaderStatusLabel: "text-[9px] font-medium leading-none text-altair-paper/70",
  laneHeaderNextJob:
    "hidden text-[9px] font-medium leading-none text-altair-ink-muted xl:inline",
  laneHeaderCount:
    "rounded-full border border-altair-border bg-white/[0.06] px-1 py-px text-[9px] font-semibold leading-none tabular-nums text-altair-paper",
  laneTrack: "relative min-h-0 min-w-0 flex-1 bg-white/[0.02]",
  laneEmptyText: "text-[10px] font-medium text-altair-ink-muted sm:text-[11px]",
  laneEmptyOverlay:
    "pointer-events-none absolute inset-y-0 left-4 z-[5] flex items-center px-1",
  laneEmptyPill:
    "rounded-md border border-dashed border-altair-border/70 bg-altair-graphite/80 px-2 py-0.5 text-center text-[9px] font-medium text-altair-ink-muted",

  unassignedSidebar: `${altairReportCardClass} flex max-h-[18rem] w-full shrink-0 flex-col overflow-hidden border-altair-warning/40 lg:max-h-none lg:h-full lg:min-h-0 lg:w-[15.5rem] xl:w-[16.5rem]`,
  unassignedSidebarEmphasis: `${altairReportCardClass} flex max-h-[18rem] w-full shrink-0 flex-col overflow-hidden border-altair-warning/55 ring-1 ring-altair-warning/25 lg:max-h-none lg:h-full lg:min-h-0 lg:w-[15.5rem] xl:w-[16.5rem]`,
  unassignedSidebarHeader:
    "flex shrink-0 items-center gap-2 border-b border-altair-warning/30 bg-altair-warning/10 px-2.5 py-2 sm:px-3",
  unassignedSidebarIcon:
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-altair-warning/20 text-altair-warning sm:h-8 sm:w-8",
  unassignedSidebarTitle: "text-sm font-bold text-altair-paper",
  unassignedSidebarSubtitle: "text-[10px] text-altair-ink-muted sm:text-[11px]",
  unassignedSidebarCount:
    "rounded-full border border-altair-warning/35 bg-altair-warning/20 px-2 py-0.5 text-[11px] font-bold tabular-nums text-altair-warning",
  unassignedSidebarList:
    "min-h-0 flex-1 overflow-y-auto overscroll-contain border-0 border-t border-altair-border/50",
  unassignedSidebarRow:
    "w-full border-b border-altair-border/50 px-2.5 py-2 text-left transition-colors last:border-b-0 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-altair-brass/35",
  unassignedSidebarRowSelected: "bg-altair-information/15 hover:bg-altair-information/20",
  unassignedSidebarEmpty:
    "flex flex-1 items-center justify-center px-3 py-6 text-center",

  timeAxisHeader:
    "sticky top-0 z-30 flex border-b border-altair-border bg-altair-graphite",
  timeAxisSpacer:
    "sticky left-0 z-40 w-[10.5rem] shrink-0 border-r border-altair-border bg-altair-graphite sm:w-44 lg:w-48",
  timeAxisTrack: "relative min-w-0 flex-1",
  timeAxisLabel: `${altairReportMetricLabelClass} absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-altair-ink-muted`,
  timeAxisLabelShoulder: "opacity-50",
  timeAxisHeaderHeight: "h-9 sm:h-10",

  /** Contained Gantt scrollport — vertical for roster, horizontal for time axis. */
  timeGridScroll:
    "min-h-0 min-w-0 max-w-full flex-1 overflow-auto overscroll-contain",
  timeGridInner: "flex min-w-full flex-col gap-1 pb-1",
  hourLine:
    "pointer-events-none absolute inset-y-0 border-l border-altair-border/55",
  hourLineShoulder:
    "pointer-events-none absolute inset-y-0 border-l border-dashed border-altair-border/35",
  nowLine:
    "pointer-events-none absolute inset-y-0 z-30 border-l-2 border-altair-danger",
  nowDot:
    "absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-altair-danger",

  /** Compact inline KPIs opposite the board title. */
  metricStrip:
    "flex shrink-0 flex-wrap items-stretch justify-end gap-1 sm:gap-1.5",
  metricTile: `${altairReportTileClass} min-w-[4.25rem] px-2 py-1 sm:min-w-[4.75rem] sm:px-2.5 sm:py-1.5`,
  metricLabel: altairReportMetricLabelClass,
  metricValue:
    "truncate text-sm font-extrabold tracking-tight tabular-nums leading-none text-altair-paper sm:text-base",

  headerTitle: "min-w-0 text-base font-bold tracking-tight text-altair-paper sm:shrink-0 sm:text-lg",
  headerSubtitle: "min-w-0 text-xs leading-snug text-altair-ink-muted sm:truncate",

  /**
   * Fixed map band above the Gantt. Cap with vh so short viewports still leave
   * a usable technician scrollport (roster grows inside timeGridScroll).
   */
  mapFrame:
    "relative h-[min(14rem,26vh)] w-full shrink-0 overflow-hidden rounded-lg border border-altair-border bg-altair-graphite sm:h-[min(16rem,28vh)] lg:h-[min(18rem,30vh)]",
  mapStatus:
    "absolute inset-x-0 bottom-0 z-10 border-t border-altair-border/70 bg-altair-graphite/90 px-3 py-2 text-[11px] text-altair-ink-muted backdrop-blur-sm sm:text-xs",
  mapEmpty:
    "flex h-full min-h-0 w-full flex-col items-center justify-center gap-2 bg-altair-graphite/60 px-4 text-center",
} as const;
