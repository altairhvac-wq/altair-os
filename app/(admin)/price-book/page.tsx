import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listServiceItems } from "@/lib/database/queries/service-items";
import { ServiceItemsPageView } from "@/shared/components/service-items/ServiceItemsPageView";

export default async function PriceBookPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const serviceItems = await listServiceItems(companyContext.company.id);

  return (
    <ServiceItemsPageView
      initialServiceItems={serviceItems}
      canManagePriceBook={companyContext.permissions.manageBilling}
    />
  );
}
