import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canManageBusinessNumbers } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyBusinessNumbers } from "@/lib/database/queries/business-numbers";
import { getGuidedSetupAvailability, listSetupPriceBookItems } from "@/lib/database/queries/business-setup";
import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
import { GuidedSetup, type SetupView } from "@/shared/components/business-setup/GuidedSetup";
import { numberToFieldText } from "@/shared/lib/business-numbers/format";
import { starterTasksForTrade } from "@/shared/lib/business-numbers/starter-price-list";
import { hasSavedCompanyBillingDefaults } from "@/shared/lib/company-billing-defaults";
import { getCompanyTimeZoneChoice } from "@/shared/lib/datetime";
import { BUSINESS_SETUP_STEPS, type BusinessSetupStepId } from "@/shared/types/business-numbers";

/**
 * /get-started: the guided setup. Five steps that put a new company's
 * prices into the product (shared/components/business-setup/GuidedSetup.tsx).
 *
 * Owner and admin only. Where the setup cannot run (someone without that
 * role, or a database that does not have migrations 218 and 219 yet) this
 * page sends the person to the dashboard instead of showing them something
 * that cannot save.
 */
export const metadata: Metadata = {
  title: "Set up your shop",
};

type PageProps = { searchParams: Promise<{ step?: string | string[] }> };

function isStep(value: string | undefined): value is BusinessSetupStepId {
  return BUSINESS_SETUP_STEPS.some((step) => step === value);
}

export default async function GetStartedPage({ searchParams }: PageProps) {
  const context = await getActiveCompanyContext();
  if (!context) {
    redirect("/setup");
  }

  if (!canManageBusinessNumbers(context) || !(await getGuidedSetupAvailability())) {
    redirect("/");
  }

  const [{ step: stepParam }, load, existingItems] = await Promise.all([searchParams, getCompanyBusinessNumbers(context), listSetupPriceBookItems(context)]);
  const requested = Array.isArray(stepParam) ? stepParam[0] : stepParam;

  // A link to a step opens that step. Otherwise: the first screen, which shows what is done and what is left.
  const initialView: SetupView = isStep(requested) ? requested : requested === "done" ? "done" : "welcome";

  const company = context.company;
  const defaults = getCompanyBillingDefaultsFromRow(company);
  const firstName = context.profile.full_name?.trim().split(/\s+/)[0] || null;

  return (
    <GuidedSetup
      companyId={company.id}
      firstName={firstName}
      initialRecord={load.record}
      initialView={initialView}
      shop={{
        phone: company.phone ?? "",
        addressLine1: company.address_line1 ?? "",
        city: company.city ?? "",
        state: company.state ?? "",
        postalCode: company.postal_code ?? "",
        // The zone the company runs on now, and whether anyone chose it. A
        // company that has not chosen is offered its browser's zone instead.
        // "unavailable" (migration 220 pending) hides the box.
        timeZone: company.timezone,
        timeZoneChoice: getCompanyTimeZoneChoice(company),
        // A company that has never set a tax rate sees an empty box, not "0".
        defaultTaxRate: hasSavedCompanyBillingDefaults(company.settings) ? numberToFieldText(defaults.defaultTaxRate) : "",
      }}
      starterTasks={starterTasksForTrade(company.trade)}
      existingItems={existingItems}
    />
  );
}
