import { redirect } from "next/navigation";
import { getCompanyAccessScope } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listCustomers } from "@/lib/database/queries/customers";
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

  const customers = await listCustomers(companyContext.company.id);

  return (
    <CustomersPageView
      initialCustomers={customers}
      canManageCustomers={companyContext.permissions.manageCustomers}
    />
  );
}
