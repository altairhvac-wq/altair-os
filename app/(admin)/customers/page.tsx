import { redirect } from "next/navigation";
import { canViewBilling, getCompanyAccessScope } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  applyCustomerOperationalStats,
  listCustomers,
  listCustomerOperationalStatsByCompany,
  listDeletedCustomers,
} from "@/lib/database/queries/customers";
import { CustomersPageView } from "@/shared/components/customers/CustomersPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";

export default async function CustomersPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!getCompanyAccessScope(companyContext).canManageCustomers) {
    return (
      <UnauthorizedAccessView description="Customer records are limited to office and dispatch roles." />
    );
  }

  const canViewCustomerBilling = canViewBilling(companyContext);

  const [customers, deletedCustomers, operationalStatsByCustomer] =
    await Promise.all([
      listCustomers(companyContext.company.id, {
        includeArchived: true,
      }),
      listDeletedCustomers(companyContext.company.id),
      listCustomerOperationalStatsByCompany(companyContext.company.id),
    ]);
  const visibleCustomers = applyCustomerOperationalStats(
    [...customers, ...deletedCustomers],
    operationalStatsByCustomer,
    { includeRevenue: canViewCustomerBilling },
  );

  return (
    <CustomersPageView
      initialCustomers={visibleCustomers}
      canManageCustomers={companyContext.permissions.manageCustomers}
      canViewBilling={canViewCustomerBilling}
    />
  );
}
