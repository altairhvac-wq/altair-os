import Link from "next/link";
import { FileText } from "lucide-react";
import type { ReportsPageDateRange } from "@/shared/types/reports-page";
import {
  altairReportCardClass,
  altairReportCardPadClass,
  altairReportSecondaryActionClass,
} from "@/shared/design-system/components";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type AccountantSummaryCardProps = {
  dateRange: ReportsPageDateRange;
  variant?: ReportSurfaceVariant;
};

export function AccountantSummaryCard({
  dateRange,
  variant = "legacy",
}: AccountantSummaryCardProps) {
  const exportHref = `/reports/tax-summary?range=${dateRange}`;
  const northStar = isNorthStarReportSurface(variant);

  if (northStar) {
    return (
      <section
        className={`${altairReportCardClass} ${altairReportCardPadClass}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm leading-relaxed text-altair-ink-on-graphite-secondary">
              Export a printable bookkeeping summary based on records entered in
              Altair OS.
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-altair-ink-on-graphite-muted">
              For bookkeeping review only. This does not replace tax or
              accounting advice.
            </p>
          </div>

          <Link
            href={exportHref}
            className={`${altairReportSecondaryActionClass} shrink-0 self-start sm:self-center`}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Export Tax Summary
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200/50 bg-slate-50/30 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-xs font-medium text-slate-500">
            Accountant Summary
          </h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
            Export a printable bookkeeping summary based on records entered in
            Altair OS.
          </p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
            For bookkeeping review only. This does not replace tax or accounting
            advice.
          </p>
        </div>

        <Link
          href={exportHref}
          className="admin-btn-secondary inline-flex shrink-0 items-center gap-2 self-start text-xs sm:self-center"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          Export Tax Summary
        </Link>
      </div>
    </section>
  );
}
