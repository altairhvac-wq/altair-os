import Link from "next/link";
import { Scale } from "lucide-react";
import { StatusPill } from "@/shared/design-system/components/StatusPill";
import {
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcListClass,
  altairMcListRowClass,
  altairMcMetricLabelClass,
} from "@/shared/design-system/components/mc-surface";
import { formatDateTimeInTimeZone, resolveCompanyTimeZone } from "@/shared/lib/datetime";
import { formatCurrencyExact } from "@/shared/types/customer";
import {
  formatPaymentDisputeReason,
  isPaymentDisputeOpen,
  PAYMENT_DISPUTE_STATUS_LABELS,
  paymentDisputeStatusTone,
  type PaymentDisputeListViewItem,
} from "@/shared/types/settings/payment-disputes";

type PaymentDisputesCardProps = {
  disputes: PaymentDisputeListViewItem[];
  companyTimezone?: string | null;
  loadError?: string | null;
};

function formatDisputeWhen(
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

export function PaymentDisputesCard({
  disputes,
  companyTimezone,
  loadError = null,
}: PaymentDisputesCardProps) {
  const openCount = disputes.filter((dispute) =>
    isPaymentDisputeOpen(dispute.status),
  ).length;

  // Nothing to act on → one quiet line instead of a full empty card. The
  // full card (icon, guidance, list) renders only when disputes exist or
  // the load failed — i.e. when there is actually something to read.
  if (!loadError && disputes.length === 0) {
    return (
      <p
        id="payment-disputes"
        className="flex scroll-mt-24 items-center gap-2 px-1 text-xs text-altair-ink-on-paper-muted"
      >
        <Scale className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Payment disputes: none recorded. Chargebacks on your connected account
        will appear here.
      </p>
    );
  }

  return (
    <section
      id="payment-disputes"
      className={`${altairMcCardClass} ${altairMcCardPadClass} scroll-mt-24`}
      aria-labelledby="payment-disputes-heading"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--north-star-plate-border)] bg-[var(--surface-tile)] text-altair-ink-on-paper">
          <Scale className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            id="payment-disputes-heading"
            className="text-sm font-semibold text-altair-ink-on-paper"
          >
            Payment disputes
          </h3>
          <p className="mt-1 text-xs leading-5 text-altair-ink-on-paper-muted">
            Chargebacks and Stripe inquiries on your connected account. Respond
            in Stripe Dashboard — Altair tracks status so disputes are not
            invisible here.
          </p>
        </div>
      </div>

      {loadError ? (
        <p className="mt-4 text-sm text-altair-danger" role="alert">
          {loadError}
        </p>
      ) : null}

      {!loadError && disputes.length === 0 ? (
        <p className="mt-4 text-sm text-altair-ink-on-paper-muted">
          No disputes recorded yet.
        </p>
      ) : null}

      {!loadError && disputes.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className={altairMcMetricLabelClass}>
            {openCount > 0
              ? `${openCount} open · ${disputes.length} total`
              : `${disputes.length} recorded`}
          </p>
          <ul className={`${altairMcListClass} divide-y divide-[var(--north-star-plate-border)]`}>
            {disputes.map((dispute) => {
              const when = formatDisputeWhen(
                dispute.providerCreatedAt ?? dispute.createdAt,
                companyTimezone,
              );
              const evidenceDue = formatDisputeWhen(
                dispute.evidenceDueBy,
                companyTimezone,
              );

              return (
                <li
                  id={`payment-dispute-${dispute.id}`}
                  key={dispute.id}
                  className={`${altairMcListRowClass} scroll-mt-24`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums text-altair-ink-on-paper">
                          {formatCurrencyExact(dispute.amount)}
                        </span>
                        <StatusPill
                          tone={paymentDisputeStatusTone(dispute.status)}
                          size="sm"
                        >
                          {PAYMENT_DISPUTE_STATUS_LABELS[dispute.status]}
                        </StatusPill>
                      </div>
                      <p className="text-xs text-altair-ink-on-paper-muted">
                        {formatPaymentDisputeReason(dispute.reason)}
                        {" · "}
                        {when}
                        {dispute.evidenceDueBy &&
                        isPaymentDisputeOpen(dispute.status)
                          ? ` · Evidence due ${evidenceDue}`
                          : null}
                      </p>
                      <p className="text-[11px] text-altair-ink-on-paper-muted">
                        {dispute.invoiceId && dispute.invoiceNumber ? (
                          <>
                            Invoice{" "}
                            <Link
                              href={`/invoices/${dispute.invoiceId}`}
                              className="font-medium text-altair-brass underline-offset-2 hover:underline"
                            >
                              {dispute.invoiceNumber}
                            </Link>
                          </>
                        ) : dispute.invoiceId ? (
                          <>
                            Invoice{" "}
                            <Link
                              href={`/invoices/${dispute.invoiceId}`}
                              className="font-medium text-altair-brass underline-offset-2 hover:underline"
                            >
                              view
                            </Link>
                          </>
                        ) : (
                          "Invoice not linked"
                        )}
                        {dispute.providerPaymentIntentId
                          ? ` · ${dispute.providerPaymentIntentId}`
                          : null}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
