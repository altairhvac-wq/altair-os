import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listServiceItemNamesForImport } from "@/lib/database/queries/service-items";
import { PriceBookImportPageView } from "@/shared/components/service-items/PriceBookImportPageView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import { PRICE_BOOK_IMPORT_PRESET_OPTIONS } from "@/shared/lib/price-book-import";

export const metadata: Metadata = {
  title: "Import price book",
};

type PriceBookImportPageProps = {
  searchParams: Promise<{ from?: string | string[] }>;
};

export default async function PriceBookImportPage({ searchParams }: PriceBookImportPageProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!companyContext.permissions.manageBilling) {
    return (
      <UnauthorizedAccessView description="Price book imports are limited to billing and admin roles." />
    );
  }

  const { from } = await searchParams;
  const initialPreset = PRICE_BOOK_IMPORT_PRESET_OPTIONS.find(
    (option) => option.value === (Array.isArray(from) ? from[0] : from),
  )?.value;

  const { names, error } = await listServiceItemNamesForImport(companyContext.company.id);

  if (error) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <SettingsAlertBanner tone="error">
          We couldn&apos;t load your current price book. Try again in a moment.
        </SettingsAlertBanner>
        <Link
          href="/price-book"
          className="admin-btn-secondary inline-flex h-9 w-fit items-center px-4 text-sm"
        >
          Back to Price Book
        </Link>
      </div>
    );
  }

  return <PriceBookImportPageView existingNames={names} initialPreset={initialPreset} />;
}
