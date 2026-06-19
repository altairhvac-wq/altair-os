"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  Clock,
  Filter,
  Plus,
  Search,
} from "lucide-react";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetFooter,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
} from "@/shared/components/ui/mobile-sheet";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import {
  ESTIMATE_LIFECYCLE_FILTER_OPTIONS,
  ESTIMATE_STATUS_OPTIONS,
  type Estimate,
  type EstimateLifecycleState,
  type EstimateStatus,
} from "@/shared/types/estimate";
import { EstimateStatusBadge } from "./EstimateStatusBadge";
import { filterEstimatesByArchiveQuery } from "./estimates-north-star-mobile-owner-search";
import { sortEstimatesForOwnerView } from "./estimates-north-star-mobile-owner-sort";
import {
  estimatesOwnerMobileArchiveHelperClass,
  estimatesOwnerMobileArchiveInputClass,
  estimatesOwnerMobileArchiveSearchIconClass,
  estimatesOwnerMobileRowAmountClass,
  estimatesOwnerMobileRowChevronClass,
  estimatesOwnerMobileRowDateClass,
  estimatesOwnerMobileRowMetaClass,
  estimatesOwnerMobileSearchResultsMetaClass,
  estimatesOwnerMobileSectionLabelClass,
  estimatesOwnerMobileSectionMetaClass,
} from "./estimates-north-star-mobile-owner-styles";
import {
  ownerMobileArchiveResultRowClass,
  ownerMobileEmptyCardClass,
  ownerMobileFiltersButtonClass,
  ownerMobileHeroCardClass,
  ownerMobileHeroPrimaryActionClass,
  ownerMobileScrollContentClass,
  ownerMobileUpNextRowClass,
} from "@/shared/components/jobs/jobs-north-star-mobile-owner-styles";

const FILTER_SHEET_TITLE_ID = "estimates-owner-mobile-filters-title";
const UP_NEXT_LIMIT = 5;

type EstimatesNorthStarMobileOwnerViewProps = {
  attentionEstimates: Estimate[];
  archiveEstimates: Estimate[];
  openCount: number;
  totalAttentionCount: number;
  hasNoEstimates: boolean;
  hasActiveFilters: boolean;
  companyTimeZone?: string;
  statusFilter: EstimateStatus | "all";
  lifecycleFilter: EstimateLifecycleState;
  showLifecycleFilter: boolean;
  canCreateEstimate: boolean;
  needsCustomers: boolean;
  onSelectEstimate: (estimate: Estimate) => void;
  onCreateEstimate?: () => void;
  onStatusFilterChange: (value: EstimateStatus | "all") => void;
  onLifecycleFilterChange: (value: EstimateLifecycleState) => void;
  onClearFilters: () => void;
};

function formatEstimateDateLine(
  estimate: Estimate,
  timeZone?: string,
): string {
  if (estimate.sentAt) {
    return `Sent ${formatDate(estimate.sentAt, timeZone)}`;
  }

  return `Created ${formatDate(estimate.createdAt, timeZone)}`;
}

type OwnerAttentionHeroCardProps = {
  estimate: Estimate;
  companyTimeZone?: string;
  onSelectEstimate: (estimate: Estimate) => void;
};

function OwnerAttentionHeroCard({
  estimate,
  companyTimeZone,
  onSelectEstimate,
}: OwnerAttentionHeroCardProps) {
  return (
    <article className={ownerMobileHeroCardClass}>
      <div className="space-y-4 px-5 pb-4 pt-5">
        <div className="space-y-2">
          <p className={estimatesOwnerMobileSectionLabelClass}>Needs attention</p>
          <p className="truncate text-[1.5rem] font-bold leading-tight tracking-tight text-slate-900">
            <DemoDisplayName>{estimate.customerName}</DemoDisplayName>
          </p>
          <p className="text-base font-medium text-slate-600">
            {estimate.estimateNumber}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <EstimateStatusBadge status={estimate.status} />
        </div>

        <div className="space-y-2 text-[15px] leading-snug text-slate-600">
          <p className="text-lg font-semibold tabular-nums text-slate-800">
            {formatCurrency(estimate.total)}
          </p>
          <p className="flex items-start gap-2.5">
            <Clock
              className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 text-slate-400"
              aria-hidden
            />
            <span className="font-medium text-slate-700">
              {formatEstimateDateLine(estimate, companyTimeZone)}
            </span>
          </p>
          {estimate.jobNumber ? (
            <p className="text-sm text-slate-500">Job {estimate.jobNumber}</p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-slate-100/90 bg-slate-50/40 px-5 py-4">
        <button
          type="button"
          onClick={() => onSelectEstimate(estimate)}
          className={ownerMobileHeroPrimaryActionClass}
        >
          View estimate
        </button>
      </div>
    </article>
  );
}

type OwnerUpNextRowProps = {
  estimate: Estimate;
  companyTimeZone?: string;
  onSelectEstimate: (estimate: Estimate) => void;
};

function OwnerUpNextRow({
  estimate,
  companyTimeZone,
  onSelectEstimate,
}: OwnerUpNextRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelectEstimate(estimate)}
      className={ownerMobileUpNextRowClass}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-800">
            <DemoDisplayName>{estimate.customerName}</DemoDisplayName>
          </p>
          <span className={estimatesOwnerMobileRowAmountClass}>
            {formatCurrency(estimate.total)}
          </span>
        </div>
        <p className={estimatesOwnerMobileRowMetaClass}>
          {estimate.estimateNumber}
          {estimate.jobNumber ? ` · Job ${estimate.jobNumber}` : ""}
        </p>
        <div className="flex items-center gap-2 pt-0.5">
          <EstimateStatusBadge status={estimate.status} className="text-[9px]" />
          <span className={estimatesOwnerMobileRowDateClass}>
            {formatEstimateDateLine(estimate, companyTimeZone)}
          </span>
        </div>
      </div>
      <ChevronRight className={estimatesOwnerMobileRowChevronClass} aria-hidden />
    </button>
  );
}

type OwnerArchiveResultRowProps = {
  estimate: Estimate;
  companyTimeZone?: string;
  onSelectEstimate: (estimate: Estimate) => void;
};

function OwnerArchiveResultRow({
  estimate,
  companyTimeZone,
  onSelectEstimate,
}: OwnerArchiveResultRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelectEstimate(estimate)}
      className={ownerMobileArchiveResultRowClass}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-800">
            <DemoDisplayName>{estimate.customerName}</DemoDisplayName>
          </p>
          <span className={estimatesOwnerMobileRowAmountClass}>
            {formatCurrency(estimate.total)}
          </span>
        </div>
        <p className={estimatesOwnerMobileRowMetaClass}>{estimate.estimateNumber}</p>
        <div className="flex items-center gap-2 pt-0.5">
          <EstimateStatusBadge status={estimate.status} className="text-[9px]" />
          <span className={estimatesOwnerMobileRowDateClass}>
            {formatEstimateDateLine(estimate, companyTimeZone)}
          </span>
        </div>
      </div>
      <ChevronRight className={estimatesOwnerMobileRowChevronClass} aria-hidden />
    </button>
  );
}

export function EstimatesNorthStarMobileOwnerView({
  attentionEstimates,
  archiveEstimates,
  openCount,
  totalAttentionCount,
  hasNoEstimates,
  hasActiveFilters,
  companyTimeZone,
  statusFilter,
  lifecycleFilter,
  showLifecycleFilter,
  canCreateEstimate,
  needsCustomers,
  onSelectEstimate,
  onCreateEstimate,
  onStatusFilterChange,
  onLifecycleFilterChange,
  onClearFilters,
}: EstimatesNorthStarMobileOwnerViewProps) {
  const [archiveSearch, setArchiveSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isArchiveSearching = archiveSearch.trim().length >= 2;

  const archiveResults = useMemo(
    () =>
      sortEstimatesForOwnerView(
        filterEstimatesByArchiveQuery(archiveEstimates, archiveSearch),
        companyTimeZone,
      ),
    [archiveEstimates, archiveSearch, companyTimeZone],
  );

  const primaryEstimate = attentionEstimates[0] ?? null;
  const upNextEstimates = attentionEstimates.slice(1, 1 + UP_NEXT_LIMIT);

  const filterSelectClass =
    "h-10 w-full min-h-10 appearance-none rounded-xl border border-slate-200/90 bg-white py-2 pl-9 pr-8 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-[rgba(198,167,87,0.45)] focus:ring-2 focus:ring-[rgba(198,167,87,0.18)]";

  const countLine = hasActiveFilters
    ? `${attentionEstimates.length} of ${openCount} need attention`
    : `${openCount} need attention`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header
        className={`north-star-page-header flex shrink-0 items-start justify-between gap-2 sm:items-center ${lt.pageHeader}`}
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className={lt.pageHeaderEyebrow}>Quote pipeline</p>
          <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <h2 className={lt.pageHeaderTitle}>Estimates</h2>
            <p className={lt.pageHeaderSubtitle}>{countLine}</p>
          </div>
        </div>
        {canCreateEstimate && onCreateEstimate ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onCreateEstimate}
              disabled={needsCustomers}
              className={`north-star-estimates-primary-action ${lt.primaryAction} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New Estimate
            </button>
          </div>
        ) : null}
      </header>

      <div className={ownerMobileScrollContentClass}>
        {isArchiveSearching ? (
          <section className="space-y-3" aria-label="Estimate history search results">
            <div>
              <h2 className={estimatesOwnerMobileSectionLabelClass}>Search results</h2>
              <p className={estimatesOwnerMobileSearchResultsMetaClass}>
                {archiveResults.length === 0
                  ? "No matching estimates found."
                  : `${archiveResults.length} matching ${
                      archiveResults.length === 1 ? "estimate" : "estimates"
                    }`}
              </p>
            </div>

            {archiveResults.length > 0 ? (
              <div className="space-y-2">
                {archiveResults.map((estimate) => (
                  <OwnerArchiveResultRow
                    key={estimate.id}
                    estimate={estimate}
                    companyTimeZone={companyTimeZone}
                    onSelectEstimate={onSelectEstimate}
                  />
                ))}
              </div>
            ) : (
              <div className={ownerMobileEmptyCardClass}>
                <p className="text-sm font-medium text-slate-700">No matches</p>
                <p className="mt-1 text-sm text-slate-500">
                  Try an estimate number, customer name, or job number.
                </p>
              </div>
            )}
          </section>
        ) : hasNoEstimates ? (
          <div className={ownerMobileEmptyCardClass}>
            <p className="text-base font-semibold text-slate-900">No estimates yet</p>
            <p className="mt-2 text-sm text-slate-500">
              {needsCustomers
                ? "Add a customer first, then create your first quote."
                : "Create your first estimate with line items, pricing, and a valid-until date."}
            </p>
            {canCreateEstimate && onCreateEstimate && !needsCustomers ? (
              <button
                type="button"
                onClick={onCreateEstimate}
                className={`${ownerMobileHeroPrimaryActionClass} mt-5 inline-flex max-w-xs gap-2`}
              >
                <Plus className="h-4 w-4" aria-hidden />
                New Estimate
              </button>
            ) : null}
          </div>
        ) : attentionEstimates.length === 0 ? (
          <div className={ownerMobileEmptyCardClass}>
            <p className="text-base font-semibold text-slate-900">
              {totalAttentionCount > 0
                ? "No estimates match your filters"
                : "No open estimates need attention"}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {totalAttentionCount > 0
                ? "Try clearing filters or search estimate history below."
                : "Search past estimates below or create a new quote."}
            </p>
            {canCreateEstimate && onCreateEstimate && !needsCustomers ? (
              <button
                type="button"
                onClick={onCreateEstimate}
                className={`${ownerMobileHeroPrimaryActionClass} mt-5 inline-flex max-w-xs gap-2`}
              >
                <Plus className="h-4 w-4" aria-hidden />
                New Estimate
              </button>
            ) : null}
          </div>
        ) : (
          <section className="space-y-5" aria-label="Estimates needing attention">
            <div className="flex items-center justify-between gap-3">
              <h2 className={estimatesOwnerMobileSectionLabelClass}>Needs attention</h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className={ownerMobileFiltersButtonClass}
                aria-label="Open filters"
              >
                <Filter className="h-3.5 w-3.5" aria-hidden />
                Filters
                {hasActiveFilters ? (
                  <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-[#C6A757]" />
                ) : null}
              </button>
            </div>

            {primaryEstimate ? (
              <OwnerAttentionHeroCard
                estimate={primaryEstimate}
                companyTimeZone={companyTimeZone}
                onSelectEstimate={onSelectEstimate}
              />
            ) : null}

            {upNextEstimates.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <h3 className={estimatesOwnerMobileSectionLabelClass}>Up next</h3>
                  <span className={estimatesOwnerMobileSectionMetaClass}>
                    {upNextEstimates.length} more
                  </span>
                </div>
                <div className="space-y-2">
                  {upNextEstimates.map((estimate) => (
                    <OwnerUpNextRow
                      key={estimate.id}
                      estimate={estimate}
                      companyTimeZone={companyTimeZone}
                      onSelectEstimate={onSelectEstimate}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        )}

        <section className="mt-8 space-y-2" aria-label="Find past estimates">
          <label htmlFor="estimates-owner-archive-search" className="block">
            <span className={estimatesOwnerMobileSectionLabelClass}>Find past estimates</span>
            <span className={estimatesOwnerMobileArchiveHelperClass}>
              Search by estimate number, customer, status, or total.
            </span>
          </label>
          <div className="relative">
            <Search
              className={estimatesOwnerMobileArchiveSearchIconClass}
              aria-hidden
            />
            <input
              id="estimates-owner-archive-search"
              type="search"
              value={archiveSearch}
              onChange={(event) => setArchiveSearch(event.target.value)}
              placeholder="Search estimate history…"
              className={estimatesOwnerMobileArchiveInputClass}
              autoComplete="off"
            />
          </div>
        </section>
      </div>

      {filtersOpen ? (
        <MobileSheet
          onClose={() => setFiltersOpen(false)}
          ariaLabelledBy={FILTER_SHEET_TITLE_ID}
          rootClassName="lg:hidden"
        >
          <MobileSheetPanel>
            <MobileSheetHeader
              titleId={FILTER_SHEET_TITLE_ID}
              title="Filters"
              onClose={() => setFiltersOpen(false)}
              icon={
                <MobileSheetHeaderIcon className="bg-slate-100 ring-1 ring-slate-200/80">
                  <Filter className="h-5 w-5 text-slate-600" />
                </MobileSheetHeaderIcon>
              }
            />
            <MobileSheetBody className="space-y-4">
              {showLifecycleFilter ? (
                <div className="relative">
                  <Filter
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <select
                    value={lifecycleFilter}
                    onChange={(event) =>
                      onLifecycleFilterChange(
                        event.target.value as EstimateLifecycleState,
                      )
                    }
                    className={filterSelectClass}
                    aria-label="Filter by lifecycle"
                  >
                    {ESTIMATE_LIFECYCLE_FILTER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="relative">
                <Filter
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    onStatusFilterChange(event.target.value as EstimateStatus | "all")
                  }
                  className={filterSelectClass}
                  aria-label="Filter by status"
                >
                  {ESTIMATE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </MobileSheetBody>
            <MobileSheetFooter>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClearFilters();
                      setFiltersOpen(false);
                    }}
                    className="text-sm font-semibold text-slate-600"
                  >
                    Clear filters
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className={ownerMobileHeroPrimaryActionClass}
                >
                  Done
                </button>
              </div>
            </MobileSheetFooter>
          </MobileSheetPanel>
        </MobileSheet>
      ) : null}
    </div>
  );
}
