import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";

type EstimateThankYouFooterProps = {
  company: BillingCompanyContact;
};

/** Print/PDF-only one-line footer. Parent must wrap with `estimatePrintOnlyBlockClass`. */
export function EstimateThankYouFooter({
  company,
}: EstimateThankYouFooterProps) {
  return (
    <footer className="estimate-thank-you-footer mt-1.5 border-t border-slate-200 pt-1.5 print:mt-1 print:border-slate-300 print:pt-1 print:break-inside-avoid">
      <p className="text-[10px] leading-snug text-slate-500 print:text-slate-600">
        Thank you for considering {company.name}.
      </p>
    </footer>
  );
}
