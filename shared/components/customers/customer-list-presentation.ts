import { isCustomerArchived, isCustomerDeleted } from "@/shared/lib/customer-lifecycle";
import { formatDate, type Customer } from "@/shared/types/customer";
import { buttonClassName } from "@/shared/design-system/components/button-styles";
import { isCustomerMissingImportantInfo } from "./customer-work-queues";

/**
 * Presentation helpers for the Customers list — Mission Briefing language.
 * Display-only cues derived from existing customer fields; no data/logic changes.
 */

export type CustomerListCueTone = "neutral" | "warning";

export type CustomerListCue = {
  label: string;
  tone: CustomerListCueTone;
};

/** Quiet “what next?” line for list scanability. */
export function resolveCustomerListCue(customer: Customer): CustomerListCue {
  if (isCustomerDeleted(customer)) {
    return { label: "In trash", tone: "warning" };
  }

  if (isCustomerArchived(customer)) {
    return { label: "Archived", tone: "neutral" };
  }

  if (isCustomerMissingImportantInfo(customer)) {
    return { label: "Complete profile", tone: "warning" };
  }

  if (customer.status === "inactive") {
    return { label: "Inactive", tone: "neutral" };
  }

  if (!customer.lastServiceDate) {
    return { label: "No service yet", tone: "neutral" };
  }

  return {
    label: `Last service ${formatDate(customer.lastServiceDate)}`,
    tone: "neutral",
  };
}

/** Shared Mission Briefing class tokens for the Customers list surface. */
export const customerMissionClasses = {
  filterRegion:
    "customer-mission-filter-region shrink-0 border-b border-altair-border/70 bg-altair-paper-subtle/80",
  filterTabsBand: "px-3 pt-2.5 sm:px-4",
  filterSearchBand: "px-3 pb-3 pt-2 sm:px-4",
  searchInput:
    "h-11 w-full min-h-11 rounded-lg border border-altair-border bg-altair-paper-elevated py-1.5 pl-9 pr-3 text-sm text-altair-ink-on-paper placeholder:text-altair-ink-on-paper-muted outline-none transition-colors focus:border-altair-brass focus:ring-2 focus:ring-altair-brass/25 md:h-10 md:min-h-10",
  filterSelect:
    "h-11 w-full min-h-11 appearance-none rounded-lg border border-altair-border bg-altair-paper-elevated py-1.5 pl-9 pr-8 text-sm font-medium text-altair-ink-on-paper outline-none transition-colors focus:border-altair-brass focus:ring-2 focus:ring-altair-brass/25 sm:w-auto sm:pr-10 md:h-10 md:min-h-10",
  filterIcon: "text-altair-ink-on-paper-muted",
  filterMeta: "mt-1.5 text-[11px] text-altair-ink-on-paper-muted sm:text-xs",
  listShell: "customer-mission-list",
  primaryText: "truncate text-sm font-semibold text-altair-ink-on-paper",
  secondaryText: "truncate text-xs text-altair-ink-on-paper-muted",
  metaText: "text-sm text-altair-ink-on-paper-secondary",
  cueNeutral: "text-sm text-altair-ink-on-paper-secondary",
  cueWarning: "text-sm font-medium text-altair-warning-foreground",
  avatar:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-altair-stone text-xs font-bold text-altair-ink-on-paper ring-1 ring-altair-border",
  badgeDeleted:
    "inline-flex shrink-0 rounded-full bg-altair-warning-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-altair-warning-foreground ring-1 ring-altair-warning/20",
  badgeArchived:
    "inline-flex shrink-0 rounded-full bg-altair-paper-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-altair-ink-on-paper-secondary ring-1 ring-altair-border",
  bulkBar:
    "sticky bottom-0 z-20 border-t border-altair-border bg-altair-paper/95 px-3 py-3 shadow-[0_-8px_24px_-12px_rgba(3,7,12,0.12)] backdrop-blur-sm sm:px-4",
  bulkBarTitle: "text-sm font-semibold text-altair-ink-on-paper",
  bulkClearButton: buttonClassName("quiet", "sm", "shrink-0"),
  bulkSecondaryAction: buttonClassName("secondary", "sm"),
  bulkPrimaryAction: buttonClassName("primary", "sm"),
  bulkDestructiveAction: buttonClassName("destructive", "sm"),
} as const;
