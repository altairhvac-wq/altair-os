import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listCustomers } from "@/lib/database/queries/customers";
import { CustomersPageView } from "@/shared/components/customers/CustomersPageView";

export default async function CustomersPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const customers = await listCustomers(companyContext.company.id);

  return (
    <CustomersPageView
      initialCustomers={customers}
      canManageCustomers={companyContext.permissions.manageCustomers}
    />
  );
}
