import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";

type InvoiceThankYouFooterProps = {
  company: BillingCompanyContact;
  /** Reserved for future tenant warranty text wiring. */
  warrantyText?: string | null;
  /** Reserved for future tenant license number wiring. */
  licenseNumber?: string | null;
};

export function InvoiceThankYouFooter({
  company,
  warrantyText,
  licenseNumber,
}: InvoiceThankYouFooterProps) {
  const phone = company.phone?.trim();
  const email = company.email?.trim();
  const hasContact = Boolean(phone || email);
  const trimmedWarranty = warrantyText?.trim();
  const trimmedLicense = licenseNumber?.trim();
  const hasTrustCredentials = Boolean(trimmedWarranty || trimmedLicense);

  return (
    <footer className="invoice-thank-you-footer mt-8 border-t-2 border-slate-900 pt-8 text-center print:mt-8 print:border-slate-800 print:pt-8 print:break-inside-avoid">
      <p className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
        Thank you for choosing {company.name}
      </p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600 print:text-slate-700">
        We appreciate your trust in our team. Please retain this invoice for your records.
      </p>

      {hasContact ? (
        <div className="mx-auto mt-6 max-w-md rounded-xl border border-slate-200 bg-white px-5 py-4 print:max-w-none print:rounded-none print:border-slate-300 print:bg-white print:px-0 print:py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 print:text-slate-600">
            Questions about this invoice
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 print:text-slate-800">
            {phone ? (
              <>
                Call{" "}
                <span className="font-semibold text-slate-900">{phone}</span>
              </>
            ) : null}
            {phone && email ? " or email " : email ? "Email " : null}
            {email ? (
              <span className="font-semibold text-slate-900">{email}</span>
            ) : null}
            .
          </p>
        </div>
      ) : null}

      {hasTrustCredentials ? (
        <div className="mx-auto mt-6 max-w-md space-y-1 text-xs text-slate-500 print:text-slate-600">
          {trimmedLicense ? (
            <p>
              License{" "}
              <span className="font-medium text-slate-700 print:text-slate-900">
                {trimmedLicense}
              </span>
            </p>
          ) : null}
          {trimmedWarranty ? (
            <p className="leading-relaxed">{trimmedWarranty}</p>
          ) : null}
        </div>
      ) : null}
    </footer>
  );
}
