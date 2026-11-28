import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getActiveCompanyBusinessNumbers } from "@/lib/database/queries/business-numbers";
import { getGuidedSetupAvailability } from "@/lib/database/queries/business-setup";
import { BusinessNumbersView } from "@/shared/components/settings/business-numbers/BusinessNumbersView";

/**
 * Settings > Business numbers: what the company charges, what an hour costs
 * it, and its monthly target (migration 218).
 *
 * The settings layout has already checked the caller is an owner or admin.
 * In a database that does not have migration 218 yet this page does not
 * exist (the menu does not list it either), so nobody meets a form that
 * cannot save.
 */
export const metadata: Metadata = {
  title: "Business numbers",
};

export default async function BusinessNumbersSettingsPage() {
  const [context, load, guidedSetup] = await Promise.all([getActiveCompanyContext(), getActiveCompanyBusinessNumbers(), getGuidedSetupAvailability()]);

  if (!context || !load) {
    return null;
  }

  if (!load.available) {
    notFound();
  }

  return <BusinessNumbersView companyId={context.company.id} initialNumbers={load.record.numbers} loadError={load.error} guidedSetup={guidedSetup} />;
}
