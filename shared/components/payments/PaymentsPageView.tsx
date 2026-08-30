"use client";

import { useCallback, useMemo } from "react";
import { CreditCard } from "lucide-react";
import type { RecentInvoicePayment } from "@/lib/database/queries/invoice-payments";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { EmptyState } from "@/shared/design-system/components";
import {
  MasterListPageLayout,
  MasterPageSurface,
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { buildPaymentsGlanceStatsFromSummaries } from "@/shared/lib/payments/payments-glance-stats";
import {
  usePagedList,
  type PagedListSnapshot,
} from "@/shared/components/lists/usePagedList";
import { loadPaymentsPageAction } from "@/app/actions/list-pages";
import { buildSalesHubHref } from "@/shared/lib/sales/sales-hub";
import { PaymentsStatStrip } from "./PaymentsStatStrip";
import { PaymentsTable } from "./PaymentsTable";

/**
 * ============================== THIS LIST USED TO BE A SLICE OF A TRUNCATED ARRAY ==============================
 * The Sales hub handed this component listInvoicePayments(companyId) -- the
 * whole ledger, no .limit() -- and it paged in the browser with
 * `payments.slice(0, visibleCount)` under "Showing 25 of N". PostgREST caps
 * that read at 1,000 rows, so on a tenant with 7,857 payments the tab showed
 * the newest 1,000, told the reader there were 1,000, and offered no way to
 * reach the rest. The "Total collected" stat above it was summed from the same
 * thousand and labelled "All-time".
 *
 * It is now a server-paged list like Invoices and Estimates: one page plus an
 * exact count, and a cursor for the rest. The all-time figure comes from its
 * own count and sum rather than from whatever is on screen.
 */
type PaymentsPageViewProps = {
  serverPage: PagedListSnapshot<RecentInvoicePayment>;
  allTime: { count: number; total: number };
  thisWeek: { count: number; total: number };
  thisMonth: { count: number; total: number };
  canManageCustomers: boolean;
  /**
   * When true, omit MasterListPageLayout — Sales hub hosts page chrome.
   * Stat strip renders above the list inside the panel.
   */
  embedded?: boolean;
};

export function PaymentsPageView({
  serverPage,
  allTime,
  thisWeek,
  thisMonth,
  canManageCustomers,
  embedded = false,
}: PaymentsPageViewProps) {
  const northStar = isNorthStarShellEnabled();

  const paged = usePagedList<RecentInvoicePayment>(
    serverPage,
    useCallback((cursor) => loadPaymentsPageAction({ cursor }), []),
  );

  const glanceStats = useMemo(
    () =>
      buildPaymentsGlanceStatsFromSummaries({
        allTime,
        thisWeek,
        thisMonth,
      }),
    [allTime, thisWeek, thisMonth],
  );

  const visiblePayments = paged.rows;
  const hasMore = paged.hasMore;
  // The empty state is the tenant having no payments at all, which is the
  // server's exact count -- not "this page came back empty".
  const hasNoPayments = serverPage.totalCount === 0;

  const panelBody = (
    <MasterPageSurface
      variant={northStar ? "northStarList" : "workspace"}
      className={masterListPageSurfaceClass}
    >
      {embedded ? (
        <div className="border-b border-altair-border/70 px-1 pb-2 sm:px-0">
          <PaymentsStatStrip stats={glanceStats} />
        </div>
      ) : null}
      <div className={masterListPageScrollRegionClass}>
        {hasNoPayments ? (
          <EmptyState
            title="No payments yet"
            description="Payments recorded on invoices will show up here with date, customer, amount, and method."
            icon={<CreditCard className="h-6 w-6" />}
            action={{
              label: "Go to Invoices",
              href: buildSalesHubHref("invoices"),
            }}
          />
        ) : (
          <>
            <PaymentsTable
              payments={visiblePayments}
              canManageCustomers={canManageCustomers}
              northStar={northStar}
            />

            <div className="flex flex-col items-center gap-2 border-t border-altair-border px-3.5 py-3 sm:flex-row sm:justify-between">
              <p className="text-xs text-altair-ink-on-paper-muted">
                Showing {visiblePayments.length} of {serverPage.totalCount}
              </p>
              {paged.error ? (
                <p className="text-xs text-altair-danger">{paged.error}</p>
              ) : null}
              {hasMore ? (
                <button
                  type="button"
                  disabled={paged.isLoadingMore}
                  onClick={paged.loadMore}
                  className={
                    northStar
                      ? lt.secondaryAction
                      : "inline-flex items-center justify-center rounded-md border border-altair-border bg-[var(--surface-tile)] px-3 py-1.5 text-xs font-semibold text-altair-ink-on-paper transition-colors hover:bg-[var(--surface-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  }
                >
                  {paged.isLoadingMore ? "Loading…" : "Load more"}
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </MasterPageSurface>
  );

  if (embedded) {
    return panelBody;
  }

  return (
    <MasterListPageLayout
      title="Payments"
      subtitle="Collected payments from the invoice ledger."
      density="compact"
      headerSurfaceVariant="default"
      headerTitleClassName="min-w-0 text-base font-semibold tracking-tight text-altair-ink-on-paper sm:text-lg"
      headerSubtitleClassName="min-w-0 truncate text-[11px] leading-snug text-altair-ink-on-paper-muted"
      headerClassName="py-1.5"
      summary={<PaymentsStatStrip stats={glanceStats} />}
    >
      {panelBody}
    </MasterListPageLayout>
  );
}
