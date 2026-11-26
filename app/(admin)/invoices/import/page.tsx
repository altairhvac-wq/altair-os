import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listCustomersForImportMatching } from "@/lib/database/queries/customers";
import { listImportedPreviousInvoiceNumbers } from "@/lib/database/queries/invoices";
import { InvoiceImportPageView } from "@/shared/components/invoices/InvoiceImportPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { INVOICE_IMPORT_PRESET_OPTIONS } from "@/shared/lib/invoice-import";

export const metadata: Metadata = {
  title: "Import unpaid invoices",
};

type InvoiceImportPageProps = {
  searchParams: Promise<{ from?: string | string[] }>;
};

export default async function InvoiceImportPage({ searchParams }: InvoiceImportPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!companyContext.permissions.manageBilling) {
    return <UnauthorizedAccessView description="Invoice imports are limited to billing and admin roles." />;
  }

  const { from } = await searchParams;
  const initialPreset = INVOICE_IMPORT_PRESET_OPTIONS.find(
    (option) => option.value === (Array.isArray(from) ? from[0] : from),
  )?.value;

  const [customerList, imported] = await Promise.all([
    listCustomersForImportMatching(companyContext.company.id),
    listImportedPreviousInvoiceNumbers(companyContext.company.id),
  ]);

  if (customerList.error || imported.error) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <SettingsAlertBanner tone="error">
          We couldn&apos;t load your customers and invoices. Try again in a moment.
        </SettingsAlertBanner>
        <Link href="/invoices" className="admin-btn-secondary inline-flex h-9 w-fit items-center px-4 text-sm">
          Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <InvoiceImportPageView
      customers={customerList.customers}
      alreadyImported={imported.numbers}
      initialPreset={initialPreset}
    />
  );
}
