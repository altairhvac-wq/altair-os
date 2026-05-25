import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listCustomers } from "@/lib/database/queries/customers";
import { listInvoices } from "@/lib/database/queries/invoices";
import { listJobs } from "@/lib/database/queries/jobs";
import { listActiveServiceItems } from "@/lib/database/queries/service-items";
import { InvoicesPageView } from "@/shared/components/invoices/InvoicesPageView";

type InvoicesPageProps = {
  searchParams: Promise<{ customerId?: string; create?: string }>;
};

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const { customerId, create } = await searchParams;

  const [invoices, customers, jobs, serviceItems] = await Promise.all([
    listInvoices(companyContext.company.id),
    listCustomers(companyContext.company.id),
    listJobs(companyContext.company.id),
    listActiveServiceItems(companyContext.company.id),
  ]);

  const preselectedCustomer = customerId
    ? customers.find((customer) => customer.id === customerId)
    : undefined;

  return (
    <InvoicesPageView
      initialInvoices={invoices}
      customers={customers}
      jobs={jobs}
      serviceItems={serviceItems}
      canManageInvoices={companyContext.permissions.manageBilling}
      initialPanelMode={create === "1" && preselectedCustomer ? "create" : "empty"}
      createInitialData={
        preselectedCustomer
          ? { customerId: preselectedCustomer.id }
          : undefined
      }
    />
  );
}
