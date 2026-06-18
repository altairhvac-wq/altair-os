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
    <header className="invoice-company-hero border-b-2 border-slate-900 pb-3 sm:pb-5 md:pb-6 print:border-slate-800 print:pb-3">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between print:flex-row print:items-start print:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-5 md:gap-6">
          {trimmedLogoUrl ? (
            <div className="invoice-company-logo shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={trimmedLogoUrl}
                alt={`${company.name} logo`}
                className="h-12 w-auto max-w-[140px] object-contain object-left sm:h-16 sm:max-w-[180px] md:h-20 print:h-16 print:max-h-[72px]"
              />
            </div>
          ) : (
            <div
              aria-hidden="true"
              className="invoice-company-logo flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white sm:h-16 sm:w-16 md:h-20 md:w-20 print:h-14 print:w-14 print:rounded-lg print:border print:border-slate-300 print:border-solid print:bg-white"
            >
              <Building2 className="h-6 w-6 text-slate-300 sm:h-8 sm:w-8 md:h-9 md:w-9 print:h-6 print:w-6 print:text-slate-400" />
            </div>
          )}

          <div className="min-w-0 flex-1 border-l-2 border-slate-900 pl-3 sm:border-l-4 sm:pl-4 md:pl-5 print:border-slate-800">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[10px] sm:tracking-[0.16em] print:text-slate-600">
              Service provider
            </p>
            <h1 className="mt-1 break-words text-xl font-bold tracking-tight text-slate-900 sm:mt-1.5 sm:text-3xl md:text-4xl print:mt-1 print:text-2xl">
              {company.name}
            </h1>
            <div className="mt-2 sm:mt-3 md:mt-4">
              <BillingCompanyContactBlock
                company={company}
                showAddress
                className="space-y-1 text-xs leading-snug sm:space-y-1.5 sm:text-sm md:text-[15px]"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
