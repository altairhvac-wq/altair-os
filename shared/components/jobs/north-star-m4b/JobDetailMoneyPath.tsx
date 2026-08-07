import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CircleDollarSign } from "lucide-react";
import type {
  JobEstimateSummary,
  JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import { buildJobMoneyPathModel } from "@/shared/lib/jobs/job-money-path-presentation";
import { JOB_DETAIL_BILLING_ANCHOR } from "@/shared/lib/jobs/job-detail-anchors";
import {
  formatJobProfitabilityCurrency,
  type JobProfitabilitySnapshot,
} from "@/shared/types/job-profitability";
import {
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcMetricLabelClass,
} from "@/shared/design-system/components";
import { altairCanvasInkLinkClass } from "@/shared/design-system/foundation";

type JobDetailMoneyPathProps = {
  estimates: JobEstimateSummary[];
  invoices: JobInvoiceSummary[];
  profitability: JobProfitabilitySnapshot | null;
  canViewBilling: boolean;
};

function StageMeta({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1 text-xs text-altair-ink-on-paper-muted">{children}</p>
  );
}

function StageAmount({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className={altairMcMetricLabelClass}>{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-altair-ink-on-paper">
        {value}
      </p>
    </div>
  );
}

function ViewLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={`mt-2 inline-flex min-h-9 items-center gap-0.5 text-[11px] font-semibold ${altairCanvasInkLinkClass}`}
    >
      {label}
      <ArrowRight className="h-3 w-3" aria-hidden="true" />
    </Link>
  );
}

const stageCardClass =
  "rounded-none border border-[var(--north-star-plate-border)] bg-[var(--surface-tile)] px-2.5 py-2";

export function JobDetailMoneyPath({
  estimates,
  invoices,
  profitability,
  canViewBilling,
}: JobDetailMoneyPathProps) {
  const model = buildJobMoneyPathModel({
    estimates,
    invoices,
    profitability,
    canViewBilling,
  });

  const { estimate, invoice, payment } = model;

  return (
    <section
      id={JOB_DETAIL_BILLING_ANCHOR}
      data-job-section={JOB_DETAIL_BILLING_ANCHOR}
      tabIndex={-1}
      aria-labelledby="job-detail-money-path-heading"
      className={`${altairMcCardClass} ${altairMcCardPadClass} scroll-mt-6`}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-altair-stone ring-1 ring-altair-border">
          <CircleDollarSign
            className="h-4 w-4 text-altair-ink-on-paper-secondary"
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0">
          <h2
            id="job-detail-money-path-heading"
            className="text-sm font-bold tracking-tight text-altair-ink-on-paper"
          >
            Money path
          </h2>
          <p className="mt-0.5 text-xs text-altair-ink-on-paper-muted">
            Estimate → Invoice → Payment
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className={stageCardClass}>
          <p className={altairMcMetricLabelClass}>Estimate</p>
          {estimate.present ? (
            <>
              <p className="mt-1 text-sm font-semibold text-altair-ink-on-paper">
                {estimate.documentNumber}
              </p>
              <p className="mt-0.5 text-xs text-altair-ink-on-paper-secondary">
                {estimate.statusLabel}
              </p>
              {estimate.total != null ? (
                <p className="mt-1 text-sm font-bold tabular-nums text-altair-ink-on-paper">
                  {formatJobProfitabilityCurrency(estimate.total)}
                </p>
              ) : null}
              {estimate.documentCount > 1 ? (
                <StageMeta>{estimate.documentCount} estimates on job</StageMeta>
              ) : null}
              {estimate.href ? (
                <ViewLink href={estimate.href} label="View estimate" />
              ) : null}
            </>
          ) : (
            <>
              <p className="mt-1 text-sm font-semibold text-altair-ink-on-paper">
                Not created
              </p>
              <StageMeta>
                Optional — jobs may invoice without an estimate.
              </StageMeta>
            </>
          )}
        </div>

        <div className={stageCardClass}>
          <p className={altairMcMetricLabelClass}>Invoice</p>
          {invoice.present ? (
            <>
              <p className="mt-1 text-sm font-semibold text-altair-ink-on-paper">
                {invoice.documentNumber}
              </p>
              <p className="mt-0.5 text-xs text-altair-ink-on-paper-secondary">
                {invoice.statusLabel}
              </p>
              {invoice.total != null ? (
                <p className="mt-1 text-sm font-bold tabular-nums text-altair-ink-on-paper">
                  {formatJobProfitabilityCurrency(invoice.total)}
                </p>
              ) : null}
              {invoice.documentCount > 1 ? (
                <StageMeta>
                  {invoice.documentCount} active invoices on job
                </StageMeta>
              ) : null}
              {invoice.href ? (
                <ViewLink href={invoice.href} label="View invoice" />
              ) : null}
            </>
          ) : (
            <>
              <p className="mt-1 text-sm font-semibold text-altair-ink-on-paper">
                Not created
              </p>
              <StageMeta>No invoice linked to this job yet.</StageMeta>
            </>
          )}
        </div>

        <div
          className={
            payment.outstanding > 0
              ? "rounded-lg border border-altair-warning/35 bg-altair-warning-surface px-2.5 py-2"
              : stageCardClass
          }
        >
          <p className={altairMcMetricLabelClass}>Payment</p>
          <p className="mt-1 text-xs text-altair-ink-on-paper-secondary">
            {payment.statusLabel}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <StageAmount
              label="Collected"
              value={formatJobProfitabilityCurrency(payment.collected)}
            />
            <StageAmount
              label="Outstanding"
              value={formatJobProfitabilityCurrency(payment.outstanding)}
            />
          </div>
          {payment.invoiced > 0 ? (
            <StageMeta>
              Invoiced {formatJobProfitabilityCurrency(payment.invoiced)}
            </StageMeta>
          ) : null}
          {payment.href && payment.outstanding > 0 ? (
            <ViewLink href={payment.href} label="View payment details" />
          ) : payment.href && payment.collected > 0 ? (
            <ViewLink href={payment.href} label="View payment details" />
          ) : null}
        </div>
      </div>
    </section>
  );
}
