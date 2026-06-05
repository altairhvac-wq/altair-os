import Link from "next/link";
import { FileText } from "lucide-react";
import type { ReportsPageDateRange } from "@/shared/types/reports-page";

type AccountantSummaryCardProps = {
  dateRange: ReportsPageDateRange;
};

export function AccountantSummaryCard({ dateRange }: AccountantSummaryCardProps) {
  const exportHref = `/reports/tax-summary?range=${dateRange}`;

  return (
    <section className="flex flex-col overflow-hidden admin-card">
      <div className="admin-panel-header px-4 py-3 sm:px-5 sm:py-4">
        <h3 className="admin-heading-section sm:text-base">Accountant Summary</h3>
        <p className="admin-text-helper mt-0.5">
          Export a printable summary of revenue, payments, invoices, taxes, and
          expenses recorded in Altair OS.
        </p>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <Link
          href={exportHref}
          className="admin-btn-primary inline-flex items-center gap-2"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          Export Tax Summary
        </Link>
        <p className="text-xs text-slate-500">
          For bookkeeping review only. This report only includes records entered
          in Altair OS.
        </p>
      </div>
    </section>
  );
}
