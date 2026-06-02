import { redirect } from "next/navigation";
import { canViewBilling } from "@/lib/database/access-control";
import { shouldShowAlphaComingSoon } from "@/lib/beta/alpha-hardening";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { ComingSoonView } from "@/shared/components/layout/ComingSoonView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import {
  listDeletedServiceItems,
  listServiceItems,
} from "@/lib/database/queries/service-items";
import { ServiceItemsPageView } from "@/shared/components/service-items/ServiceItemsPageView";

export default async function PriceBookPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canViewBilling(companyContext)) {
    return (
      <UnauthorizedAccessView description="Price book access is limited to billing and admin roles." />
    );
  }

  if (shouldShowAlphaComingSoon("/price-book")) {
    return (
      <ComingSoonView
        title="Price book coming soon"
        description="Service catalog management is being polished for production. Existing invoice line items remain available."
      />
    );
  }

  const [serviceItems, deletedServiceItems] = await Promise.all([
    listServiceItems(companyContext.company.id, { includeArchived: true }),
    listDeletedServiceItems(companyContext.company.id),
  ]);

  return (
    <ServiceItemsPageView
      initialServiceItems={[...serviceItems, ...deletedServiceItems]}
      canManagePriceBook={companyContext.permissions.manageBilling}
    />
  );
}
