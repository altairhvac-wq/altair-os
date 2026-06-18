import Link from "next/link";
import { FileText } from "lucide-react";
import type { ReportsPageDateRange } from "@/shared/types/reports-page";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
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
      <section className="rounded-[1.25rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-4 py-4 shadow-[0_4px_16px_rgba(3,7,12,0.08)] sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#17130E]">Accountant summary</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-[#4F4638]">
              Export a printable bookkeeping summary based on records entered in Altair OS.
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#6B6255]">
              For bookkeeping review only. This does not replace tax or accounting advice.
            </p>
          </div>

          <Link
            href={exportHref}
            className={`${lt.secondaryAction} shrink-0 self-start text-xs sm:self-center`}
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
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
          <h3 className="text-xs font-medium text-slate-500">Accountant Summary</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
            Export a printable bookkeeping summary based on records entered in Altair OS.
          </p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
            For bookkeeping review only. This does not replace tax or accounting advice.
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
