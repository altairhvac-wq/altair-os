import { notFound, redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCustomerById } from "@/lib/database/queries/customers";
import { CustomerDetailPageView } from "@/shared/components/customers/CustomerDetailPageView";

type CustomerDetailPageProps = {
  params: Promise<{ customerId: string }>;
};

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const { customerId } = await params;
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const customer = await getCustomerById(
    companyContext.company.id,
    customerId,
  );

  if (!customer) {
    notFound();
  }

  return <CustomerDetailPageView customer={customer} />;
}
