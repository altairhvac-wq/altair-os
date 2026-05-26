import { redirect } from "next/navigation";
import { shouldShowAlphaComingSoon } from "@/lib/beta/alpha-hardening";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { ComingSoonView } from "@/shared/components/layout/ComingSoonView";
import { listServiceItems } from "@/lib/database/queries/service-items";
import { ServiceItemsPageView } from "@/shared/components/service-items/ServiceItemsPageView";

export default async function PriceBookPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (shouldShowAlphaComingSoon("/price-book")) {
    return (
      <ComingSoonView
        title="Price book coming soon"
        description="Service catalog management is being polished for production. Existing invoice line items remain available."
      />
    );
  }

  const serviceItems = await listServiceItems(companyContext.company.id);

  return (
    <ServiceItemsPageView
      initialServiceItems={serviceItems}
      canManagePriceBook={companyContext.permissions.manageBilling}
    />
  );
}
