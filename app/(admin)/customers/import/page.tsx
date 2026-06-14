import { redirect } from "next/navigation";
import Link from "next/link";
import { getCompanyAccessScope } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listCustomerImportContacts } from "@/lib/database/queries/customers";
import { CustomerImportPageView } from "@/shared/components/customers/CustomerImportPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";

export default async function CustomerImportPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!getCompanyAccessScope(companyContext).canManageCustomers) {
    return (
      <UnauthorizedAccessView description="Customer imports are limited to office and dispatch roles." />
    );
  }

  const { contacts: existingContacts, error: contactsError } =
    await listCustomerImportContacts(companyContext.company.id);

  if (contactsError) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <SettingsAlertBanner tone="error">
          We couldn&apos;t load existing customer contacts. Try again in a
          moment.
        </SettingsAlertBanner>
        <Link
          href="/customers"
          className="admin-btn-secondary inline-flex h-9 w-fit items-center px-4 text-sm"
        >
          Back to Customers
        </Link>
      </div>
    );
  }

  return <CustomerImportPageView existingContacts={existingContacts} />;
}
