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
import {
  ownerMobileArchiveResultRowClass,
  ownerMobileEmptyCardClass,
  ownerMobileFiltersButtonClass,
  ownerMobileHeroCardClass,
  ownerMobileHeroPrimaryActionClass,
  ownerMobileScrollContentClass,
  ownerMobileUpNextRowClass,
} from "@/shared/components/jobs/jobs-north-star-mobile-owner-styles";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import type { InvoiceListStatusFilter } from "@/shared/lib/invoice-page-focus";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import {
  hasInvoiceUnpaidBalance,
  INVOICE_LIFECYCLE_FILTER_OPTIONS,
  INVOICE_STATUS_OPTIONS,
  type Invoice,
  type InvoiceLifecycleState,
} from "@/shared/types/invoice";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import { filterInvoicesByArchiveQuery } from "./invoices-north-star-mobile-owner-search";
import { sortInvoicesForOwnerView } from "./invoices-north-star-mobile-owner-sort";
import {
  invoicesOwnerMobileArchiveHelperClass,
  invoicesOwnerMobileArchiveInputClass,
  invoicesOwnerMobileArchiveSearchIconClass,
  invoicesOwnerMobileRowAmountClass,
  invoicesOwnerMobileRowChevronClass,
  invoicesOwnerMobileRowDateClass,
  invoicesOwnerMobileRowMetaClass,
  invoicesOwnerMobileSearchResultsMetaClass,
  invoicesOwnerMobileSectionLabelClass,
  invoicesOwnerMobileSectionMetaClass,
} from "./invoices-north-star-mobile-owner-styles";

const FILTER_SHEET_TITLE_ID = "invoices-owner-mobile-filters-title";
const UP_NEXT_LIMIT = 5;

const INVOICE_LIST_STATUS_OPTIONS: {
  value: InvoiceListStatusFilter;
  label: string;
}[] = [
  ...INVOICE_STATUS_OPTIONS,
  { value: "unpaid", label: "Unpaid (outstanding)" },
];

type InvoicesNorthStarMobileOwnerViewProps = {
  collectionInvoices: Invoice[];
  archiveInvoices: Invoice[];
  collectionCount: number;
  openCount: number;
  totalCollectionCount: number;
  hasNoInvoices: boolean;
  hasActiveFilters: boolean;
  companyTimeZone?: string;
  statusFilter: InvoiceListStatusFilter;
  lifecycleFilter: InvoiceLifecycleState;
  showLifecycleFilter: boolean;
  canManageInvoices: boolean;
  needsCustomers: boolean;
  onSelectInvoice: (invoice: Invoice) => void;
  onCreateInvoice?: () => void;
  onStatusFilterChange: (value: InvoiceListStatusFilter) => void;
  onLifecycleFilterChange: (value: InvoiceLifecycleState) => void;
  onClearFilters: () => void;
};

function formatInvoiceAmountLine(invoice: Invoice): string {
  if (hasInvoiceUnpaidBalance(invoice) && invoice.balanceDue > 0) {
    return `${formatCurrency(invoice.balanceDue)} due`;
  }

  return formatCurrency(invoice.total);
}

function formatInvoiceDateLine(invoice: Invoice, timeZone?: string): string {
  if (invoice.dueDate) {
    return `Due ${formatDate(invoice.dueDate, timeZone)}`;
  }

  if (invoice.sentAt) {
    return `Sent ${formatDate(invoice.sentAt, timeZone)}`;
  }

  return `Created ${formatDate(invoice.createdAt, timeZone)}`;
}

type OwnerCollectionHeroCardProps = {
  invoice: Invoice;
  companyTimeZone?: string;
  onSelectInvoice: (invoice: Invoice) => void;
};

function OwnerCollectionHeroCard({
  invoice,
  companyTimeZone,
  onSelectInvoice,
}: OwnerCollectionHeroCardProps) {
  return (
    <article className={ownerMobileHeroCardClass}>
      <div className="space-y-4 px-5 pb-4 pt-5">
        <div className="space-y-2">
          <p className={invoicesOwnerMobileSectionLabelClass}>Needs collection</p>
          <p className="truncate text-[1.5rem] font-bold leading-tight tracking-tight text-slate-900">
            <DemoDisplayName>{invoice.customerName}</DemoDisplayName>
          </p>
          <p className="text-base font-medium text-slate-600">
            {invoice.invoiceNumber}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <InvoiceStatusBadge status={invoice.status} />
        </div>

        <div className="space-y-2 text-[15px] leading-snug text-slate-600">
          <p className="text-lg font-semibold tabular-nums text-slate-800">
            {formatInvoiceAmountLine(invoice)}
            {hasInvoiceUnpaidBalance(invoice) && invoice.total > 0 ? (
              <span className="ml-2 text-sm font-medium text-slate-500">
                of {formatCurrency(invoice.total)}
              </span>
            ) : null}
          </p>
          <p className="flex items-start gap-2.5">
            <Clock
              className="mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 text-slate-400"
              aria-hidden
            />
            <span className="font-medium text-slate-700">
              {formatInvoiceDateLine(invoice, companyTimeZone)}
            </span>
          </p>
          {invoice.jobNumber ? (
            <p className="text-sm text-slate-500">Job {invoice.jobNumber}</p>
          ) : null}
        </div>
      </div>

      <div className="border-t border-slate-100/90 bg-slate-50/40 px-5 py-4">
        <button
          type="button"
          onClick={() => onSelectInvoice(invoice)}
          className={ownerMobileHeroPrimaryActionClass}
        >
          View invoice
        </button>
      </div>
    </article>
  );
}

type OwnerUpNextRowProps = {
  invoice: Invoice;
  companyTimeZone?: string;
  onSelectInvoice: (invoice: Invoice) => void;
};

function OwnerUpNextRow({
  invoice,
  companyTimeZone,
  onSelectInvoice,
}: OwnerUpNextRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelectInvoice(invoice)}
      className={ownerMobileUpNextRowClass}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-800">
            <DemoDisplayName>{invoice.customerName}</DemoDisplayName>
          </p>
          <span className={invoicesOwnerMobileRowAmountClass}>
            {formatInvoiceAmountLine(invoice)}
          </span>
        </div>
        <p className={invoicesOwnerMobileRowMetaClass}>
          {invoice.invoiceNumber}
          {invoice.jobNumber ? ` · Job ${invoice.jobNumber}` : ""}
        </p>
        <div className="flex items-center gap-2 pt-0.5">
          <InvoiceStatusBadge status={invoice.status} className="text-[9px]" />
          <span className={invoicesOwnerMobileRowDateClass}>
            {formatInvoiceDateLine(invoice, companyTimeZone)}
          </span>
        </div>
      </div>
      <ChevronRight className={invoicesOwnerMobileRowChevronClass} aria-hidden />
    </button>
  );
}

type OwnerArchiveResultRowProps = {
  invoice: Invoice;
  companyTimeZone?: string;
  onSelectInvoice: (invoice: Invoice) => void;
};

function OwnerArchiveResultRow({
  invoice,
  companyTimeZone,
  onSelectInvoice,
}: OwnerArchiveResultRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelectInvoice(invoice)}
      className={ownerMobileArchiveResultRowClass}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-slate-800">
            <DemoDisplayName>{invoice.customerName}</DemoDisplayName>
          </p>
          <span className={invoicesOwnerMobileRowAmountClass}>
            {formatInvoiceAmountLine(invoice)}
          </span>
        </div>
        <p className={invoicesOwnerMobileRowMetaClass}>{invoice.invoiceNumber}</p>
        <div className="flex items-center gap-2 pt-0.5">
          <InvoiceStatusBadge status={invoice.status} className="text-[9px]" />
          <span className={invoicesOwnerMobileRowDateClass}>
            {formatInvoiceDateLine(invoice, companyTimeZone)}
          </span>
        </div>
      </div>
      <ChevronRight className={invoicesOwnerMobileRowChevronClass} aria-hidden />
    </button>
  );
}

export function InvoicesNorthStarMobileOwnerView({
  collectionInvoices,
  archiveInvoices,
  collectionCount,
  openCount,
  totalCollectionCount,
  hasNoInvoices,
  hasActiveFilters,
  companyTimeZone,
  statusFilter,
  lifecycleFilter,
  showLifecycleFilter,
  canManageInvoices,
  needsCustomers,
  onSelectInvoice,
  onCreateInvoice,
  onStatusFilterChange,
  onLifecycleFilterChange,
  onClearFilters,
}: InvoicesNorthStarMobileOwnerViewProps) {
  const [archiveSearch, setArchiveSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isArchiveSearching = archiveSearch.trim().length >= 2;

  const archiveResults = useMemo(
    () =>
      sortInvoicesForOwnerView(
        filterInvoicesByArchiveQuery(archiveInvoices, archiveSearch),
        companyTimeZone,
      ),
    [archiveInvoices, archiveSearch, companyTimeZone],
  );

  const primaryInvoice = collectionInvoices[0] ?? null;
  const upNextInvoices = collectionInvoices.slice(1, 1 + UP_NEXT_LIMIT);

  const filterSelectClass =
    "h-11 w-full min-h-11 appearance-none rounded-xl border border-slate-200/90 bg-white py-2 pl-9 pr-8 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-[rgba(198,167,87,0.45)] focus:ring-2 focus:ring-[rgba(198,167,87,0.18)]";

  const countLine = hasActiveFilters
    ? collectionCount > 0
      ? `${collectionInvoices.length} of ${collectionCount} need collection`
      : `${collectionInvoices.length} of ${openCount} open`
    : collectionCount > 0
      ? `${collectionCount} need collection`
      : `${openCount} open`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header
        className={`north-star-page-header flex shrink-0 items-start justify-between gap-2 sm:items-center ${lt.pageHeader}`}
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className={lt.pageHeaderEyebrow}>Billing ledger</p>
          <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <h2 className={lt.pageHeaderTitle}>Invoices</h2>
            <p className={lt.pageHeaderSubtitle}>{countLine}</p>
          </div>
        </div>
        {canManageInvoices && onCreateInvoice ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onCreateInvoice}
              disabled={needsCustomers}
              className={`north-star-invoices-primary-action ${lt.primaryAction} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New Invoice
            </button>
          </div>
        ) : null}
      </header>

      <div className={ownerMobileScrollContentClass}>
        {isArchiveSearching ? (
          <section className="space-y-3" aria-label="Invoice history search results">
            <div>
              <h2 className={invoicesOwnerMobileSectionLabelClass}>Search results</h2>
              <p className={invoicesOwnerMobileSearchResultsMetaClass}>
                {archiveResults.length === 0
                  ? "No matching invoices found."
                  : `${archiveResults.length} matching ${
                      archiveResults.length === 1 ? "invoice" : "invoices"
                    }`}
              </p>
            </div>

            {archiveResults.length > 0 ? (
              <div className="space-y-2">
                {archiveResults.map((invoice) => (
                  <OwnerArchiveResultRow
                    key={invoice.id}
                    invoice={invoice}
                    companyTimeZone={companyTimeZone}
                    onSelectInvoice={onSelectInvoice}
                  />
                ))}
              </div>
            ) : (
              <div className={ownerMobileEmptyCardClass}>
                <p className="text-sm font-medium text-slate-700">No matches</p>
                <p className="mt-1 text-sm text-slate-500">
                  Try an invoice number, customer name, or job number.
                </p>
              </div>
            )}
          </section>
        ) : hasNoInvoices ? (
          <div className={ownerMobileEmptyCardClass}>
            <p className="text-base font-semibold text-slate-900">No invoices yet</p>
            <p className="mt-2 text-sm text-slate-500">
              {needsCustomers
                ? "Add a customer first, then create your first invoice."
                : "Create your first invoice to track billing and collections."}
            </p>
            {canManageInvoices && onCreateInvoice && !needsCustomers ? (
              <button
                type="button"
                onClick={onCreateInvoice}
                className={`${ownerMobileHeroPrimaryActionClass} mt-5 inline-flex max-w-xs gap-2`}
              >
                <Plus className="h-4 w-4" aria-hidden />
                New Invoice
              </button>
            ) : null}
          </div>
        ) : collectionInvoices.length === 0 ? (
          <div className={ownerMobileEmptyCardClass}>
            <p className="text-base font-semibold text-slate-900">
              {totalCollectionCount > 0 || openCount > 0
                ? "No invoices match your filters"
                : "No open invoices"}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {totalCollectionCount > 0 || openCount > 0
                ? "Try clearing filters or search invoice history below."
                : "Search past invoices below or create a new invoice."}
            </p>
            {canManageInvoices && onCreateInvoice && !needsCustomers ? (
              <button
                type="button"
                onClick={onCreateInvoice}
                className={`${ownerMobileHeroPrimaryActionClass} mt-5 inline-flex max-w-xs gap-2`}
              >
                <Plus className="h-4 w-4" aria-hidden />
                New Invoice
              </button>
            ) : null}
          </div>
        ) : (
          <section className="space-y-5" aria-label="Invoices needing collection">
            <div className="flex items-center justify-between gap-3">
              <h2 className={invoicesOwnerMobileSectionLabelClass}>Needs collection</h2>
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

            {primaryInvoice ? (
              <OwnerCollectionHeroCard
                invoice={primaryInvoice}
                companyTimeZone={companyTimeZone}
                onSelectInvoice={onSelectInvoice}
              />
            ) : null}

            {upNextInvoices.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <h3 className={invoicesOwnerMobileSectionLabelClass}>Up next</h3>
                  <span className={invoicesOwnerMobileSectionMetaClass}>
                    {upNextInvoices.length} more
                  </span>
                </div>
                <div className="space-y-2">
                  {upNextInvoices.map((invoice) => (
                    <OwnerUpNextRow
                      key={invoice.id}
                      invoice={invoice}
                      companyTimeZone={companyTimeZone}
                      onSelectInvoice={onSelectInvoice}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        )}

        <section className="mt-8 space-y-2" aria-label="Find past invoices">
          <label htmlFor="invoices-owner-archive-search" className="block">
            <span className={invoicesOwnerMobileSectionLabelClass}>Find past invoices</span>
            <span className={invoicesOwnerMobileArchiveHelperClass}>
              Search by invoice number, customer, status, amount, or job number.
            </span>
          </label>
          <div className="relative">
            <Search
              className={invoicesOwnerMobileArchiveSearchIconClass}
              aria-hidden
            />
            <input
              id="invoices-owner-archive-search"
              type="search"
              value={archiveSearch}
              onChange={(event) => setArchiveSearch(event.target.value)}
              placeholder="Search invoice history…"
              className={invoicesOwnerMobileArchiveInputClass}
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
                        event.target.value as InvoiceLifecycleState,
                      )
                    }
                    className={filterSelectClass}
                    aria-label="Filter by lifecycle"
                  >
                    {INVOICE_LIFECYCLE_FILTER_OPTIONS.map((option) => (
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
                    onStatusFilterChange(
                      event.target.value as InvoiceListStatusFilter,
                    )
                  }
                  className={filterSelectClass}
                  aria-label="Filter by status"
                >
                  {INVOICE_LIST_STATUS_OPTIONS.map((option) => (
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
