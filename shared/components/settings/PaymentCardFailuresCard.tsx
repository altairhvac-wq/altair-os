import Link from "next/link";
import { CreditCard } from "lucide-react";
import {
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcListClass,
  altairMcListRowClass,
  altairMcMetricLabelClass,
} from "@/shared/design-system/components/mc-surface";
import { StatusPill } from "@/shared/design-system/components/StatusPill";
import { formatDateTimeInTimeZone, resolveCompanyTimeZone } from "@/shared/lib/datetime";
import { formatCurrency } from "@/shared/types/customer";

export type PaymentCardFailureListViewItem = {
  id: string;
  invoiceId: string;
  invoiceNumber: string | null;
  amount: number;
  currency: string;
  status: string;
  cardFailureCount: number;
  lastCardFailureAt: string | null;
  lastCardFailureCode: string | null;
  lastCardFailureMessage: string | null;
};

type PaymentCardFailuresCardProps = {
  attempts: PaymentCardFailureListViewItem[];
  companyTimezone?: string | null;
  loadError?: string | null;
};

function formatFailureWhen(
  value: string | null,
  companyTimezone?: string | null,
): string {
  if (!value) {
    return "—";
  }

  return formatDateTimeInTimeZone(
    value,
    resolveCompanyTimeZone(companyTimezone),
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}

export function PaymentCardFailuresCard({
  attempts,
  companyTimezone,
  loadError = null,
}: PaymentCardFailuresCardProps) {
  // Nothing needing attention → one quiet line instead of a full empty card.
  if (!loadError && attempts.length === 0) {
    return (
      <p
        id="payment-card-failures"
        className="flex scroll-mt-24 items-center gap-2 px-1 text-xs text-altair-ink-on-paper-muted"
      >
        <CreditCard className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Card payment failures: none need attention. Repeated declines on
        checkout links will appear here.
      </p>
    );
  }

  return (
    <section
      id="payment-card-failures"
      className={`${altairMcCardClass} ${altairMcCardPadClass} scroll-mt-24`}
      aria-labelledby="payment-card-failures-heading"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--north-star-plate-border)] bg-[var(--surface-tile)] text-altair-ink-on-paper">
          <CreditCard className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            id="payment-card-failures-heading"
            className="text-sm font-semibold text-altair-ink-on-paper"
          >
            Card payment failures
          </h3>
          <p className="mt-1 text-xs leading-5 text-altair-ink-on-paper-muted">
            Checkout attempts with repeated or terminal card declines. Customers
            may still retry an active link — follow up when declines stack up.
          </p>
        </div>
      </div>

      {loadError ? (
        <p className="mt-4 text-sm text-altair-danger" role="alert">
          {loadError}
        </p>
      ) : null}

      {!loadError && attempts.length === 0 ? (
        <p className="mt-4 text-sm text-altair-ink-on-paper-muted">
          No card failures needing attention.
        </p>
      ) : null}

      {!loadError && attempts.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className={altairMcMetricLabelClass}>
            {attempts.length} needing attention
          </p>
          <ul
            className={`${altairMcListClass} divide-y divide-[var(--north-star-plate-border)]`}
          >
            {attempts.map((attempt) => (
              <li key={attempt.id} className={altairMcListRowClass}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-altair-ink-on-paper">
                        {formatCurrency(attempt.amount)}
                      </span>
                      <StatusPill tone="warning" size="sm">
                        {attempt.cardFailureCount}{" "}
                        {attempt.cardFailureCount === 1
                          ? "decline"
                          : "declines"}
                      </StatusPill>
                    </div>
                    <p className="text-xs text-altair-ink-on-paper-muted">
                      {attempt.lastCardFailureCode ?? "Card declined"}
                      {" · "}
                      {formatFailureWhen(
                        attempt.lastCardFailureAt,
                        companyTimezone,
                      )}
                    </p>
                    {attempt.lastCardFailureMessage ? (
                      <p className="text-[11px] text-altair-ink-on-paper-muted">
                        {attempt.lastCardFailureMessage}
                      </p>
                    ) : null}
                    <p className="text-[11px] text-altair-ink-on-paper-muted">
                      Invoice{" "}
                      <Link
                        href={`/invoices/${attempt.invoiceId}`}
                        className="font-medium text-altair-brass underline-offset-2 hover:underline"
                      >
                        {attempt.invoiceNumber ?? "view"}
                      </Link>
                      {" · "}
                      Attempt {attempt.status}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
