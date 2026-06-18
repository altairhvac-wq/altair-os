import Link from "next/link";
import { DollarSign } from "lucide-react";
import type {
  JobEstimateSummary,
  JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import {
  formatJobProfitabilityCurrency,
  type JobProfitabilitySnapshot,
} from "@/shared/types/job-profitability";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type JobDetailSideRailBillingCardProps = {
  profitability: JobProfitabilitySnapshot;
  estimates: JobEstimateSummary[];
  invoices: JobInvoiceSummary[];
  canViewBilling: boolean;
};

export function JobDetailSideRailBillingCard({
  profitability,
  estimates,
  invoices,
  canViewBilling,
}: JobDetailSideRailBillingCardProps) {
  const latestEstimate = estimates[0];
  const latestInvoice = invoices[0];

  return (
    <section className={`${dt.compactSectionSurface} scroll-mt-6`}>
      <div className="flex items-center gap-2.5">
        <div className={dt.sectionIconWrap}>
          <DollarSign className="h-4 w-4" />
        </div>
        <div>
          <h2 className={dt.sectionTitle}>Billing</h2>
          <p className={dt.sectionSubtitle}>Revenue and documents</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <div className={dt.metricCard}>
          <p className={dt.metricLabel}>Collected</p>
          <p className={dt.metricValue}>
            {formatJobProfitabilityCurrency(profitability.revenue.collected)}
          </p>
        </div>
        <div className={dt.metricCard}>
          <p className={dt.metricLabel}>Outstanding</p>
          <p className={dt.metricValue}>
            {formatJobProfitabilityCurrency(profitability.revenue.outstanding)}
          </p>
        </div>
      </div>

      {canViewBilling ? (
        <div className={`mt-3 space-y-2 ${dt.innerCard}`}>
          {latestEstimate ? (
            <div className="flex items-center justify-between gap-2">
              <span className={dt.ivoryCardSecondary}>
                Estimate {latestEstimate.estimateNumber}
              </span>
              <Link
                href={`/estimates/${latestEstimate.id}`}
                className={dt.opportunityLink}
              >
                View
              </Link>
            </div>
          ) : null}
          {latestInvoice ? (
            <div className="flex items-center justify-between gap-2">
              <span className={dt.ivoryCardSecondary}>
                Invoice {latestInvoice.invoiceNumber}
              </span>
              <Link
                href={`/invoices/${latestInvoice.id}`}
                className={dt.opportunityLink}
              >
                View
              </Link>
            </div>
          ) : null}
          {!latestEstimate && !latestInvoice ? (
            <p className={dt.ivoryCardMuted}>No billing documents yet.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
