/**
 * Shared Mission Briefing class tokens for the Leads list surface.
 * Aligned with Customers MC v2 paper register.
 */
export const leadMissionClasses = {
  filterRegion:
    "leads-mission-filter-region shrink-0 border-b border-altair-border/70 bg-altair-paper-subtle/80",
  filterSearchBand: "px-3 pb-3 pt-2 sm:px-4",
  searchInput:
    "h-11 w-full min-h-11 rounded-xl border border-altair-border bg-altair-paper-elevated py-1.5 pl-9 pr-3 text-sm text-altair-ink-on-paper placeholder:text-altair-ink-on-paper-muted outline-none transition-colors hover:border-altair-border-strong focus-visible:border-altair-border-strong focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated md:h-10 md:min-h-10",
  filterSelect:
    "h-11 w-full min-h-11 appearance-none rounded-xl border border-altair-border bg-altair-paper-elevated py-1.5 pl-3 pr-8 text-sm font-medium text-altair-ink-on-paper outline-none transition-colors hover:border-altair-border-strong focus-visible:border-altair-border-strong focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated sm:w-auto sm:pr-10 md:h-10 md:min-h-10",
  filterIcon: "text-altair-ink-on-paper-muted",
  filterMeta: "mt-1.5 text-[11px] text-altair-ink-on-paper-muted sm:text-xs",
  listShell: "leads-mission-list",
  primaryText: "truncate text-sm font-semibold text-altair-ink-on-paper",
  secondaryText: "text-sm text-altair-ink-on-paper-secondary",
  mutedText: "text-sm text-altair-ink-on-paper-muted",
} as const;
