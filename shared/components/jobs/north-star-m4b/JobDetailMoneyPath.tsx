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
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type JobDetailMoneyPathProps = {
  estimates: JobEstimateSummary[];
  invoices: JobInvoiceSummary[];
  profitability: JobProfitabilitySnapshot | null;
  canViewBilling: boolean;
};

function StageMeta({ children }: { children: ReactNode }) {
  return <p className={dt.ivoryCardMuted}>{children}</p>;
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
      <p className={dt.metricLabel}>{label}</p>
      <p className={`${dt.metricValue} text-base`}>{value}</p>
    </div>
  );
}

function ViewLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={`${dt.opportunityLink} mt-2 min-h-9`}>
      {label}
      <ArrowRight className="h-3 w-3" aria-hidden="true" />
    </Link>
  );
}

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
      className={`${dt.compactSectionSurface} scroll-mt-6`}
    >
      <div className="flex items-start gap-2.5">
        <div className={dt.sectionIconWrap}>
          <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 id="job-detail-money-path-heading" className={dt.sectionTitle}>
            Money path
          </h2>
          <p className={dt.sectionSubtitle}>
            Estimate → Invoice → Payment
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className={dt.innerCard}>
          <p className={dt.metricLabel}>Estimate</p>
          {estimate.present ? (
            <>
              <p className={`mt-1 ${dt.ivoryCardPrimary}`}>
                {estimate.documentNumber}
              </p>
              <p className={`mt-0.5 ${dt.ivoryCardSecondary}`}>
                {estimate.statusLabel}
              </p>
              {estimate.total != null ? (
                <p className={`mt-1 ${dt.metricValue}`}>
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
              <p className={`mt-1 ${dt.ivoryCardPrimary}`}>Not created</p>
              <StageMeta>
                Optional — jobs may invoice without an estimate.
              </StageMeta>
            </>
          )}
        </div>

        <div className={dt.innerCard}>
          <p className={dt.metricLabel}>Invoice</p>
          {invoice.present ? (
            <>
              <p className={`mt-1 ${dt.ivoryCardPrimary}`}>
                {invoice.documentNumber}
              </p>
              <p className={`mt-0.5 ${dt.ivoryCardSecondary}`}>
                {invoice.statusLabel}
              </p>
              {invoice.total != null ? (
                <p className={`mt-1 ${dt.metricValue}`}>
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
              <p className={`mt-1 ${dt.ivoryCardPrimary}`}>Not created</p>
              <StageMeta>No invoice linked to this job yet.</StageMeta>
            </>
          )}
        </div>

        <div
          className={
            payment.outstanding > 0 ? dt.metricCardHighlight : dt.innerCard
          }
        >
          <p className={dt.metricLabel}>Payment</p>
          <p className={`mt-1 ${dt.ivoryCardSecondary}`}>
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
