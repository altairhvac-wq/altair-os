import { Building2 } from "lucide-react";
import { formatDate } from "@/shared/types/customer";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";

type PublicBillingCompactHeaderProps = {
  company: BillingCompanyContact;
  logoUrl?: string | null;
  documentKind: "estimate" | "invoice";
  documentNumber: string;
  customerLabel: string;
  customerName: string;
  issueDate: string;
  secondaryDate?: string | null;
  secondaryDateLabel?: string;
  companyTimeZone?: string;
};

export function PublicBillingCompactHeader({
  company,
  logoUrl,
  documentKind,
  documentNumber,
  customerLabel,
  customerName,
  issueDate,
  secondaryDate,
  secondaryDateLabel,
  companyTimeZone,
}: PublicBillingCompactHeaderProps) {
  const trimmedLogoUrl = logoUrl?.trim();
  const trimmedSecondaryDate = secondaryDate?.trim();
  const documentLabel = documentKind === "estimate" ? "Estimate" : "Invoice";

  return (
    <header className="min-w-0 border-b border-slate-200 pb-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {trimmedLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trimmedLogoUrl}
            alt=""
            className="h-8 w-auto max-w-[96px] shrink-0 object-contain object-left"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50"
          >
            <Building2 className="h-4 w-4 text-slate-400" />
          </div>
        )}
        <p className="min-w-0 break-words text-sm font-semibold leading-snug text-slate-900">
          {company.name}
        </p>
      </div>

      <div className="mt-2.5 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {documentLabel}
        </p>
        <p className="mt-0.5 break-words text-lg font-bold leading-tight text-slate-900">
          {documentNumber}
        </p>
      </div>

      <div className="mt-2 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {customerLabel}
        </p>
        <p className="mt-0.5 break-words text-sm font-semibold text-slate-900">
          {customerName}
        </p>
      </div>

      <p className="mt-2 text-xs leading-snug text-slate-600">
        Issued {formatDate(issueDate, companyTimeZone)}
        {trimmedSecondaryDate && secondaryDateLabel ? (
          <>
            {" "}
            <span className="text-slate-400" aria-hidden>
              •
            </span>{" "}
            {secondaryDateLabel} {formatDate(trimmedSecondaryDate, companyTimeZone)}
          </>
        ) : null}
      </p>
    </header>
  );
}
