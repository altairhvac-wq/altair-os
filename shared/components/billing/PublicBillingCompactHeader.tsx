import { Building2 } from "lucide-react";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
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
  /** Short scope description shown under the document number. */
  scopeSummary?: string | null;
  /** Omit issue and validity dates from the header. */
  hideDates?: boolean;
  /** Tighter spacing for mobile approval pages. */
  density?: "default" | "compact";
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
  scopeSummary,
  hideDates = false,
  density = "default",
}: PublicBillingCompactHeaderProps) {
  const trimmedLogoUrl = logoUrl?.trim();
  const trimmedSecondaryDate = secondaryDate?.trim();
  const trimmedScopeSummary = scopeSummary?.trim();
  const documentLabel = documentKind === "estimate" ? "Estimate" : "Invoice";
  const isCompact = density === "compact";

  return (
    <header
      className={`min-w-0 ${isCompact ? "pb-2" : "border-b border-slate-200 pb-3"}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {trimmedLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trimmedLogoUrl}
            alt=""
            className={`w-auto shrink-0 object-contain object-left ${isCompact ? "h-7 max-w-[84px]" : "h-8 max-w-[96px]"}`}
          />
        ) : (
          <div
            aria-hidden
            className={`flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 ${isCompact ? "h-7 w-7" : "h-8 w-8"}`}
          >
            <Building2
              className={`text-slate-400 ${isCompact ? "h-3.5 w-3.5" : "h-4 w-4"}`}
            />
          </div>
        )}
        <p className="min-w-0 break-words text-sm font-semibold leading-snug text-slate-900">
          {company.name}
        </p>
      </div>

      <div className={`min-w-0 ${isCompact ? "mt-1.5" : "mt-2.5"}`}>
        {isCompact ? (
          <p className="text-xs leading-snug text-slate-600">
            {documentLabel}{" "}
            <span className="font-semibold tabular-nums text-slate-900">
              {documentNumber}
            </span>
          </p>
        ) : (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {documentLabel}
            </p>
            <p className="mt-0.5 break-words text-lg font-bold leading-tight text-slate-900">
              {documentNumber}
            </p>
          </>
        )}
      </div>

      {trimmedScopeSummary ? (
        <p
          className={`break-words font-medium leading-snug text-slate-800 ${isCompact ? "mt-1 text-sm" : "mt-2 text-base"}`}
        >
          {trimmedScopeSummary}
        </p>
      ) : null}

      <div className={`min-w-0 ${isCompact ? "mt-1.5" : "mt-2"}`}>
        {isCompact ? (
          <p className="break-words text-sm text-slate-700">
            <span className="text-slate-500">{customerLabel} </span>
            <span className="font-semibold text-slate-900">
              <DemoDisplayName>{customerName}</DemoDisplayName>
            </span>
          </p>
        ) : (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {customerLabel}
            </p>
            <p className="mt-0.5 break-words text-sm font-semibold text-slate-900">
              <DemoDisplayName>{customerName}</DemoDisplayName>
            </p>
          </>
        )}
      </div>

      {!hideDates ? (
        <p className={`text-xs leading-snug text-slate-600 ${isCompact ? "mt-1.5" : "mt-2"}`}>
          Issued {formatDate(issueDate, companyTimeZone)}
          {trimmedSecondaryDate && secondaryDateLabel ? (
            <>
              {" "}
              <span className="text-slate-400" aria-hidden>
                •
              </span>{" "}
              {secondaryDateLabel}{" "}
              {formatDate(trimmedSecondaryDate, companyTimeZone)}
            </>
          ) : null}
        </p>
      ) : null}
    </header>
  );
}
