import { redirect } from "next/navigation";
import { canViewBilling, getCompanyAccessScope } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listCustomers, listDeletedCustomers } from "@/lib/database/queries/customers";
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

  const [customers, deletedCustomers] = await Promise.all([
    listCustomers(companyContext.company.id, {
      includeArchived: true,
    }),
    listDeletedCustomers(companyContext.company.id),
  ]);
  const allCustomers = [...customers, ...deletedCustomers];
  const canViewCustomerBilling = canViewBilling(companyContext);
  const visibleCustomers = canViewCustomerBilling
    ? allCustomers
    : allCustomers.map((customer) => ({ ...customer, totalRevenue: 0 }));

  return (
    <CustomersPageView
      initialCustomers={visibleCustomers}
      canManageCustomers={companyContext.permissions.manageCustomers}
      canViewBilling={canViewCustomerBilling}
    />
  );
}
