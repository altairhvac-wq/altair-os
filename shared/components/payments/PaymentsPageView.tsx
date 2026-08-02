"use client";

import { useMemo, useState } from "react";
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
import { buildPaymentsGlanceStats } from "@/shared/lib/payments/payments-glance-stats";
import { PaymentsStatStrip } from "./PaymentsStatStrip";
import { PaymentsTable } from "./PaymentsTable";

/** Initial visible rows; matches “Load more” rather than rendering the full ledger. */
const PAYMENTS_PAGE_SIZE = 50;

type PaymentsPageViewProps = {
  payments: RecentInvoicePayment[];
  thisWeek: { count: number; total: number };
  thisMonth: { count: number; total: number };
  canManageCustomers: boolean;
};

export function PaymentsPageView({
  payments,
  thisWeek,
  thisMonth,
  canManageCustomers,
}: PaymentsPageViewProps) {
  const northStar = isNorthStarShellEnabled();
  const [visibleCount, setVisibleCount] = useState(PAYMENTS_PAGE_SIZE);

  const glanceStats = useMemo(
    () =>
      buildPaymentsGlanceStats({
        payments,
        thisWeek,
        thisMonth,
      }),
    [payments, thisWeek, thisMonth],
  );

  const visiblePayments = payments.slice(0, visibleCount);
  const hasMore = visibleCount < payments.length;
  const hasNoPayments = payments.length === 0;

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
      <MasterPageSurface
        variant={northStar ? "northStarList" : "workspace"}
        className={masterListPageSurfaceClass}
      >
        <div className={masterListPageScrollRegionClass}>
          {hasNoPayments ? (
            <EmptyState
              title="No payments yet"
              description="Payments recorded on invoices will show up here with date, customer, amount, and method."
              icon={<CreditCard className="h-6 w-6" />}
              action={{ label: "Go to Invoices", href: "/invoices" }}
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
                  Showing {visiblePayments.length} of {payments.length}
                </p>
                {hasMore ? (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((count) =>
                        Math.min(count + PAYMENTS_PAGE_SIZE, payments.length),
                      )
                    }
                    className={
                      northStar
                        ? lt.secondaryAction
                        : "inline-flex items-center justify-center rounded-md border border-altair-border bg-[var(--surface-tile)] px-3 py-1.5 text-xs font-semibold text-altair-ink-on-paper transition-colors hover:bg-[var(--surface-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-brass/40"
                    }
                  >
                    Load more
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </MasterPageSurface>
    </MasterListPageLayout>
  );
}
