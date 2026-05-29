import { Building2 } from "lucide-react";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";
import { BillingCompanyContactBlock } from "./BillingCompanyContactBlock";

type InvoiceCompanyHeroHeaderProps = {
  company: BillingCompanyContact;
  logoUrl?: string | null;
};

export function InvoiceCompanyHeroHeader({
  company,
  logoUrl,
}: InvoiceCompanyHeroHeaderProps) {
  const trimmedLogoUrl = logoUrl?.trim();

  return (
    <header className="border-b-2 border-slate-900 pb-6 print:border-slate-800 print:pb-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between print:flex-row print:items-start print:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {trimmedLogoUrl ? (
            <div className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={trimmedLogoUrl}
                alt={`${company.name} logo`}
                className="h-14 w-auto max-w-[140px] object-contain object-left sm:h-16 print:h-14 print:max-h-16"
              />
            </div>
          ) : (
            <div
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 print:h-12 print:w-12 print:border-slate-300 print:bg-white"
            >
              <Building2 className="h-7 w-7 text-slate-300 print:h-6 print:w-6 print:text-slate-400" />
            </div>
          )}

          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl print:text-2xl">
              {company.name}
            </h1>
            <div className="mt-2.5">
              <BillingCompanyContactBlock company={company} showAddress />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
