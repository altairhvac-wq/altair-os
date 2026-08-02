import { redirect } from "next/navigation";
import { canViewBilling } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  getPaymentsThisMonthSummary,
  getPaymentsThisWeekSummary,
  listInvoicePayments,
} from "@/lib/database/queries/invoice-payments";
import { PaymentsPageView } from "@/shared/components/payments/PaymentsPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";

export default async function PaymentsPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canViewBilling(companyContext)) {
    return (
      <UnauthorizedAccessView description="Payment records are limited to billing and admin roles." />
    );
  }

  const companyId = companyContext.company.id;
  const timeZone = companyContext.company.timezone;

  const [payments, thisWeek, thisMonth] = await Promise.all([
    listInvoicePayments(companyId),
    getPaymentsThisWeekSummary(companyId, timeZone),
    getPaymentsThisMonthSummary(companyId, timeZone),
  ]);

  return (
    <PaymentsPageView
      payments={payments}
      thisWeek={thisWeek}
      thisMonth={thisMonth}
      canManageCustomers={companyContext.permissions.manageCustomers}
    />
  );
}
