import { formatDate } from "@/shared/types/customer";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";

type EstimateThankYouFooterProps = {
  company: BillingCompanyContact;
  validUntil?: string | null;
  /** When true, include guidance about online approval. */
  showApprovalGuidance?: boolean;
  /** Nested inside a collapsible section (no extra top rule/spacing). */
  embedded?: boolean;
};

export function EstimateThankYouFooter({
  company,
  validUntil,
  showApprovalGuidance = false,
  embedded = false,
}: EstimateThankYouFooterProps) {
  const phone = company.phone?.trim();
  const email = company.email?.trim();
  const hasContact = Boolean(phone || email);
  const trimmedValidUntil = validUntil?.trim();

  return (
    <footer
      className={
        embedded
          ? "estimate-thank-you-footer text-center"
          : "estimate-thank-you-footer mt-4 border-t-2 border-slate-900 pt-4 text-center sm:mt-8 sm:pt-8 print:mt-8 print:border-slate-800 print:pt-8 print:break-inside-avoid"
      }
    >
      <p className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg md:text-xl">
        Thank you for considering {company.name}
      </p>
      <p className="mx-auto mt-1.5 max-w-lg text-xs leading-relaxed text-slate-600 sm:mt-2 sm:text-sm print:text-slate-700">
        We appreciate the opportunity to serve you. Please retain this estimate
        for your records.
      </p>

      {trimmedValidUntil || showApprovalGuidance ? (
        <div className="mx-auto mt-3 max-w-md rounded-lg border border-slate-200 bg-white px-3 py-3 sm:mt-6 sm:rounded-xl sm:px-5 sm:py-4 print:max-w-none print:rounded-none print:border-slate-300 print:bg-white print:px-0 print:py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 print:text-slate-600">
            Estimate validity &amp; approval
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 print:text-slate-800">
            {trimmedValidUntil
              ? `This estimate is valid until ${formatDate(trimmedValidUntil)}. `
              : null}
            {showApprovalGuidance
              ? "Use the secure approval link in your email to review and sign online."
              : "Contact us to approve this estimate or request changes before the validity date."}
          </p>
        </div>
      ) : null}

      {hasContact ? (
        <div className="mx-auto mt-3 max-w-md rounded-lg border border-slate-200 bg-white px-3 py-3 sm:mt-6 sm:rounded-xl sm:px-5 sm:py-4 print:max-w-none print:rounded-none print:border-slate-300 print:bg-white print:px-0 print:py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 print:text-slate-600">
            Questions about this estimate
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
    </footer>
  );
}
