import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";

type InvoiceThankYouFooterProps = {
  company: BillingCompanyContact;
};

export function InvoiceThankYouFooter({ company }: InvoiceThankYouFooterProps) {
  const phone = company.phone?.trim();
  const email = company.email?.trim();
  const hasContact = Boolean(phone || email);

  return (
    <footer className="border-t border-slate-200 pt-6 text-center print:mt-8 print:border-slate-300 print:pt-8 print:break-inside-avoid">
      <p className="text-base font-semibold text-slate-800 print:text-slate-900">
        Thank you for your business
      </p>
      <p className="mt-1 text-sm text-slate-500 print:text-slate-600">
        {company.name}
      </p>
      {hasContact ? (
        <p className="mt-3 text-xs leading-relaxed text-slate-500 print:text-slate-600">
          Questions about this invoice?
          {phone ? (
            <>
              {" "}
              Call{" "}
              <span className="font-medium text-slate-700 print:text-slate-900">
                {phone}
              </span>
            </>
          ) : null}
          {phone && email ? " or " : null}
          {email ? (
            <>
              email{" "}
              <span className="font-medium text-slate-700 print:text-slate-900">
                {email}
              </span>
            </>
          ) : null}
          .
        </p>
      ) : null}
    </footer>
  );
}
